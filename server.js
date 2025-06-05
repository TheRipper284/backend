require("dotenv").config()
const express = require("express")
const cors = require("cors")
const path = require("path")
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Database connection
const db = require("./config/database")

// Test database connection
db.getConnection()
  .then((connection) => {
    console.log("Database connected successfully")
    connection.release()
  })
  .catch((err) => {
    console.error("Database connection error:", err)
  })

// Routes
app.use("/api/auth", require("./routes/auth.routes"))
app.use("/api/users", require("./routes/users.routes"))
app.use("/api/products", require("./routes/products.routes"))
app.use("/api/categories", require("./routes/categories.routes"))
app.use("/api/carts", require("./routes/carts.routes"))
app.use("/api/orders", require("./routes/orders.routes"))
app.use("/api/messages", require("./routes/messages.routes"))
app.use("/api/reviews", require("./routes/reviews.routes"))
app.use("/api/notifications", require("./routes/notifications.routes"))
app.use("/api/admin", require("./routes/admin.routes"))

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
