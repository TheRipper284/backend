const jwt = require("jsonwebtoken")
const db = require("../config/database")

exports.protect = async (req, res, next) => {
  try {
    let token

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No autorizado, token no proporcionado",
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check if user exists
    const [user] = await db.query("SELECT id, email, name, role FROM users WHERE id = ?", [decoded.id])

    if (!user.length) {
      return res.status(401).json({
        success: false,
        message: "El usuario no existe",
      })
    }

    // Set user in request
    req.user = user[0]
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "No autorizado, token inválido",
    })
  }
}

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.role} no está autorizado para acceder a este recurso`,
      })
    }
    next()
  }
}
