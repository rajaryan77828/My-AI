import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aura_ai_secure_secret_key_2024";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

app.use(express.json());
app.use(cookieParser());

// Email Transporter
let smtpHost = process.env.SMTP_HOST || "";
if (smtpHost === "stmp.gmail.com") {
  smtpHost = "smtp.gmail.com";
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- API Routes ---

// Auth: Signup
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password, language } = req.body;
  try {
    // Check if user already exists
    const existingUser = db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").get(email, username);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email or username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const stmt = db.prepare("INSERT INTO users (username, email, password, otp, otp_expiry, language) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(username, email, hashedPassword, otp, expiry, language || 'english');

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("SMTP Configuration missing");
      return res.status(500).json({ error: "Email service is not configured. Please contact the administrator." });
    }

    try {
      await transporter.sendMail({
        from: `Aura AI <${process.env.SMTP_FROM}>`,
        to: email,
        subject: "Verify your Aura AI Account",
        text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 12px; color: #1f2937;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Aura AI</h1>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #111827;">Verify your account</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #4b5563;">To complete your registration, please use the following one-time password (OTP). This code will expire in 10 minutes.</p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.25em; color: #10b981;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 32px;">If you did not create an account with Aura AI, you can safely ignore this email.</p>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; ${new Date().getFullYear()} Aura AI. All rights reserved.</p>
            </div>
          </div>
        `
      });
    } catch (mailErr) {
      console.error(`Signup Mail Error:`, mailErr);
      return res.status(500).json({ error: "Failed to send verification email. Please try again later." });
    }

    res.json({ message: "Signup successful. Please verify OTP sent to your email." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Auth: Verify OTP
app.post("/api/auth/verify", (req, res) => {
  const { email, otp } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  db.prepare("UPDATE users SET is_verified = 1, otp = NULL, otp_expiry = NULL WHERE id = ?").run(user.id);
  
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ message: "Verification successful", user: { id: user.id, username: user.username, role: user.role } });
});

// Auth: Login
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username
    const user: any = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(identifier, identifier);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email first" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// Auth: Forgot Password
app.post("/api/auth/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.json({ message: "If an account exists, a reset link has been sent." });

    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("SMTP Configuration missing");
      return res.status(500).json({ error: "Email service is not configured. Please contact the administrator." });
    }

    try {
      await transporter.sendMail({
        from: `Aura AI <${process.env.SMTP_FROM}>`,
        to: email,
        subject: "Reset your Aura AI Password",
        text: `Please reset your password by clicking this link: ${resetLink}`,
        html: `
          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 12px; color: #1f2937;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Aura AI</h1>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #111827;">Password Reset Request</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #4b5563;">We received a request to reset the password for your Aura AI account. Click the button below to choose a new password. This link will expire in 1 hour.</p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 14px; color: #10b981; word-break: break-all; margin-bottom: 32px;">${resetLink}</p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 32px;">If you did not request a password reset, no further action is required.</p>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; ${new Date().getFullYear()} Aura AI. All rights reserved.</p>
            </div>
          </div>
        `
      });
    } catch (mailErr) {
      console.error(`Mail Error:`, mailErr);
      return res.status(500).json({ error: "Failed to send reset email. Please contact support." });
    }

    res.json({ message: "Reset link sent to email." });
  } catch (err) {
    next(err);
  }
});

// Auth: Reset Password
app.post("/api/auth/reset-password", async (req, res, next) => {
  const { token, newPassword } = req.body;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, decoded.id);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ error: "Invalid or expired reset token" });
  }
});

// Auth: Google OAuth URL
app.get("/api/auth/google/url", (req, res) => {
  const redirectUri = `${APP_URL}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
  res.json({ url });
});

// Auth: Google Callback
app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${APP_URL}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json();

    let user: any = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(googleUser.sub, googleUser.email);

    if (!user) {
      const stmt = db.prepare("INSERT INTO users (username, email, google_id, is_verified) VALUES (?, ?, ?, 1)");
      const result = stmt.run(googleUser.name, googleUser.email, googleUser.sub);
      user = { id: result.lastInsertRowid, username: googleUser.name, role: 'user' };
    } else if (!user.google_id) {
      db.prepare("UPDATE users SET google_id = ?, is_verified = 1 WHERE id = ?").run(googleUser.sub, user.id);
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Authentication failed");
  }
});

// Auth: Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ message: "Logged out successfully" });
});

// User: Get Profile
app.get("/api/user/profile", authenticate, (req: any, res) => {
  const user: any = db.prepare("SELECT id, username, email, role, language, theme, created_at FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

// User: Update Profile
app.put("/api/user/profile", authenticate, (req: any, res) => {
  const { username, language, theme } = req.body;
  try {
    db.prepare("UPDATE users SET username = ?, language = ?, theme = ? WHERE id = ?").run(username, language, theme || 'dark', req.user.id);
    res.json({ message: "Profile updated successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Chat: Create/Get History
app.get("/api/chats", authenticate, (req: any, res) => {
  const chats = db.prepare("SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(chats);
});

app.get("/api/chats/:chatId", authenticate, (req: any, res) => {
  const messages = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC").all(req.params.chatId);
  res.json(messages);
});

// Chat: Save Message (Frontend handles generation)
app.post("/api/chat", authenticate, async (req: any, res, next) => {
  try {
    const { chatId, message, role, title, content } = req.body;
    
    // Save user message
    if (!db.prepare("SELECT id FROM chats WHERE id = ?").get(chatId)) {
      db.prepare("INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)").run(chatId, req.user.id, title || message?.substring(0, 50) || "New Research Session");
    }
    
    if (role && content) {
      db.prepare("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)").run(chatId, role, content);
      return res.json({ status: "saved" });
    }

    res.status(400).json({ error: "Invalid message data" });
  } catch (err: any) {
    console.error("Chat Error:", err);
    next(err);
  }
});

// Chat: Delete Chat
app.delete("/api/chats/:chatId", authenticate, (req: any, res, next) => {
  try {
    const { chatId } = req.params;
    console.log(`[SERVER] Delete request for chat: ${chatId} by user: ${req.user.id}`);
    
    const chat: any = db.prepare("SELECT * FROM chats WHERE id = ? AND user_id = ?").get(chatId, req.user.id);
    
    if (!chat) {
      console.warn(`[SERVER] Chat not found: ${chatId}`);
      return res.status(404).json({ error: "Chat not found" });
    }

    db.prepare("DELETE FROM messages WHERE chat_id = ?").run(chatId);
    db.prepare("DELETE FROM chats WHERE id = ?").run(chatId);
    
    console.log(`[SERVER] Successfully deleted chat: ${chatId}`);
    res.json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error("[SERVER] Error deleting chat:", err);
    next(err);
  }
});

// Chat: Clear All History
app.delete("/api/chats", authenticate, (req: any, res, next) => {
  try {
    const chats = db.prepare("SELECT id FROM chats WHERE user_id = ?").all(req.user.id);
    for (const chat of chats as any[]) {
      db.prepare("DELETE FROM messages WHERE chat_id = ?").run(chat.id);
      db.prepare("DELETE FROM chats WHERE id = ?").run(chat.id);
    }
    res.json({ message: "All history cleared" });
  } catch (err) {
    next(err);
  }
});

// Admin: Get All Users
app.get("/api/admin/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const users = db.prepare("SELECT id, username, email, role, is_verified, created_at FROM users").all();
  res.json(users);
});

// Admin: Update User Role
app.post("/api/admin/users/:userId/role", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { role } = req.body;
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.userId);
  res.json({ message: "Role updated" });
});

// 404 Handler for API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
