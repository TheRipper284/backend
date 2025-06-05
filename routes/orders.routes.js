const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/auth.middleware")
const ordersController = require("../controllers/orders.controller")

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get("/", protect, ordersController.getOrders)

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get("/:id", protect, ordersController.getOrder)

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (Buyers only)
router.post("/", protect, ordersController.createOrder)

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin or Seller)
router.put("/:id/status", protect, ordersController.updateOrderStatus)

module.exports = router