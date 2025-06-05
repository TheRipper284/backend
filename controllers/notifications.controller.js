const db = require("../config/database")

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
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
}

// @desc    Mark notifications as read
// @route   PUT /api/notifications/read
// @access  Private
exports.markAsRead = async (req, res) => {
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
}

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markOneAsRead = async (req, res) => {
  try {
    const [result] = await db.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notificación no encontrada",
      })
    }

    res.status(200).json({
      success: true,
      message: "Notificación marcada como leída",
    })
  } catch (error) {
    console.error("Error al actualizar notificación:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar notificación",
    })
  }
}

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notificación no encontrada",
      })
    }

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
}