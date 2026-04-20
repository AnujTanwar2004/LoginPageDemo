require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { createUserRepository } = require("./src/db/userRepository");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_SECURE =
  String(process.env.COOKIE_SECURE || "false").toLowerCase() === "true";

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET. Set it in your environment variables.");
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/assets", express.static(path.join(__dirname, "public")));

const userRepo = createUserRepository();

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function setAuthCookie(res, token) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function authMiddleware(req, res, next) {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

function hasValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

app.get("/", (req, res) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return res.redirect("/hero");
  } catch (_error) {
    return res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/hero", (req, res) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return res.sendFile(path.join(__dirname, "public", "hero.html"));
  } catch (_error) {
    return res.redirect("/login");
  }
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!hasValidEmail(normalizedEmail)) {
    return res
      .status(400)
      .json({ message: "Please provide a valid email address" });
  }

  if (!hasStrongEnoughPassword(password)) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  try {
    const existingUser = await userRepo.findByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await userRepo.createUser({
      id: uuidv4(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const token = createToken(user);
    setAuthCookie(res, token);

    return res
      .status(201)
      .json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    if (error && error.code === "USER_EXISTS") {
      return res.status(409).json({ message: "Email is already registered" });
    }

    console.error("Register error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong during registration" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const user = await userRepo.findByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong during login" });
  }
});

app.get("/api/me", authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie("auth_token");
  return res.json({ message: "Logged out successfully" });
});

(async () => {
  try {
    await userRepo.setup();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
})();
