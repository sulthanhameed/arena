import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

// POST /api/auth/signup
export async function signup(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "Email already registered — please sign in" });
    }

    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.json({
      message: "Logged in",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function getMe(req, res) {
  res.json({ user: req.user });
}

// PUT /api/auth/me
export async function updateMe(req, res, next) {
  try {
    const { name, phone, avatarUrl } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone, avatarUrl } },
      { new: true, runValidators: true },
    );
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout (client-side token clear, but provided for symmetry)
export function logout(_req, res) {
  res.json({ message: "Logged out" });
}
