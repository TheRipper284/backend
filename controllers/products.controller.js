const { validationResult } = require("express-validator")
const db = require("../config/database")
const fs = require("fs")
const path = require("path")

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { search, category, location, min_price, max_price, sort } = req.query

    let query = `
      SELECT p.*, u.name as seller_name, c.name as category_name,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as average_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `

    const queryParams = []

    // Search filter
    if (search) {
      query += ` AND (p.title LIKE ? OR p.description LIKE ?)`
      queryParams.push(`%${search}%`, `%${search}%`)
    }

    // Category filter
    if (category) {
      query += ` AND p.category_id = ?`
      queryParams.push(category)
    }

    // Location filter
    if (location) {
      query += ` AND p.location LIKE ?`
      queryParams.push(`%${location}%`)
    }

    // Price range filter
    if (min_price) {
      query += ` AND p.price >= ?`
      queryParams.push(min_price)
    }

    if (max_price) {
      query += ` AND p.price <= ?`
      queryParams.push(max_price)
    }

    // Sorting
    if (sort) {
      switch (sort) {
        case "price_asc":
          query += ` ORDER BY p.price ASC`
          break
        case "price_desc":
          query += ` ORDER BY p.price DESC`
          break
        case "newest":
          query += ` ORDER BY p.created_at DESC`
          break
        case "rating":
          query += ` ORDER BY average_rating DESC`
          break
        default:
          query += ` ORDER BY p.created_at DESC`
      }
    } else {
      query += ` ORDER BY p.created_at DESC`
    }

    const [products] = await db.query(query, queryParams)

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    })
  } catch (error) {
    console.error("Error al obtener productos:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener productos",
    })
  }
}

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as average_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.status = 'active'`,
      [req.params.id],
    )

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Get reviews for the product
    const [reviews] = await db.query(
      `SELECT r.*, u.name as reviewer_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC`,
      [req.params.id],
    )

    const product = products[0]
    product.reviews = reviews

    res.status(200).json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error("Error al obtener producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener producto",
    })
  }
}

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Sellers only)
exports.createProduct = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { title, description, price, category_id, location, stock } = req.body

  try {
    let image_url = null

    // Handle file upload if exists
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`
    }

    const [result] = await db.query(
      `INSERT INTO products (seller_id, title, description, price, category_id, location, image_url, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, price, category_id, location, image_url, stock || 1],
    )

    const [product] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?`,
      [result.insertId],
    )

    res.status(201).json({
      success: true,
      data: product[0],
    })
  } catch (error) {
    console.error("Error al crear producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
    })
  }
}

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Product owner only)
exports.updateProduct = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  try {
    // Check if product exists and belongs to user
    const [products] = await db.query("SELECT * FROM products WHERE id = ?", [req.params.id])

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    const product = products[0]

    // Check ownership
    if (product.seller_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No autorizado para actualizar este producto",
      })
    }

    const { title, description, price, category_id, location, stock, status } = req.body

    let image_url = product.image_url

    // Handle file upload if exists
    if (req.file) {
      // Delete old image if exists
      if (product.image_url) {
        const oldImagePath = path.join(__dirname, "..", product.image_url)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }

      image_url = `/uploads/${req.file.filename}`
    }

    await db.query(
      `UPDATE products
      SET title = ?, description = ?, price = ?, category_id = ?, location = ?, image_url = ?, stock = ?, status = ?
      WHERE id = ?`,
      [
        title || product.title,
        description || product.description,
        price || product.price,
        category_id || product.category_id,
        location || product.location,
        image_url,
        stock || product.stock,
        status || product.status,
        req.params.id,
      ],
    )

    const [updatedProduct] = await db.query(
      `SELECT p.*, u.name as seller_name, c.name as category_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?`,
      [req.params.id],
    )

    res.status(200).json({
      success: true,
      data: updatedProduct[0],
    })
  } catch (error) {
    console.error("Error al actualizar producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
    })
  }
}

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Product owner only)
exports.deleteProduct = async (req, res) => {
  try {
    // Check if product exists and belongs to user
    const [products] = await db.query("SELECT * FROM products WHERE id = ?", [req.params.id])

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    const product = products[0]

    // Check ownership
    if (product.seller_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No autorizado para eliminar este producto",
      })
    }

    // Soft delete by updating status
    await db.query("UPDATE products SET status = ? WHERE id = ?", ["deleted", req.params.id])

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    console.error("Error al eliminar producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
    })
  }
}
