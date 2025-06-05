const express = require("express")
const router = express.Router()
const { protect, authorize } = require("../middleware/auth.middleware")
const adminController = require("../controllers/admin.controller")

// Proteger todas las rutas de administrador
router.use(protect)
router.use(authorize("admin"))

// Rutas de usuarios
router.get("/users", adminController.getUsers)
router.get("/users/stats", adminController.getUsersStats)
router.get("/users/:id", adminController.getUserById)
router.put("/users/:id", adminController.updateUser)
router.delete("/users/:id", adminController.deleteUser)
router.patch("/users/:id/status", adminController.updateUserStatus)

// Rutas de productos
router.get("/products", adminController.getProducts)
router.get("/products/stats", adminController.getProductsStats)
router.get("/products/:id", adminController.getProductById)
router.put("/products/:id", adminController.updateProduct)
router.delete("/products/:id", adminController.deleteProduct)
router.patch("/products/:id/status", adminController.updateProductStatus)

// Rutas de categorías
router.get("/categories", adminController.getCategories)
router.post("/categories", adminController.createCategory)
router.put("/categories/:id", adminController.updateCategory)
router.delete("/categories/:id", adminController.deleteCategory)

// Rutas de órdenes
router.get("/orders", adminController.getOrders)
router.get("/orders/stats", adminController.getOrdersStats)
router.get("/orders/:id", adminController.getOrderById)
router.patch("/orders/:id/status", adminController.updateOrderStatus)

module.exports = router 