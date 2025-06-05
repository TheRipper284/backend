const db = require("../config/database")

// @desc    Get cart items
// @route   GET /api/carts/items
// @access  Private
exports.getCartItems = async (req, res) => {
  try {
    // Get user's cart
    const [carts] = await db.query("SELECT * FROM carts WHERE user_id = ?", [req.user.id])

    if (carts.length === 0) {
      // Create cart if it doesn't exist
      const [result] = await db.query("INSERT INTO carts (user_id) VALUES (?)", [req.user.id])
      const cartId = result.insertId

      return res.status(200).json({
        success: true,
        data: [],
      })
    }

    const cartId = carts[0].id

    // Get cart items with product details
    const [items] = await db.query(
      `SELECT ci.*, p.title as product_title, p.price as product_price, p.image_url as product_image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId],
    )

    res.status(200).json({
      success: true,
      data: items,
    })
  } catch (error) {
    console.error("Error al obtener carrito:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener carrito",
    })
  }
}

// @desc    Add item to cart
// @route   POST /api/carts/items
// @access  Private
exports.addCartItem = async (req, res) => {
  const { product_id, quantity } = req.body

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "ID de producto y cantidad válida son requeridos",
    })
  }

  try {
    // Check if product exists and is active
    const [products] = await db.query("SELECT * FROM products WHERE id = ? AND status = 'active'", [product_id])

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado o no disponible",
      })
    }

    // Check if product has enough stock
    if (products[0].stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "No hay suficiente stock disponible",
      })
    }

    // Get user's cart
    const [carts] = await db.query("SELECT * FROM carts WHERE user_id = ?", [req.user.id])

    let cartId
    if (carts.length === 0) {
      // Create cart if it doesn't exist
      const [result] = await db.query("INSERT INTO carts (user_id) VALUES (?)", [req.user.id])
      cartId = result.insertId
    } else {
      cartId = carts[0].id
    }

    // Check if item already exists in cart
    const [existingItems] = await db.query("SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?", [
      cartId,
      product_id,
    ])

    if (existingItems.length > 0) {
      // Update quantity if item exists
      await db.query("UPDATE cart_items SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?", [
        quantity,
        cartId,
        product_id,
      ])
    } else {
      // Add new item if it doesn't exist
      await db.query("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)", [
        cartId,
        product_id,
        quantity,
      ])
    }

    res.status(201).json({
      success: true,
      message: "Producto añadido al carrito",
    })
  } catch (error) {
    console.error("Error al añadir al carrito:", error)
    res.status(500).json({
      success: false,
      message: "Error al añadir al carrito",
    })
  }
}

// @desc    Update cart item quantity
// @route   PUT /api/carts/items/:id
// @access  Private
exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body
  const productId = req.params.id

  if (!quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Cantidad válida requerida",
    })
  }

  try {
    // Get user's cart
    const [carts] = await db.query("SELECT * FROM carts WHERE user_id = ?", [req.user.id])

    if (carts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Carrito no encontrado",
      })
    }

    const cartId = carts[0].id

    // Check if product has enough stock
    const [products] = await db.query("SELECT * FROM products WHERE id = ?", [productId])

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    if (products[0].stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "No hay suficiente stock disponible",
      })
    }

    // Update cart item quantity
    const [result] = await db.query("UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?", [
      quantity,
      cartId,
      productId,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado en el carrito",
      })
    }

    res.status(200).json({
      success: true,
      message: "Cantidad actualizada",
    })
  } catch (error) {
    console.error("Error al actualizar carrito:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar carrito",
    })
  }
}

// @desc    Remove item from cart
// @route   DELETE /api/carts/items/:id
// @access  Private
exports.removeCartItem = async (req, res) => {
  const productId = req.params.id

  try {
    // Get user's cart
    const [carts] = await db.query("SELECT * FROM carts WHERE user_id = ?", [req.user.id])

    if (carts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Carrito no encontrado",
      })
    }

    const cartId = carts[0].id

    // Remove item from cart
    const [result] = await db.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, productId])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado en el carrito",
      })
    }

    res.status(200).json({
      success: true,
      message: "Producto eliminado del carrito",
    })
  } catch (error) {
    console.error("Error al eliminar del carrito:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar del carrito",
    })
  }
}

// @desc    Clear cart
// @route   DELETE /api/carts/items
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    // Get user's cart
    const [carts] = await db.query("SELECT * FROM carts WHERE user_id = ?", [req.user.id])

    if (carts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Carrito no encontrado",
      })
    }

    const cartId = carts[0].id

    // Clear cart
    await db.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId])

    res.status(200).json({
      success: true,
      message: "Carrito vaciado",
    })
  } catch (error) {
    console.error("Error al vaciar carrito:", error)
    res.status(500).json({
      success: false,
      message: "Error al vaciar carrito",
    })
  }
}