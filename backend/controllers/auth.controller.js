const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/jwt.utils");

const login = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: "Username or email and password are required",
      });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email || "", username || ""],
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid username/email or password",
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username/email or password",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("accesstoken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshtoken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const logout = (req, res) => {
  res.clearCookie("accesstoken", { path: "/" });
  res.clearCookie("refreshtoken", { path: "/" });

  return res.status(200).json({
    message: "Logged out successfully",
  });
};

const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshtoken;

    if (!token) {
      return res.status(401).json({
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const [users] = await db.query(
      "SELECT user_id, username, role FROM users WHERE user_id = ?",
      [decoded.user_id],
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const accessToken = generateAccessToken(users[0]);

    res.cookie("accesstoken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Access token refreshed",
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT user_id, username, email, role
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id],
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: users[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  login,
  logout,
  refreshToken,
  getMe,
};
