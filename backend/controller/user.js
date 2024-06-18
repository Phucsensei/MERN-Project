const express = require("express");
const path = require("path");
const crypto = require("crypto");
const router = express.Router();
const User = require("../model/user");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const PasswordReset = require("../model/PasswordReset");

// Create User Route
router.post(
  "/create-user",
  upload.single("file"),
  catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;
    const filename = req.file.filename;
    const fileUrl = path.join("uploads", filename);

    try {
      const userEmail = await User.findOne({ email });

      if (userEmail) {
        // User already exists, delete uploaded file
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
            res.status(500).json({ message: "Error deleting file" });
          }
        });
        return next(new ErrorHandler("User already exists", 400));
      }

      const user = {
        name: name,
        email: email,
        password: password,
        avatar: fileUrl,
        verified: false, // Ensure this field is added
      };

      const activationToken = createActivationToken(user);

      const activationUrl = `http://localhost:3000/activation/${activationToken}`;

      // Send activation email
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}`,
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account!`,
      });
    } catch (error) {
      // Handle error
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Create Activation Token
const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// Activate User Route
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      const { name, email, password, avatar } = newUser;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }

      user = await User.create({
        name,
        email,
        avatar,
        password,
        verified: true,
      });

      sendToken(user, 201, res);
    } catch (error) {
      // Handle error
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Login User
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    sendToken(user, 200, res);
  })
);

// Request Password Reset
router.post(
  "/requestPasswordReset",
  catchAsyncErrors(async (req, res, next) => {
    const { email, redirectUrl } = req.body;

    // Check if email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "No account with the supplied email exists",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save token in the database
    await PasswordReset.create({
      userId: user._id,
      resetToken: hashedToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    });

    // Send reset email
    const resetUrl = `${redirectUrl}/passwordReset/${resetToken}`;
    await sendMail({
      email: user.email,
      subject: "Password Reset",
      message: `Hello, please click on the link to reset your password: ${resetUrl}`,
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Password reset email sent successfully.",
    });
  })
);

// Handle Password Reset
router.post(
  "/resetPassword",
  catchAsyncErrors(async (req, res, next) => {
    const { resetToken, newPassword } = req.body;
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find the reset token in the database
    const passwordResetRecord = await PasswordReset.findOne({
      resetToken: hashedToken,
      expiresAt: { $gt: Date.now() },
    });

    if (!passwordResetRecord) {
      return next(
        new ErrorHandler("Invalid or expired password reset token", 400)
      );
    }

    // Find the user and update the password
    const user = await User.findById(passwordResetRecord.userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Hash the new password before saving
    user.password = newPassword;
    await user.save();

    // Delete the password reset record
    await PasswordReset.deleteOne({ _id: passwordResetRecord._id });

    res.status(200).json({
      status: "SUCCESS",
      message: "Password reset successfully",
    });
  })
);

module.exports = router;
