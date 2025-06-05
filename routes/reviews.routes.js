const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/auth.middleware")
const { getProductReviews, createReview } = require("../controllers/reviews.controller")
const db = require("../config/database")

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a product
// @access  Public
router.get("/product/:productId", getProductReviews)

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
router.post("/", protect, createReview)

// @route   GET /api/reviews/can-review/:productId
// @desc    Check if user can review a product
// @access  Private
router.get("/can-review/:productId", protect, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT COUNT(*) as count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'delivered'`,
      [req.user.id, req.params.productId]
    )

    // Check if user has already reviewed this product
    const [existingReviews] = await db.query(
      "SELECT id FROM reviews WHERE user_id = ? AND product_id = ?",
      [req.user.id, req.params.productId]
    )

    const canReview = orders[0].count > 0 && existingReviews.length === 0

    res.status(200).json({
      success: true,
      canReview
    })
  } catch (error) {
    console.error("Error checking review eligibility:", error)
    res.status(500).json({
      success: false,
      message: "Error al verificar elegibilidad de reseña"
    })
  }
})

module.exports = router