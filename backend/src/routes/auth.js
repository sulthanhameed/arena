import { Router } from "express";
import { signup, login, getMe, updateMe, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

export default router;
