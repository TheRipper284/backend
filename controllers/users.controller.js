const { validationResult } = require("express-validator")
const bcrypt = require("bcrypt")
const db = require("../config/database")

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
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
    console.error("Error al obtener perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener perfil",
    })
  }
}

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { name, phone, address, city, country } = req.body

  try {
    // Update user profile
    await db.query(
      "UPDATE users SET name = ?, phone = ?, address = ?, city = ?, country = ? WHERE id = ?",
      [name, phone, address, city, country, req.user.id],
    )

    // Get updated user profile
    const [users] = await db.query(
      "SELECT id, name, email, role, phone, address, city, country, profile_image, created_at FROM users WHERE id = ?",
      [req.user.id],
    )

    res.status(200).json({
      success: true,
      data: users[0],
    })
  } catch (error) {
    console.error("Error al actualizar perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar perfil",
    })
  }
}

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
exports.updatePassword = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { currentPassword, newPassword } = req.body

  try {
    // Get user with password
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [req.user.id])

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const user = users[0]

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Contraseña actual incorrecta",
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.id])

    res.status(200).json({
      success: true,
      message: "Contraseña actualizada correctamente",
    })
  } catch (error) {
    console.error("Error al actualizar contraseña:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar contraseña",
    })
  }
}

// @desc    Upload profile image
// @route   PUT /api/users/profile-image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se ha subido ninguna imagen",
      })
    }

    const profileImage = `/uploads/${req.file.filename}`

    // Update profile image
    await db.query("UPDATE users SET profile_image = ? WHERE id = ?", [profileImage, req.user.id])

    res.status(200).json({
      success: true,
      data: {
        profile_image: profileImage,
      },
    })
  } catch (error) {
    console.error("Error al subir imagen de perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error al subir imagen de perfil",
    })
  }
}

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC",
    )

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    })
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
    })
  }
}

// @desc    Get user by ID (admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, phone, address, city, country, profile_image, created_at FROM users WHERE id = ?",
      [req.params.id],
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
      message: "Error al obtener usuario",
    })
  }
}

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  const { name, email, role } = req.body

  try {
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [req.params.id])

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Update user
    await db.query("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?", [
      name,
      email,
      role,
      req.params.id,
    ])

    // Get updated user
    const [updatedUsers] = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [req.params.id],
    )

    res.status(200).json({
      success: true,
      data: updatedUsers[0],
    })
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar usuario",
    })
  }
}

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [req.params.id])

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Delete user
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id])

    res.status(200).json({
      success: true,
      message: "Usuario eliminado correctamente",
    })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
    })
  }
}