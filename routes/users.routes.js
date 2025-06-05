const express = require("express")
const router = express.Router()
const { protect, authorize } = require("../middleware/auth.middleware")
const {
  getProfile,
  updateProfile,
  updatePassword,
  uploadProfileImage,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/users.controller")

// Placeholder para controladores de usuarios
// En un proyecto completo, crearías un archivo users.controller.js

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, getProfile)

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", protect, updateProfile)

// @route   PUT /api/users/password
// @desc    Update user password
// @access  Private
router.put("/password", protect, updatePassword)

// @route   PUT /api/users/profile-image
// @desc    Upload profile image
// @access  Private
router.put("/profile-image", protect, uploadProfileImage)

// Admin routes
// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get("/", protect, authorize("admin"), getUsers)

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get("/:id", protect, authorize("admin"), getUserById)

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put("/:id", protect, authorize("admin"), updateUser)

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete("/:id", protect, authorize("admin"), deleteUser)

module.exports = router