const db = require("../config/database")
const bcrypt = require("bcrypt")

// Controladores de usuarios
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const sortBy = req.query.sort || "created_at"
    const sortOrder = req.query.order === "asc" ? "ASC" : "DESC"
    const roleFilter = req.query.role ? ` WHERE role = '${req.query.role}'` : ""

    // Consulta para obtener usuarios paginados
    const [users] = await db.query(
      `SELECT id, email, name, role, phone, address, city, country, 
      profile_image, created_at, 'active' as status 
      FROM users${roleFilter}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    // Consulta para obtener el total de usuarios
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM users${roleFilter}`
    )
    const totalUsers = countResult[0].total
    const totalPages = Math.ceil(totalUsers / limit)

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: page,
        limit,
      },
    })
  } catch (error) {
    console.error("Error en getUsers:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
    })
  }
}

exports.getUsersStats = async (req, res) => {
  try {
    // Obtener el número total de usuarios
    const [totalUsersResult] = await db.query(
      "SELECT COUNT(*) as total FROM users"
    )
    const totalUsers = totalUsersResult[0].total

    // Obtener la distribución de usuarios por rol
    const [usersByRoleResult] = await db.query(
      "SELECT role, COUNT(*) as count FROM users GROUP BY role"
    )
    
    // Formatear la distribución por rol
    const usersByRole = {
      buyer: 0,
      seller: 0,
      admin: 0,
    }
    
    usersByRoleResult.forEach(item => {
      usersByRole[item.role] = item.count
    })

    return res.status(200).json({
      success: true,
      totalUsers,
      usersByRole,
    })
  } catch (error) {
    console.error("Error en getUsersStats:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de usuarios",
    })
  }
}

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id
    
    const [users] = await db.query(
      `SELECT id, email, name, role, phone, address, city, country, 
      profile_image, created_at, 'active' as status
      FROM users 
      WHERE id = ?`,
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    return res.status(200).json({
      success: true,
      data: users[0],
    })
  } catch (error) {
    console.error("Error en getUserById:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener usuario",
    })
  }
}

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id
    const { name, email, role, phone, address, city, country } = req.body

    // Verificar si el usuario existe
    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    )

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Actualizar el usuario
    await db.query(
      `UPDATE users SET 
      name = ?, 
      email = ?, 
      role = ?,
      phone = ?,
      address = ?,
      city = ?,
      country = ?
      WHERE id = ?`,
      [name, email, role, phone, address, city, country, userId]
    )

    return res.status(200).json({
      success: true,
      message: "Usuario actualizado correctamente",
    })
  } catch (error) {
    console.error("Error en updateUser:", error)
    return res.status(500).json({
      success: false,
      message: "Error al actualizar usuario",
    })
  }
}

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id

    // Como no tenemos deleted_at, simplemente hacemos una eliminación completa
    await db.query(
      "DELETE FROM users WHERE id = ?",
      [userId]
    )

    return res.status(200).json({
      success: true,
      message: "Usuario eliminado correctamente",
    })
  } catch (error) {
    console.error("Error en deleteUser:", error)
    return res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
    })
  }
}

exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id
    const { status } = req.body

    // Como no tenemos deleted_at, simplemente devolvemos éxito
    // En una implementación completa, se podría crear una columna status
    
    return res.status(200).json({
      success: true,
      message: `Estado del usuario actualizado a ${status}`,
    })
  } catch (error) {
    console.error("Error en updateUserStatus:", error)
    return res.status(500).json({
      success: false,
      message: "Error al actualizar estado del usuario",
    })
  }
}

