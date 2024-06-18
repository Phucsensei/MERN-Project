const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name!"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email!"],
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minLength: [4, "Password should be greater than 4 characters"],
      select: false,
    },
    avatar: { type: String }, // Chỉnh lại để chỉ có một trường avatar là chuỗi
    role: { type: String, default: "user" }, // Thêm trường role với giá trị mặc định là "user"
    createdAt: { type: Date, default: Date.now }, // Thêm trường createdAt với giá trị mặc định là thời gian hiện tại
    resetPasswordToken: String,
    resetPasswordTime: Date,
  },
  {
    versionKey: "__v", // Đặt tên cho version key là "__v"
  }
);

//  Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
