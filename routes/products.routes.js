const express = require("express")
const { check } = require("express-validator")
const router = express.Router()
const productsController = require("../controllers/products.controller")
const { protect, authorize } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")
const db = require("../config/database")

// Get all products
router.get("/", productsController.getProducts)

// Get single product
router.get("/:id", productsController.getProduct)

// Create new product
router.post(
  "/",
  protect,
  authorize("seller", "admin"),
  upload.single("image"),
  [
    check("title", "El título es obligatorio").not().isEmpty(),
    check("description", "La descripción es obligatoria").not().isEmpty(),
    check("price", "El precio debe ser un número positivo").isFloat({ min: 0 }),
    check("category_id", "La categoría es obligatoria").isInt(),
  ],
  productsController.createProduct,
)

// Update product
router.put("/:id", protect, authorize("seller", "admin"), upload.single("image"), productsController.updateProduct)

// Delete product
router.delete("/:id", protect, authorize("seller", "admin"), productsController.deleteProduct)

// @route   POST /api/products/:id/view
// @desc    Increment product views
// @access  Public (no auth required)
router.post("/:id/view", async (req, res) => {
  try {
    await db.query("UPDATE products SET views = COALESCE(views, 0) + 1 WHERE id = ?", [req.params.id])
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("Error updating views:", error)
    res.status(500).json({ success: false })
  }
})

module.exports = router