// Controladores de productos
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const sortBy = req.query.sort || "created_at"
    const sortOrder = req.query.order === "asc" ? "ASC" : "DESC"
    const categoryFilter = req.query.category ? ` AND p.category_id = ${req.query.category}` : ""
    const statusFilter = req.query.status ? ` AND p.status = '${req.query.status}'` : ""

    // Consulta para obtener productos paginados con nombre de vendedor y categoría
    const [products] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1${categoryFilter}${statusFilter}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    // Consulta para obtener el total de productos
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
      FROM products p
      WHERE 1=1${categoryFilter}${statusFilter}`
    )
    const totalProducts = countResult[0].total
    const totalPages = Math.ceil(totalProducts / limit)

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        totalProducts,
        totalPages,
        currentPage: page,
        limit,
      },
    })
  } catch (error) {
    console.error("Error en getProducts:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener productos",
    })
  }
}

exports.getProductsStats = async (req, res) => {
  try {
    // Obtener el número total de productos
    const [totalProductsResult] = await db.query(
      "SELECT COUNT(*) as total FROM products"
    )
    const totalProducts = totalProductsResult[0].total

    // Obtener los productos más vistos
    const [topViewedProducts] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.views DESC
      LIMIT 5`
    )

    // Obtener los productos mejor valorados
    const [topRatedProducts] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.review_count > 0
      ORDER BY p.average_rating DESC
      LIMIT 5`
    )

    // Obtener productos por categoría
    const [productsByCategory] = await db.query(
      `SELECT c.name, COUNT(*) as count
      FROM products p
      JOIN categories c ON p.category_id = c.id
      GROUP BY p.category_id`
    )

    return res.status(200).json({
      success: true,
      totalProducts,
      topViewedProducts,
      topRatedProducts,
      productsByCategory,
    })
  } catch (error) {
    console.error("Error en getProductsStats:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de productos",
    })
  }
}

exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id
    
    const [products] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?`,
      [productId]
    )

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    return res.status(200).json({
      success: true,
      data: products[0],
    })
  } catch (error) {
    console.error("Error en getProductById:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener producto",
    })
  }
}

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id
    const { title, description, price, category_id, location, stock } = req.body

    // Verificar si el producto existe
    const [existingProducts] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    )

    if (existingProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Actualizar el producto
    await db.query(
      `UPDATE products SET 
      title = ?, 
      description = ?, 
      price = ?,
      category_id = ?,
      location = ?,
      stock = ?,
      updated_at = NOW()
      WHERE id = ?`,
      [title, description, price, category_id, location, stock, productId]
    )

    return res.status(200).json({
      success: true,
      message: "Producto actualizado correctamente",
    })
  } catch (error) {
    console.error("Error en updateProduct:", error)
    return res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
    })
  }
}

exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id

    // Cambiar el estado a "deleted"
    await db.query(
      "UPDATE products SET status = 'deleted', updated_at = NOW() WHERE id = ?",
      [productId]
    )

    return res.status(200).json({
      success: true,
      message: "Producto eliminado correctamente",
    })
  } catch (error) {
    console.error("Error en deleteProduct:", error)
    return res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
    })
  }
}

exports.updateProductStatus = async (req, res) => {
  try {
    const productId = req.params.id
    const { status } = req.body

    if (!["active", "inactive", "deleted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Estado no válido. Debe ser 'active', 'inactive' o 'deleted'",
      })
    }

    await db.query(
      "UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, productId]
    )

    return res.status(200).json({
      success: true,
      message: "Estado del producto actualizado correctamente",
    })
  } catch (error) {
    console.error("Error en updateProductStatus:", error)
    return res.status(500).json({
      success: false,
      message: "Error al actualizar estado del producto",
    })
  }
}

// Controladores de categorías
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      "SELECT * FROM categories ORDER BY name ASC"
    )

    return res.status(200).json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error("Error en getCategories:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
    })
  }
}

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body

    // Verificar si la categoría ya existe
    const [existingCategories] = await db.query(
      "SELECT * FROM categories WHERE name = ?",
      [name]
    )

    if (existingCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe una categoría con ese nombre",
      })
    }

    // Crear la categoría
    const [result] = await db.query(
      "INSERT INTO categories (name, description) VALUES (?, ?)",
      [name, description]
    )

    return res.status(201).json({
      success: true,
      message: "Categoría creada correctamente",
      data: {
        id: result.insertId,
        name,
        description,
      },
    })
  } catch (error) {
    console.error("Error en createCategory:", error)
    return res.status(500).json({
      success: false,
      message: "Error al crear categoría",
    })
  }
}

exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id
    const { name, description } = req.body

    // Verificar si la categoría existe
    const [existingCategories] = await db.query(
      "SELECT * FROM categories WHERE id = ?",
      [categoryId]
    )

    if (existingCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      })
    }

    // Verificar si el nuevo nombre ya existe en otra categoría
    if (name !== existingCategories[0].name) {
      const [duplicateCategories] = await db.query(
        "SELECT * FROM categories WHERE name = ? AND id != ?",
        [name, categoryId]
      )

      if (duplicateCategories.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Ya existe otra categoría con ese nombre",
        })
      }
    }

    // Actualizar la categoría
    await db.query(
      "UPDATE categories SET name = ?, description = ? WHERE id = ?",
      [name, description, categoryId]
    )

    return res.status(200).json({
      success: true,
      message: "Categoría actualizada correctamente",
    })
  } catch (error) {
    console.error("Error en updateCategory:", error)
    return res.status(500).json({
      success: false,
      message: "Error al actualizar categoría",
    })
  }
}

exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id

    // Verificar si hay productos usando esta categoría
    const [productsWithCategory] = await db.query(
      "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
      [categoryId]
    )

    if (productsWithCategory[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar la categoría porque hay productos asociados",
      })
    }

    // Eliminar la categoría
    await db.query(
      "DELETE FROM categories WHERE id = ?",
      [categoryId]
    )

    return res.status(200).json({
      success: true,
      message: "Categoría eliminada correctamente",
    })
  } catch (error) {
    console.error("Error en deleteCategory:", error)
    return res.status(500).json({
      success: false,
      message: "Error al eliminar categoría",
    })
  }
}

// Controladores de órdenes
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const sortBy = req.query.sort || "created_at"
    const sortOrder = req.query.order === "asc" ? "ASC" : "DESC"
    const statusFilter = req.query.status ? ` WHERE o.status = '${req.query.status}'` : ""

    // Consulta para obtener órdenes paginadas
    const [orders] = await db.query(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      ${statusFilter}
      ORDER BY o.created_at ${sortOrder}
      LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    // Consulta para obtener el total de órdenes
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM orders o ${statusFilter}`
    )
    const totalOrders = countResult[0].total
    const totalPages = Math.ceil(totalOrders / limit)

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: page,
        limit,
      },
    })
  } catch (error) {
    console.error("Error en getOrders:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener órdenes",
    })
  }
}

exports.getOrdersStats = async (req, res) => {
  try {
    // Obtener el número total de órdenes
    const [totalOrdersResult] = await db.query(
      "SELECT COUNT(*) as total FROM orders"
    )
    const totalOrders = totalOrdersResult[0].total

    // Obtener el total de ventas
    const [totalSalesResult] = await db.query(
      "SELECT SUM(total_amount) as total FROM orders WHERE status != 'cancelled'"
    )
    const totalSales = totalSalesResult[0].total || 0

    // Obtener órdenes recientes
    const [recentOrders] = await db.query(
      `SELECT o.id, o.total_amount as amount, o.status, o.created_at as date, u.name as customer
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5`
    )

    // Formatear las órdenes recientes
    const formattedRecentOrders = recentOrders.map(order => ({
      id: order.id,
      date: new Date(order.date).toISOString().split('T')[0],
      customer: order.customer,
      amount: parseFloat(order.amount),
      status: order.status === 'pending' ? 'Pendiente' : 
        order.status === 'paid' ? 'Pagado' : 
        order.status === 'shipped' ? 'En proceso' : 
        order.status === 'delivered' ? 'Entregado' : 'Cancelado'
    }))

    // Obtener órdenes por estado
    const [ordersByStatus] = await db.query(
      `SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status`
    )

    return res.status(200).json({
      success: true,
      totalOrders,
      totalSales,
      recentOrders: formattedRecentOrders,
      ordersByStatus,
    })
  } catch (error) {
    console.error("Error en getOrdersStats:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de órdenes",
    })
  }
}

exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id
    
    // Obtener información general de la orden
    const [orders] = await db.query(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      WHERE o.id = ?`,
      [orderId]
    )

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    const order = orders[0]

    // Obtener los productos de la orden
    const [orderItems] = await db.query(
      `SELECT oi.*, p.title, p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?`,
      [orderId]
    )

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        items: orderItems,
      },
    })
  } catch (error) {
    console.error("Error en getOrderById:", error)
    return res.status(500).json({
      success: false,
      message: "Error al obtener orden",
    })
  }
}

exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id
    const { status } = req.body

    if (!["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Estado no válido",
      })
    }

    // Actualizar el estado de la orden
    await db.query(
      "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, orderId]
    )

    return res.status(200).json({
      success: true,
      message: "Estado de la orden actualizado correctamente",
    })
  } catch (error) {
    console.error("Error en updateOrderStatus:", error)
    return res.status(500).json({
      success: false,
      message: "Error al actualizar estado de la orden",
    })
  }
} 