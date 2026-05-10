const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { z } = require("zod");
const promClient = require("prom-client");

const app = express();

// ══════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ══════════════════════════════════════════════════════════
app.set("trust proxy", 1);
app.use(helmet());
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

// Global rate limit: 100 requests / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(globalLimiter);

// Stricter auth rate limit: 10 attempts / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

// ══════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 64');
  process.exit(1);
}
const TOKEN_EXPIRY = "7d";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase().replace(".", ""))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

// ══════════════════════════════════════════════════════════
// PROMETHEUS METRICS
// ══════════════════════════════════════════════════════════

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "indomitum_" });

const httpRequestDuration = new promClient.Histogram({
  name: "indomitum_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: "indomitum_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// Metrics middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestTotal.inc(labels);
  });
  next();
});

// ── Health Check Endpoint ────────────────────────────────

app.get("/health", async (_req, res) => {
  const checks = { status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime(), services: {} };
  
  // PostgreSQL
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    checks.services.postgres = { status: "healthy", latency_ms: Date.now() - start };
  } catch (err) {
    checks.status = "degraded";
    checks.services.postgres = { status: "unhealthy", error: err.message };
  }

  // MongoDB (if configured)
  if (process.env.MONGO_URL) {
    checks.services.mongodb = { status: "not_checked", note: "MongoDB client not initialized in this version" };
  }

  const statusCode = checks.status === "ok" ? 200 : 503;
  res.status(statusCode).json(checks);
});

// ── Prometheus Metrics Endpoint ──────────────────────────

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// ══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS (Zod)
// ══════════════════════════════════════════════════════════

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["collector", "buyer"]).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const seedSchema = z.object({
  seed_id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(255),
  quantity: z.number().int().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  street: z.string().max(255).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  country: z.string().max(255).nullable().optional(),
  zip_code: z.string().max(20).nullable().optional(),
});

const orderSchema = z.object({
  buyer_name: z.string().trim().min(1).max(100),
  buyer_email: z.string().trim().email().max(255),
  buyer_phone: z.string().max(30).nullable().optional(),
  buyer_address: z.string().max(500).nullable().optional(),
  delivery_method: z.enum(["pickup", "shipping"]).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(z.object({
    seed_id: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
  })).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "requested", "invoice_sent", "confirmed", "preparing",
    "shipped", "ready_pickup", "delivered", "completed", "cancelled",
  ]),
  notes: z.string().max(2000).nullable().optional(),
});

// Validate middleware factory
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return res.status(400).json({ error: "Validation failed", details: errors });
    }
    req.body = result.data;
    next();
  };
}

