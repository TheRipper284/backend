const { validationResult } = require("express-validator")
const db = require("../config/database")

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query("SELECT * FROM categories ORDER BY name ASC")

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
}

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
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
}

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { name, description } = req.body

  try {
    // Check if category already exists
    const [existingCategories] = await db.query("SELECT * FROM categories WHERE name = ?", [name])

    if (existingCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La categoría ya existe",
      })
    }

    // Create category
    const [result] = await db.query("INSERT INTO categories (name, description) VALUES (?, ?)", [name, description])

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        description,
      },
    })
  } catch (error) {
    console.error("Error al crear categoría:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear categoría",
    })
  }
}

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { name, description } = req.body

  try {
    // Check if category exists
    const [categories] = await db.query("SELECT * FROM categories WHERE id = ?", [req.params.id])

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      })
    }

    // Update category
    await db.query("UPDATE categories SET name = ?, description = ? WHERE id = ?", [
      name,
      description,
      req.params.id,
    ])

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(req.params.id),
        name,
        description,
      },
    })
  } catch (error) {
    console.error("Error al actualizar categoría:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar categoría",
    })
  }
}

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    // Check if category exists
    const [categories] = await db.query("SELECT * FROM categories WHERE id = ?", [req.params.id])

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      })
    }

    // Check if category is being used by products
    const [products] = await db.query("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [req.params.id])

    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar la categoría porque está siendo utilizada por productos",
      })
    }

    // Delete category
    await db.query("DELETE FROM categories WHERE id = ?", [req.params.id])

    res.status(200).json({
      success: true,
      message: "Categoría eliminada correctamente",
    })
  } catch (error) {
    console.error("Error al eliminar categoría:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar categoría",
    })
  }
}