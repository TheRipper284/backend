const express = require("express")
const router = express.Router()
const { getMessages, getConversation, sendMessage } = require("../controllers/messages.controller")
const { protect } = require("../middleware/auth.middleware")

// @route   GET /api/messages
// @desc    Get user conversations
// @access  Private
router.get("/", protect, getMessages)

// @route   GET /api/messages/:userId
// @desc    Get messages with specific user
// @access  Private
router.get("/:userId", protect, getConversation)

// @route   POST /api/messages
// @desc    Send message
// @access  Private
router.post("/", protect, sendMessage)

module.exports = router