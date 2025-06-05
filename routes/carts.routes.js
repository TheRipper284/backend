const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/auth.middleware")
const db = require("../config/database")

// @route   GET /api/carts/items
// @desc    Get cart items
// @access  Private
router.get("/items", protect, async (req, res) => {
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

    // Get cart items
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
})

// @route   POST /api/carts/items
// @desc    Add item to cart
// @access  Private
router.post("/items", protect, async (req, res) => {
  try {
    const { product_id, quantity } = req.body

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

    res.status(200).json({
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
})

// @route   DELETE /api/carts/items/:id
// @desc    Remove item from cart
// @access  Private
router.delete("/items/:id", protect, async (req, res) => {
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
    await db.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, req.params.id])

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
})

module.exports = router