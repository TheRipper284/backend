const { validationResult } = require("express-validator")
const db = require("../config/database")

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.name as reviewer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    )

    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      data: reviews
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener reseñas"
    })
  }
}

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  const { product_id, rating, comment } = req.body

  try {
    // Check if user has purchased this product
    const [orders] = await db.query(
      `SELECT COUNT(*) as count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'delivered'`,
      [req.user.id, product_id]
    )

    if (orders[0].count === 0) {
      return res.status(400).json({
        success: false,
        message: "Solo puedes reseñar productos que hayas comprado y recibido"
      })
    }

    // Check if user has already reviewed this product
    const [existingReviews] = await db.query(
      "SELECT id FROM reviews WHERE user_id = ? AND product_id = ?",
      [req.user.id, product_id]
    )

    if (existingReviews.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya has reseñado este producto"
      })
    }

    // Create review
    const [result] = await db.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, product_id, rating, comment]
    )

    // Update product average rating
    const [avgResult] = await db.query(
      `SELECT AVG(rating) as average_rating, COUNT(*) as review_count
       FROM reviews WHERE product_id = ?`,
      [product_id]
    )

    await db.query(
      `UPDATE products 
       SET average_rating = ?, review_count = ?
       WHERE id = ?`,
      [avgResult[0].average_rating, avgResult[0].review_count, product_id]
    )

    res.status(201).json({
      success: true,
      message: "Reseña creada exitosamente",
      data: { id: result.insertId }
    })
  } catch (error) {
    console.error("Error creating review:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear reseña"
    })
  }
}

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { rating, comment } = req.body

  try {
    // Check if review exists and belongs to user
    const [reviews] = await db.query("SELECT * FROM reviews WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ])

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      })
    }

    // Update review
    await db.query("UPDATE reviews SET rating = ?, comment = ? WHERE id = ?", [rating, comment, req.params.id])

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(req.params.id),
        product_id: reviews[0].product_id,
        user_id: req.user.id,
        rating,
        comment,
        created_at: reviews[0].created_at,
      },
    })
  } catch (error) {
    console.error("Error al actualizar reseña:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar reseña",
    })
  }
}

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    // Check if review exists and belongs to user
    const [reviews] = await db.query("SELECT * FROM reviews WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ])

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      })
    }

    // Delete review
    await db.query("DELETE FROM reviews WHERE id = ?", [req.params.id])

    res.status(200).json({
      success: true,
      message: "Reseña eliminada correctamente",
    })
  } catch (error) {
    console.error("Error al eliminar reseña:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar reseña",
    })
  }
}