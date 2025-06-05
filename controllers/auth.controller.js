const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")
const db = require("../config/database")

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { name, email, password, role } = req.body

  try {
    // Check if user already exists
    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email])

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya existe",
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const [result] = await db.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
      name,
      email,
      hashedPassword,
      role || "buyer",
    ])

    // Create cart for user
    await db.query("INSERT INTO carts (user_id) VALUES (?)", [result.insertId])

    // Generate token
    const token = generateToken(result.insertId)

    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role: role || "buyer",
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({
      success: false,
      message: "Error al registrar usuario",
    })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { email, password } = req.body

  try {
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email])

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const user = users[0]

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Generate token
    const token = generateToken(user.id)

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión",
    })
  }
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, phone, address, city, country, profile_image, created_at FROM users WHERE id = ?",
      [req.user.id],
    )

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    res.status(200).json({
      success: true,
      data: users[0],
    })
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener información del usuario",
    })
  }
}

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body

  try {
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email])

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No hay usuario con ese email",
      })
    }

    // In a real application, you would send an email with a reset token
    // For this example, we'll just return a success message
    res.status(200).json({
      success: true,
      message: "Se ha enviado un correo con instrucciones para restablecer la contraseña",
    })
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error)
    res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud",
    })
  }
}
