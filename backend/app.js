const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const ErrorHandler = require("./middleware/error");

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use("/", express.static("uploads"));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Load environment variables if not in production
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "backend/config/.env", // Ensure this path is correct
  });
}

// Import routes
const user = require("./controller/user");
const { upload } = require("./multer"); // Ensure multer is configured correctly

// Use routes
app.use("/api/v2/user", user);

// Error handling middleware should be placed after all routes
app.use(ErrorHandler);

module.exports = app;
