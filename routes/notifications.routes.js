const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/auth.middleware")
const db = require("../config/database")

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const [notifications] = await db.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id],
    )

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    })
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener notificaciones",
    })
  }
})

// @route   PUT /api/notifications/read
// @desc    Mark notifications as read
// @access  Private
router.put("/read", protect, async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [req.user.id])

    res.status(200).json({
      success: true,
      message: "Notificaciones marcadas como leídas",
    })
  } catch (error) {
    console.error("Error al actualizar notificaciones:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar notificaciones",
    })
  }
})

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    await db.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [req.params.id, req.user.id])

    res.status(200).json({
      success: true,
      message: "Notificación eliminada",
    })
  } catch (error) {
    console.error("Error al eliminar notificación:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar notificación",
    })
  }
})

module.exports = router