// ── Helpers ──────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// ── Auth Middleware ──────────────────────────────────────

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireRole(req, res, roles) {
  const { rows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
  const userRoles = rows.map((r) => r.role);
  if (!roles.some((r) => userRoles.includes(r))) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

// ── Health ───────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

app.post("/auth/signup", authLimiter, validate(signupSchema), async (req, res) => {
  const { email, password, full_name, role } = req.body;

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email.toLowerCase().trim(), hash]
    );
    const user = rows[0];

    await pool.query(
      "INSERT INTO profiles (user_id, full_name, email) VALUES ($1, $2, $3)",
      [user.id, full_name, user.email]
    );

    if (role) {
      await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, $2)", [user.id, role]);
    }

    const token = generateToken(user);

    const { rows: profiles } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [user.id]);
    const { rows: roles } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [user.id]);

    res.status(201).json({
      user: { id: user.id, email: user.email },
      profile: profiles[0] || null,
      roles: roles.map((r) => r.role),
      token,
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/auth/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user);

    const { rows: profiles } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [user.id]);
    const { rows: roles } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [user.id]);

    res.json({
      user: { id: user.id, email: user.email },
      profile: profiles[0] || null,
      roles: roles.map((r) => r.role),
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/auth/me", auth, async (req, res) => {
  try {
    const { rows: profiles } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [req.user.id]);
    const { rows: roles } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    res.json({
      user: { id: req.user.id, email: req.user.email },
      profile: profiles[0] || null,
      roles: roles.map((r) => r.role),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/auth/reset-password", authLimiter, async (req, res) => {
  // Placeholder — in a real setup send an email with a reset link
  res.json({ message: "If that email exists, a reset link has been sent." });
});

app.post("/auth/update-password", auth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// ══════════════════════════════════════════════════════════
// PROFILE ROUTES
// ══════════════════════════════════════════════════════════

app.get("/profiles/:userId", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [req.params.userId]);
    if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/profiles", auth, async (req, res) => {
  const { full_name, avatar_url } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE profiles SET full_name = COALESCE($1, full_name), avatar_url = COALESCE($2, avatar_url), updated_at = now() WHERE user_id = $3 RETURNING *",
      [full_name, avatar_url, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/profiles/batch", auth, async (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0) return res.json([]);

  try {
    const placeholders = user_ids.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await pool.query(
      `SELECT user_id, full_name FROM profiles WHERE user_id IN (${placeholders})`,
      user_ids
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// SEEDS CRUD
// ══════════════════════════════════════════════════════════

app.get("/seeds", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM seeds ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/seeds/by-seed-id/:seedId", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM seeds WHERE seed_id = $1", [req.params.seedId]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/seeds/exists/:seedId", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id FROM seeds WHERE seed_id = $1 LIMIT 1", [req.params.seedId]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/seeds/:id", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM seeds WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Seed not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/seeds", auth, validate(seedSchema), async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO seeds (seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [seed_id, name, quantity || 0, notes, image_url, latitude, longitude, street, city, country, zip_code, req.user.id]
    );

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1, $2, $3, $4)",
      [rows[0].id, "created", JSON.stringify(rows[0]), req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/seeds/lookup-ids", auth, async (req, res) => {
  const { seed_ids } = req.body;
  if (!Array.isArray(seed_ids) || seed_ids.length === 0) return res.json({});

  try {
    const safeIds = seed_ids.slice(0, 1000);
    const placeholders = safeIds.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await pool.query(
      `SELECT id, seed_id FROM seeds WHERE seed_id IN (${placeholders})`,
      safeIds
    );
    const map = {};
    rows.forEach((r) => { map[r.seed_id] = r.id; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/seeds/:id", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE seeds SET name=COALESCE($1,name), quantity=COALESCE($2,quantity), notes=$3, image_url=COALESCE($4,image_url),
       latitude=$5, longitude=$6, street=$7, city=$8, country=$9, zip_code=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Seed not found" });

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1, $2, $3, $4)",
      [req.params.id, "updated", JSON.stringify(req.body), req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/seeds/:id", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  try {
    const { rows: seedRows } = await pool.query("SELECT * FROM seeds WHERE id = $1", [req.params.id]);
    if (seedRows.length === 0) return res.status(404).json({ error: "Seed not found" });

    const seed = seedRows[0];
    await pool.query(
      `INSERT INTO deleted_seeds (original_id, seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, added_by, original_created_at, deleted_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now() + interval '90 days')`,
      [seed.id, seed.seed_id, seed.name, seed.quantity, seed.notes, seed.image_url, seed.latitude, seed.longitude, seed.street, seed.city, seed.country, seed.zip_code, seed.added_by, seed.created_at, req.user.id]
    );

    await pool.query("DELETE FROM seeds WHERE id = $1", [req.params.id]);

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1, $2, $3, $4)",
      [seed.id, "deleted", JSON.stringify(seed), req.user.id]
    );

    res.json({ message: "Seed moved to recycle bin" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/seeds/batch-delete", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });

  try {
    for (const id of ids) {
      const { rows } = await pool.query("SELECT * FROM seeds WHERE id = $1", [id]);
      if (rows.length === 0) continue;

      const seed = rows[0];
      await pool.query(
        `INSERT INTO deleted_seeds (original_id, seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, added_by, original_created_at, deleted_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now() + interval '90 days')`,
        [seed.id, seed.seed_id, seed.name, seed.quantity, seed.notes, seed.image_url, seed.latitude, seed.longitude, seed.street, seed.city, seed.country, seed.zip_code, seed.added_by, seed.created_at, req.user.id]
      );

      await pool.query("DELETE FROM seeds WHERE id = $1", [id]);

      await pool.query(
        "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1, $2, $3, $4)",
        [seed.id, "deleted", JSON.stringify(seed), req.user.id]
      );
    }

    res.json({ message: `${ids.length} seed(s) moved to recycle bin` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// ORDERS CRUD
// ══════════════════════════════════════════════════════════

app.get("/orders", auth, async (req, res) => {
  try {
    const { rows: roles } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    const isAdminOrCollector = roles.some((r) => ["admin", "collector"].includes(r.role));

    let query, params;
    if (isAdminOrCollector) {
      query = "SELECT * FROM orders ORDER BY created_at DESC";
      params = [];
    } else {
      query = "SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC";
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders/:id/items", auth, async (req, res) => {
  try {
    // Verify ownership or admin/collector role
    const { rows: orderRows } = await pool.query(
      "SELECT buyer_id, collector_id FROM orders WHERE id = $1", [req.params.id]
    );
    if (orderRows.length === 0) return res.status(404).json({ error: "Order not found" });
    const { rows: roleRows } = await pool.query(
      "SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]
    );
    const isAdminOrCollector = roleRows.some(r => ["admin", "collector"].includes(r.role));
    if (orderRows[0].buyer_id !== req.user.id && !isAdminOrCollector) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT oi.*, s.name as seed_name, s.seed_id as seed_code
       FROM order_items oi
       LEFT JOIN seeds s ON s.id = oi.seed_id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );
    const items = rows.map((r) => ({
      ...r,
      seeds: r.seed_name ? { name: r.seed_name, seed_id: r.seed_code } : null,
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders/:id/history", auth, async (req, res) => {
  try {
    // Verify ownership or admin/collector role
    const { rows: orderRows } = await pool.query(
      "SELECT buyer_id, collector_id FROM orders WHERE id = $1", [req.params.id]
    );
    if (orderRows.length === 0) return res.status(404).json({ error: "Order not found" });
    const { rows: roleRows } = await pool.query(
      "SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]
    );
    const isAdminOrCollector = roleRows.some(r => ["admin", "collector"].includes(r.role));
    if (orderRows[0].buyer_id !== req.user.id && !isAdminOrCollector) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { rows } = await pool.query(
      "SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/orders", auth, validate(orderSchema), async (req, res) => {
  const { buyer_name, buyer_email, buyer_phone, buyer_address, delivery_method, notes, items } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO orders (buyer_id, buyer_name, buyer_email, buyer_phone, buyer_address, delivery_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, buyer_name, buyer_email, buyer_phone, buyer_address, delivery_method, notes]
    );
    const order = rows[0];

    if (items?.length) {
      for (const item of items) {
        await pool.query(
          "INSERT INTO order_items (order_id, seed_id, quantity) VALUES ($1, $2, $3)",
          [order.id, item.seed_id, item.quantity || 1]
        );
      }
    }

    await pool.query(
      "INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)",
      [order.id, "requested", req.user.id]
    );

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/orders/:id/status", auth, validate(statusSchema), async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { status, notes } = req.body;

  try {
    const timestampField = { confirmed: "confirmed_at", shipped: "shipped_at", delivered: "delivered_at" }[status];
    const extra = timestampField ? `, ${timestampField} = now()` : "";

    const { rows } = await pool.query(
      `UPDATE orders SET status = $1, updated_at = now()${extra} WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Order not found" });

    await pool.query(
      "INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)",
      [req.params.id, status, req.user.id, notes]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/orders/:id", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  try {
    const { rowCount } = await pool.query("DELETE FROM orders WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// SEED HISTORY
// ══════════════════════════════════════════════════════════

app.get("/seeds/:id/history", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  try {
    let query, params;
    if (req.params.id === "all") {
      query = "SELECT * FROM seed_history ORDER BY created_at DESC LIMIT 200";
      params = [];
    } else {
      query = "SELECT * FROM seed_history WHERE seed_id = $1 ORDER BY created_at DESC";
      params = [req.params.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// RECYCLE BIN
// ══════════════════════════════════════════════════════════

app.get("/bin", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;
  try {
    const { rows } = await pool.query("SELECT * FROM deleted_seeds ORDER BY deleted_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/bin/:id/restore", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  try {
    const { rows } = await pool.query("SELECT * FROM deleted_seeds WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found in bin" });

    const d = rows[0];
    await pool.query(
      `INSERT INTO seeds (id, seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, added_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [d.original_id, d.seed_id, d.name, d.quantity, d.notes, d.image_url, d.latitude, d.longitude, d.street, d.city, d.country, d.zip_code, d.added_by, d.original_created_at]
    );

    await pool.query("DELETE FROM deleted_seeds WHERE id = $1", [req.params.id]);

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1, $2, $3, $4)",
      [d.original_id, "restored", JSON.stringify(d), req.user.id]
    );

    res.json({ message: "Seed restored" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/bin/batch-restore", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });

  try {
    for (const id of ids) {
      const { rows } = await pool.query("SELECT * FROM deleted_seeds WHERE id = $1", [id]);
      if (rows.length === 0) continue;

      const d = rows[0];
      await pool.query(
        `INSERT INTO seeds (id, seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, added_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [d.original_id, d.seed_id, d.name, d.quantity, d.notes, d.image_url, d.latitude, d.longitude, d.street, d.city, d.country, d.zip_code, d.added_by, d.original_created_at]
      );

      await pool.query("DELETE FROM deleted_seeds WHERE id = $1", [id]);

      await pool.query(
        "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1, $2, $3, $4)",
        [d.original_id, "restored", JSON.stringify(d), req.user.id]
      );
    }

    res.json({ message: `${ids.length} seed(s) restored` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/bin/batch-delete", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    await pool.query(`DELETE FROM deleted_seeds WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} seed(s) permanently deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// BUYER SEEDS
// ══════════════════════════════════════════════════════════

app.get("/buyer-seeds", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bs.id, bs.seed_id, bs.quantity, bs.assigned_at,
              s.id as s_id, s.seed_id as s_seed_id, s.name, s.image_url, s.country, s.city,
              s.street, s.zip_code, s.notes, s.latitude, s.longitude, s.created_at as s_created_at, s.quantity as s_quantity
       FROM buyer_seeds bs
       LEFT JOIN seeds s ON s.id = bs.seed_id
       WHERE bs.buyer_id = $1
       ORDER BY bs.assigned_at DESC`,
      [req.user.id]
    );

    // Reshape to match frontend expectation
    const result = rows.map((r) => ({
      id: r.id,
      seed_id: r.seed_id,
      quantity: r.quantity,
      assigned_at: r.assigned_at,
      seeds: r.s_id ? {
        id: r.s_id,
        seed_id: r.s_seed_id,
        name: r.name,
        image_url: r.image_url,
        country: r.country,
        city: r.city,
        street: r.street,
        zip_code: r.zip_code,
        notes: r.notes,
        latitude: r.latitude,
        longitude: r.longitude,
        created_at: r.s_created_at,
        quantity: r.s_quantity,
      } : null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/buyer-seeds", auth, async (req, res) => {
  const { seed_id, quantity, notes } = req.body;
  if (!seed_id) return res.status(400).json({ error: "seed_id required" });

  try {
    const { rows } = await pool.query(
      "INSERT INTO buyer_seeds (buyer_id, seed_id, quantity, notes) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, seed_id, quantity || 1, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Already assigned" });
    res.status(500).json({ error: err.message });
  }
});

app.get("/buyer-seeds/assigned-uuids", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT seed_id FROM buyer_seeds WHERE buyer_id = $1",
      [req.user.id]
    );
    res.json(rows.map((r) => r.seed_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// FILE UPLOAD
// ══════════════════════════════════════════════════════════

app.post("/upload/seed-image", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ url });
});

// ── Global Error Handler ────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
