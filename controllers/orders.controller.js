const { validationResult } = require("express-validator")
const db = require("../config/database")

// @desc    Get all orders for user
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    let query
    let queryParams = []

    if (req.user.role === "buyer" || req.user.role === "user") {
      // Buyers can only see their own orders
      query = `
        SELECT o.*, COUNT(oi.id) as item_count, SUM(oi.quantity) as total_items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.buyer_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
      queryParams = [req.user.id]
    } else if (req.user.role === "seller") {
      // Sellers can see orders that contain their products
      query = `
        SELECT DISTINCT o.*, COUNT(oi.id) as item_count, SUM(oi.quantity) as total_items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
      queryParams = [req.user.id]
    } else if (req.user.role === "admin") {
      // Admins can see all orders
      query = `
        SELECT o.*, COUNT(oi.id) as item_count, SUM(oi.quantity) as total_items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
    }

    const [orders] = await db.query(query, queryParams)

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    console.error("Error al obtener órdenes:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener órdenes",
    })
  }
}

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    let query
    let queryParams = []

    if (req.user.role === "buyer" || req.user.role === "user") {
      // Buyers can see all items in their order
      query = `SELECT o.* FROM orders o WHERE o.id = ? AND o.buyer_id = ?`
      queryParams = [req.params.id, req.user.id]
    } else if (req.user.role === "seller") {
      // Sellers can see orders that contain their products
      query = `
        SELECT DISTINCT o.*
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.id = ? AND p.seller_id = ?
      `
      queryParams = [req.params.id, req.user.id]
    } else if (req.user.role === "admin") {
      query = `SELECT o.* FROM orders o WHERE o.id = ?`
      queryParams = [req.params.id]
    }

    const [orders] = await db.query(query, queryParams)

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    // Get order items - AQUÍ está el cambio importante
    let itemsQuery
    let itemsParams

    if (req.user.role === "seller") {
      // Sellers only see their own products in the order
      itemsQuery = `
        SELECT oi.*, p.title, p.image_url, u.name as seller_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN users u ON p.seller_id = u.id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `
      itemsParams = [req.params.id, req.user.id]
    } else {
      // Buyers and admins see all items
      itemsQuery = `
        SELECT oi.*, p.title, p.image_url, u.name as seller_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN users u ON p.seller_id = u.id
        WHERE oi.order_id = ?
      `
      itemsParams = [req.params.id]
    }

    const [orderItems] = await db.query(itemsQuery, itemsParams)

    // Get buyer info
    const [buyers] = await db.query(
      `SELECT id, name, email, phone, address
       FROM users
       WHERE id = ?`,
      [orders[0].buyer_id],
    )

    const order = orders[0]
    order.items = orderItems
    order.buyer = buyers.length > 0 ? buyers[0] : null

    // Calculate seller-specific total for sellers
    if (req.user.role === "seller") {
      order.seller_total = orderItems.reduce((total, item) => 
        total + (Number.parseFloat(item.price) * item.quantity), 0
      )
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error("Error al obtener orden:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener orden",
    })
  }
}

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Buyers only)
exports.createOrder = async (req, res) => {
  const { shipping_address, payment_method = 'cash', payment_id = null } = req.body

  try {
    // Get user's cart
    const [carts] = await db.query("SELECT * FROM carts WHERE user_id = ?", [req.user.id])

    if (carts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El carrito está vacío",
      })
    }

    const cartId = carts[0].id

    // Get cart items
    const [cartItems] = await db.query(
      `SELECT ci.*, p.price, p.seller_id, p.title, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId],
    )

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El carrito está vacío",
      })
    }

    // Check if all products have enough stock
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `No hay suficiente stock para "${item.title}". Stock disponible: ${item.stock}`,
        })
      }
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)

    // Start transaction
    const connection = await db.getConnection()
    await connection.beginTransaction()

    try {
      // Create order
      const [orderResult] = await connection.query(
        `INSERT INTO orders (buyer_id, total_amount, shipping_address, status, payment_method, payment_id)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [req.user.id, totalAmount, shipping_address, payment_method, payment_id],
      )

      const orderId = orderResult.insertId

      // Create order items and update product stock
      for (const item of cartItems) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price],
        )

        // Update product stock
        await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id])

        // Create notification for seller
        await connection.query(
          `INSERT INTO notifications (user_id, type, content, reference_id)
           VALUES (?, 'order', ?, ?)`,
          [item.seller_id, `Nuevo pedido recibido para tu producto "${item.title}"`, orderId],
        )
      }

      // Clear cart
      await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId])

      // Commit transaction
      await connection.commit()

      res.status(201).json({
        success: true,
        data: {
          id: orderId,
          total_amount: totalAmount,
        },
      })
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error al crear orden:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear orden",
    })
  }
}

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin or Seller)
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body

  if (!["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Estado no válido",
    })
  }

  try {
    // Check if order exists
    const [orders] = await db.query("SELECT * FROM orders WHERE id = ?", [req.params.id])

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    const order = orders[0]

    // If user is seller, check if they have products in this order
    if (req.user.role === "seller") {
      const [sellerItems] = await db.query(
        `SELECT COUNT(*) as count
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ? AND p.seller_id = ?`,
        [req.params.id, req.user.id],
      )

      if (sellerItems[0].count === 0) {
        return res.status(403).json({
          success: false,
          message: "No autorizado para actualizar esta orden",
        })
      }
    }

    // Update order status
    await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id])

    // Create notification for buyer
    await db.query(
      `INSERT INTO notifications (user_id, type, content, reference_id)
       VALUES (?, 'order', ?, ?)`,
      [order.buyer_id, `Tu orden #${req.params.id} ha sido actualizada a: ${status}`, req.params.id],
    )

    // Respuesta exitosa explícita
    res.status(200).json({
      success: true,
      message: "Estado de la orden actualizado correctamente",
      data: {
        orderId: req.params.id,
        newStatus: status
      }
    })
  } catch (error) {
    console.error("Error al actualizar estado de orden:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al actualizar estado de orden",
    })
  }
}