const express = require("express")
const { check } = require("express-validator")
const router = express.Router()
const authController = require("../controllers/auth.controller")
const { protect } = require("../middleware/auth.middleware")

// Register user
router.post(
  "/register",
  [
    check("name", "El nombre es obligatorio").not().isEmpty(),
    check("email", "Incluye un email válido").isEmail(),
    check("password", "La contraseña debe tener al menos 6 caracteres").isLength({ min: 6 }),
    check("role", "El rol debe ser buyer o seller").isIn(["buyer", "seller"]),
  ],
  authController.register,
)

// Login user
router.post(
  "/login",
  [check("email", "Incluye un email válido").isEmail(), check("password", "La contraseña es obligatoria").exists()],
  authController.login,
)

// Get current user
router.get("/me", protect, authController.getMe)

// Forgot password
router.post("/forgot-password", [check("email", "Incluye un email válido").isEmail()], authController.forgotPassword)

module.exports = router
