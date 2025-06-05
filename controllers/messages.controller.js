const { validationResult } = require("express-validator")
const db = require("../config/database")

// @desc    Get user conversations
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    // Get unique conversations
    const [conversations] = await db.query(
      `SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END as user_id,
        u.name,
        MAX(m.created_at) as last_message_date,
        COUNT(CASE WHEN m.is_read = 0 AND m.receiver_id = ? THEN 1 END) as unread_count
      FROM messages m
      JOIN users u ON (
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END = u.id
      )
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY user_id, u.name
      ORDER BY last_message_date DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
    )

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    })
  } catch (error) {
    console.error("Error al obtener conversaciones:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener conversaciones",
    })
  }
}

// @desc    Get messages with specific user
// @route   GET /api/messages/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    // Mark messages as read
    await db.query(
      "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?",
      [req.params.userId, req.user.id],
    )

    // Get messages
    const [messages] = await db.query(
      `SELECT m.*, 
        CASE WHEN m.sender_id = ? THEN true ELSE false END as is_mine,
        u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC`,
      [req.user.id, req.user.id, req.params.userId, req.params.userId, req.user.id],
    )

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    })
  } catch (error) {
    console.error("Error al obtener mensajes:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener mensajes",
    })
  }
}

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { receiver_id, content, product_id } = req.body

  try {
    // Check if receiver exists
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [receiver_id])

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Create message
    const [result] = await db.query(
      "INSERT INTO messages (sender_id, receiver_id, content, product_id) VALUES (?, ?, ?, ?)",
      [req.user.id, receiver_id, content, product_id || null],
    )

    // Create notification
    await db.query(
      "INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)",
      [receiver_id, "message", `Nuevo mensaje de ${req.user.name}`, result.insertId],
    )

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        sender_id: req.user.id,
        receiver_id,
        content,
        product_id: product_id || null,
        created_at: new Date(),
        is_mine: true,
        sender_name: req.user.name,
      },
    })
  } catch (error) {
    console.error("Error al enviar mensaje:", error)
    res.status(500).json({
      success: false,
      message: "Error al enviar mensaje",
    })
  }
}