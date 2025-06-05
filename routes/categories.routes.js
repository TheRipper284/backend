const express = require("express")
const router = express.Router()
const { protect, authorize } = require("../middleware/auth.middleware")
const db = require("../config/database")

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", async (req, res) => {
  try {
    const [categories] = await db.query("SELECT * FROM categories")
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    })
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
    })
  }
})

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const [categories] = await db.query("SELECT * FROM categories WHERE id = ?", [req.params.id])

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      })
    }

    res.status(200).json({
      success: true,
      data: categories[0],
    })
  } catch (error) {
    console.error("Error al obtener categoría:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener categoría",
    })
  }
})

module.exports = router