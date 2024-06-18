// models/PasswordReset.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passwordResetSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  resetToken: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
