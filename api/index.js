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
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Resend } = require("resend");

const app = express();

// ══════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ══════════════════════════════════════════════════════════

app.set("trust proxy", 1);
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "https://indomitum.online", "https://www.indomitum.online"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" } });

// ══════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const APP_URL = process.env.APP_URL || "https://indomitum.online";
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is required. Generate with: openssl rand -hex 64");
  process.exit(1);
}
const TOKEN_EXPIRY = "7d";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const r2Client = process.env.R2_ACCESS_KEY_ID ? new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
}) : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

app.use("/uploads", express.static(UPLOAD_DIR));

// ══════════════════════════════════════════════════════════
// PROMETHEUS METRICS
// ══════════════════════════════════════════════════════════

promClient.collectDefaultMetrics({ prefix: "indomitum_" });

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

// ══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["collector", "buyer"]).optional(),
  organization_name: z.string().trim().max(100).optional(),
  organization_id: z.string().uuid().optional(),
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
  image_url: z.string().max(5000000).nullable().optional(),
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
  status: z.enum(["requested", "invoice_sent", "confirmed", "preparing",
    "shipped", "ready_pickup", "delivered", "completed", "cancelled"]),
  notes: z.string().max(2000).nullable().optional(),
  tracking_code: z.string().max(200).nullable().optional(),
  tracking_url: z.string().url().max(1000).nullable().optional(),
});

// ══════════════════════════════════════════════════════════
// MIDDLEWARE HELPERS
// ══════════════════════════════════════════════════════════

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
    req.body = result.data;
    next();
  };
}

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    const { rows } = await pool.query("SELECT organization_id FROM users WHERE id = $1", [payload.id]);
    req.user.organization_id = rows[0]?.organization_id || null;
    next();
  } catch (err) {
    console.error("JWT verify error:", err.message, "secret prefix:", JWT_SECRET?.substring(0, 10));
    res.status(401).json({ error: err.message || "Invalid or expired token" });
  }
}

async function requireRole(req, res, roles) {
  const { rows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
  const userRoles = rows.map((r) => r.role);
  if (!roles.some((r) => userRoles.includes(r))) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}


// ── Email Verification Helpers ──────────────────────────────

async function sendVerificationEmail(email, fullName, token) {
  if (!resend) {
    console.log("RESEND_API_KEY not set - skipping email verification");
    return;
  }
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: "Indomitum <noreply@indomitum.online>",
    to: email,
    subject: "Verify your Indomitum account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#2d5016;border-radius:12px;padding:12px">
            <span style="color:white;font-size:24px">🌱</span>
          </div>
          <h1 style="color:#2d5016;margin:12px 0 4px">Indomitum</h1>
        </div>
        <h2 style="color:#1a1a1a">Welcome, ${fullName}!</h2>
        <p style="color:#555;line-height:1.6">Thanks for joining Indomitum. Please verify your email address to activate your account.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${verifyUrl}" style="background:#2d5016;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
            Verify Email Address
          </a>
        </div>
        <p style="color:#999;font-size:13px">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#bbb;font-size:12px;text-align:center">Indomitum · Seed Collection Platform</p>
      </div>
    `,
  });
}


// ── Public Passport ─────────────────────────────────────
app.get("/passport/:seedId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, p.full_name as collector_name
       FROM seeds s
       LEFT JOIN profiles p ON p.user_id = s.added_by
       WHERE s.seed_id = $1 LIMIT 1`,
      [req.params.seedId]
    );
    if (!rows.length) return res.status(404).json({ error: "Seed not found" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Buyer Favorites ──────────────────────────────────────
app.get("/buyer/favorites", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.* FROM seeds s
       INNER JOIN buyer_favorites bf ON bf.seed_id = s.id
       WHERE bf.buyer_id = $1`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/buyer/favorites", auth, async (req, res) => {
  const { seed_id } = req.body;
  try {
    const { rows: seedRows } = await pool.query("SELECT id FROM seeds WHERE seed_id = $1", [seed_id]);
    if (!seedRows.length) return res.status(404).json({ error: "Seed not found" });
    await pool.query(
      "INSERT INTO buyer_favorites (buyer_id, seed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user.id, seedRows[0].id]
    );
    res.json({ message: "Added to favorites" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/buyer/favorites/:seedId", auth, async (req, res) => {
  try {
    const { rows: seedRows } = await pool.query("SELECT id FROM seeds WHERE seed_id = $1", [req.params.seedId]);
    if (seedRows.length) {
      await pool.query("DELETE FROM buyer_favorites WHERE buyer_id = $1 AND seed_id = $2", [req.user.id, seedRows[0].id]);
    }
    res.json({ message: "Removed from favorites" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Buyer Orders ─────────────────────────────────────────
app.get("/buyer/orders", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, 
        json_agg(json_build_object('seed_id', oi.seed_id, 'quantity', oi.quantity, 'name', s.name)) as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN seeds s ON s.id = oi.seed_id
       WHERE o.buyer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/buyer/orders", auth, async (req, res) => {
  const { items, notes, delivery_address } = req.body;
  if (!items?.length) return res.status(400).json({ error: "No items in order" });
  try {
    await pool.query("BEGIN");

    // Group items by collector (added_by) so each collector gets their own order
    const collectorMap = {};
    for (const item of items) {
      const { rows: seedRows } = await pool.query(
        "SELECT id, seed_id, name, added_by FROM seeds WHERE seed_id = $1",
        [item.seed_id]
      );
      if (seedRows.length) {
        const seed = seedRows[0];
        const collectorId = seed.added_by;
        if (!collectorMap[collectorId]) collectorMap[collectorId] = [];
        collectorMap[collectorId].push({ ...item, dbId: seed.id, name: seed.name });
      }
    }

    const createdOrders = [];

    // Create one order per collector
    for (const [collectorId, collectorItems] of Object.entries(collectorMap)) {
      const { rows: orderRows } = await pool.query(
        `INSERT INTO orders (buyer_id, collector_id, status, notes, delivery_address, created_at)
         VALUES ($1, $2, 'requested', $3, $4, now()) RETURNING *`,
        [req.user.id, collectorId, notes || null, delivery_address || null]
      );
      const order = orderRows[0];
      createdOrders.push(order);

      for (const item of collectorItems) {
        await pool.query(
          "INSERT INTO order_items (order_id, seed_id, quantity) VALUES ($1, $2, $3)",
          [order.id, item.dbId, item.quantity || 1]
        );
      }

      await pool.query(
        "INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, 'requested', $2)",
        [order.id, req.user.id]
      );
    }

    await pool.query("COMMIT");
    const order = createdOrders[0]; // for compatibility

    // Notify collector via email if Resend is configured
    if (resend) {
      try {
        const { rows: buyerProfile } = await pool.query("SELECT full_name FROM profiles WHERE user_id = $1", [req.user.id]);
        const buyerName = buyerProfile[0]?.full_name || "A buyer";
        const seedIds = items.map(i => i.seed_id);
        const { rows: collectors } = await pool.query(
          `SELECT DISTINCT u.email, p.full_name FROM users u
           JOIN profiles p ON p.user_id = u.id
           JOIN seeds s ON s.added_by = u.id
           WHERE s.seed_id = ANY($1)`,
          [seedIds]
        );
        const itemsList = items.map(i => (i.name || i.seed_id) + " x" + (i.quantity || 1)).join(", ");
        const deliveryHtml = delivery_address ? "<p><strong>Delivery:</strong> " + delivery_address + "</p>" : "";
        const notesHtml = notes ? "<p><strong>Notes:</strong> " + notes + "</p>" : "";
        for (const collector of collectors) {
          await resend.emails.send({
            from: "Indomitum <noreply@indomitum.online>",
            to: collector.email,
            subject: "New order from " + buyerName,
            html: "<div style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px'>" +
              "<h2 style='color:#2d5016'>🌱 New Order Received</h2>" +
              "<p>Hi " + (collector.full_name || "Collector") + ",</p>" +
              "<p><strong>" + buyerName + "</strong> has sent you a seed order.</p>" +
              "<p><strong>Items:</strong> " + itemsList + "</p>" +
              deliveryHtml + notesHtml +
              "<p>Log in to <a href='" + APP_URL + "'>Indomitum</a> to review and respond.</p>" +
              "</div>"
          }).catch(console.error);
        }
      } catch (e) { console.error("Email notify error:", e); }
    }

    res.status(201).json(order);
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// ── Collector Orders ─────────────────────────────────────
app.get("/collector/orders", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, 
        p.full_name as buyer_name,
        json_agg(json_build_object('seed_id', s.seed_id, 'quantity', oi.quantity, 'name', s.name)) as items
       FROM orders o
       LEFT JOIN profiles p ON p.user_id = o.buyer_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN seeds s ON s.id = oi.seed_id
       WHERE EXISTS (
         SELECT 1 FROM order_items oi2
         JOIN seeds s2 ON s2.id = oi2.seed_id
         WHERE oi2.order_id = o.id AND s2.added_by = $1
       )
       GROUP BY o.id, p.full_name
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Buyer Bin ────────────────────────────────────────────
app.get("/buyer/bin", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM buyer_bin WHERE buyer_id = $1 ORDER BY deleted_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/buyer/bin", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "INSERT INTO buyer_bin (buyer_id, seed_data) VALUES ($1, $2) RETURNING *",
      [req.user.id, JSON.stringify(req.body)]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/buyer/bin/:id/restore", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM buyer_bin WHERE id = $1 AND buyer_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    // Re-add to buyer_seeds
    const seedData = rows[0].seed_data;
    if (seedData?.seed_id) {
      const { rows: seedRows } = await pool.query("SELECT id FROM seeds WHERE seed_id = $1", [seedData.seed_id]);
      if (seedRows.length) {
        await pool.query(
          "INSERT INTO buyer_seeds (buyer_id, seed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [req.user.id, seedRows[0].id]
        );
      }
    }
    await pool.query("DELETE FROM buyer_bin WHERE id = $1", [req.params.id]);
    res.json({ message: "Restored" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/buyer/bin/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM buyer_bin WHERE id = $1 AND buyer_id = $2", [req.params.id, req.user.id]);
    res.json({ message: "Deleted permanently" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Health & Metrics ────────────────────────────────────

app.get("/health", async (_req, res) => {
  const checks = { status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime(), services: {} };
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    checks.services.postgres = { status: "healthy", latency_ms: Date.now() - start };
  } catch (err) {
    checks.status = "degraded";
    checks.services.postgres = { status: "unhealthy", error: err.message };
  }
  res.status(checks.status === "ok" ? 200 : 503).json(checks);
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════

app.post("/auth/signup", authLimiter, validate(signupSchema), async (req, res) => {
  const { email, password, full_name, role, organization_name, organization_id } = req.body;
  try {
    const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.length) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);

    // Resolve organization
    let orgId = null;
    if (organization_id) {
      const { rows: org } = await pool.query("SELECT id FROM organizations WHERE id = $1", [organization_id]);
      if (org.length) orgId = org[0].id;
    } else if (organization_name && role !== "buyer") {
      const { rows: org } = await pool.query(
        "INSERT INTO organizations (name) VALUES ($1) RETURNING id", [organization_name]
      );
      orgId = org[0].id;
    }

    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING id, email",
      [email.toLowerCase(), password_hash, orgId]
    );
    const user = rows[0];

    const assignedRole = role || "collector";
    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, $2)", [user.id, assignedRole]);

    const { rows: profileRows } = await pool.query(
      "INSERT INTO profiles (user_id, full_name, email) VALUES ($1, $2, $3) RETURNING *",
      [user.id, full_name, email.toLowerCase()]
    );

    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    // Send verification email (non-blocking)
    const verifyToken = require("crypto").randomBytes(32).toString("hex");
    pool.query(
      "UPDATE users SET email_verified = false, email_verify_token = $1, email_verify_expires = now() + interval \'24 hours\' WHERE id = $2",
      [verifyToken, user.id]
    ).catch(console.error);

    sendVerificationEmail(email.toLowerCase(), full_name, verifyToken).catch(console.error);

    res.status(201).json({ user: { id: user.id, email: user.email }, profile: profileRows[0], roles: [assignedRole], token: jwtToken });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });
    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const { rows: roleRows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [user.id]);
    const { rows: profileRows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [user.id]);

    // Check email verification (skip for admin)
    const isAdmin = roleRows.some(r => r.role === "admin");
    // email_verified: null=old account(allow), false=unverified(block), true=verified(allow)
    if (!isAdmin && user.email_verified === false) {
      return res.status(403).json({ 
        error: "Please verify your email before logging in. Check your inbox for a verification link.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ user: { id: user.id, email: user.email }, profile: profileRows[0] || null, roles: roleRows.map((r) => r.role), token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/auth/reset-password-confirm", authLimiter, async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ error: "Token and new password required" });
  if (new_password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE email_verify_token = $1 AND email_verify_expires > now()",
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });

    const hash = await require("bcryptjs").hash(new_password, 12);
    await pool.query(
      "UPDATE users SET password_hash = $1, email_verify_token = null, email_verify_expires = null WHERE id = $2",
      [hash, rows[0].id]
    );
    res.json({ message: "Password reset successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/auth/me", auth, async (req, res) => {
  try {
    const { rows: profileRows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [req.user.id]);
    const { rows: roleRows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    res.json({ user: { id: req.user.id, email: req.user.email }, profile: profileRows[0] || null, roles: roleRows.map((r) => r.role) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/auth/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    const { rows } = await pool.query(
      "UPDATE users SET email_verified = true, email_verify_token = null, email_verify_expires = null WHERE email_verify_token = $1 AND email_verify_expires > now() RETURNING id, email",
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: "Invalid or expired verification link" });
    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/resend-verification", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const { rows } = await pool.query("SELECT id, email_verified FROM users WHERE email = $1", [email.toLowerCase()]);
    if (!rows.length) return res.json({ message: "If that email exists, a verification link has been sent." });
    if (rows[0].email_verified) return res.json({ message: "Email already verified." });

    const verifyToken = require("crypto").randomBytes(32).toString("hex");
    await pool.query(
      "UPDATE users SET email_verify_token = $1, email_verify_expires = now() + interval \'24 hours\' WHERE id = $2",
      [verifyToken, rows[0].id]
    );

    const { rows: profileRows } = await pool.query("SELECT full_name FROM profiles WHERE user_id = $1", [rows[0].id]);
    await sendVerificationEmail(email.toLowerCase(), profileRows[0]?.full_name || "there", verifyToken);
    res.json({ message: "Verification email sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/reset-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (!rows.length) return res.json({ message: "If that email exists, a reset link has been sent." });

    const resetToken = require("crypto").randomBytes(32).toString("hex");
    await pool.query(
      "UPDATE users SET email_verify_token = $1, email_verify_expires = now() + interval '1 hour' WHERE id = $2",
      [resetToken, rows[0].id]
    );

    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    const { rows: profileRows } = await pool.query("SELECT full_name FROM profiles WHERE user_id = $1", [rows[0].id]);
    const name = profileRows[0]?.full_name || "there";

    if (resend) {
      await resend.emails.send({
        from: "Indomitum <noreply@indomitum.online>",
        to: email.toLowerCase(),
        subject: "Reset your Indomitum password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="display:inline-block;background:#2d5016;border-radius:12px;padding:12px">
                <span style="color:white;font-size:24px">🌱</span>
              </div>
              <h1 style="color:#2d5016;margin:12px 0 4px">Indomitum</h1>
            </div>
            <h2 style="color:#1a1a1a">Reset your password</h2>
            <p style="color:#555;line-height:1.6">Hi ${name}, click the button below to reset your password. This link expires in 1 hour.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${resetUrl}" style="background:#2d5016;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
                Reset Password
              </a>
            </div>
            <p style="color:#999;font-size:13px">If you did not request a password reset, you can ignore this email.</p>
          </div>
        `,
      });
    }

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/update-password", auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    if (current_password) {
      const valid = await bcrypt.compare(current_password, rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    }
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/auth/delete-account", auth, async (req, res) => {
  try {
    await pool.query("BEGIN");
    // Delete in correct order to avoid FK violations
    await pool.query("DELETE FROM buyer_seeds WHERE buyer_id = $1", [req.user.id]);
    await pool.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = $1 OR collector_id = $1)", [req.user.id]);
    await pool.query("DELETE FROM orders WHERE buyer_id = $1 OR collector_id = $1", [req.user.id]);
    await pool.query("DELETE FROM seed_history WHERE performed_by = $1", [req.user.id]);
    await pool.query("DELETE FROM deleted_seeds WHERE added_by = $1 OR deleted_by = $1", [req.user.id]);
    await pool.query("DELETE FROM seeds WHERE added_by = $1", [req.user.id]);
    await pool.query("DELETE FROM profiles WHERE user_id = $1", [req.user.id]);
    await pool.query("DELETE FROM user_roles WHERE user_id = $1", [req.user.id]);
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    await pool.query("COMMIT");
    res.json({ message: "Account deleted" });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// PROFILES
// ══════════════════════════════════════════════════════════

app.get("/profiles/:userId", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [req.params.userId]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/profiles", auth, async (req, res) => {
  const { full_name, avatar_url } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO profiles (user_id, full_name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET full_name = COALESCE($2, profiles.full_name),
         avatar_url = COALESCE($4, profiles.avatar_url), updated_at = now()
       RETURNING *`,
      [req.user.id, full_name, req.user.email, avatar_url]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/profiles/batch", auth, async (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids) || !user_ids.length) return res.json({});
  try {
    const safe = user_ids.slice(0, 200);
    const placeholders = safe.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await pool.query(
      `SELECT user_id, full_name FROM profiles WHERE user_id IN (${placeholders})`, safe
    );
    const map = {};
    rows.forEach((r) => { map[r.user_id] = r.full_name; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// ORGANIZATIONS
// ══════════════════════════════════════════════════════════

// Get my organization info
app.get("/organizations/mine", auth, async (req, res) => {
  if (!req.user.organization_id) return res.json(null);
  try {
    const { rows } = await pool.query("SELECT * FROM organizations WHERE id = $1", [req.user.organization_id]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get members of my organization
app.get("/organizations/mine/members", auth, async (req, res) => {
  if (!req.user.organization_id) return res.json([]);
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.created_at, p.full_name, ur.role
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.organization_id = $1
       ORDER BY u.created_at ASC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join an existing org by ID (collectors only)
app.post("/organizations/join", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["collector", "admin"]))) return;
  const { organization_id } = req.body;
  if (!organization_id) return res.status(400).json({ error: "organization_id required" });
  try {
    const { rows } = await pool.query("SELECT id FROM organizations WHERE id = $1", [organization_id]);
    if (!rows.length) return res.status(404).json({ error: "Organization not found" });
    await pool.query("UPDATE users SET organization_id = $1 WHERE id = $2", [organization_id, req.user.id]);
    res.json({ message: "Joined organization" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// SEEDS
// All seed queries scoped to org (or user if no org)
// ══════════════════════════════════════════════════════════

// Helper: build WHERE clause for seed ownership (org or user)
function seedOwnershipWhere(orgId, userId) {
  if (orgId) {
    return { clause: "organization_id = $1", params: [orgId] };
  }
  return { clause: "added_by = $1 AND organization_id IS NULL", params: [userId] };
}

app.get("/seeds", auth, async (req, res) => {
  try {
    const { clause, params } = seedOwnershipWhere(req.user.organization_id, req.user.id);
    const { rows } = await pool.query(`SELECT * FROM seeds WHERE ${clause} ORDER BY created_at DESC`, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if seed_id already exists within this org/user scope
app.get("/seeds/exists/:seedId", auth, async (req, res) => {
  try {
    const { clause, params } = seedOwnershipWhere(req.user.organization_id, req.user.id);
    const { rows } = await pool.query(
      `SELECT id FROM seeds WHERE seed_id = $${params.length + 1} AND ${clause} LIMIT 1`,
      [...params, req.params.seedId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lookup by seed_id string (for buyer QR scan — cross-org, any collector's seed)
app.get("/seeds/by-seed-id/:seedId", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM seeds WHERE seed_id = $1 LIMIT 1", [req.params.seedId]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single seed — scoped ownership check
app.get("/seeds/:id", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM seeds WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Seed not found" });
    const seed = rows[0];
    // Ownership: org members can see org seeds; buyers can see any seed (for passport)
    const { rows: roleRows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    const isBuyer = roleRows.some((r) => r.role === "buyer");
    const isAdmin = roleRows.some((r) => r.role === "admin");
    if (!isBuyer && !isAdmin) {
      const sameOrg = req.user.organization_id && seed.organization_id === req.user.organization_id;
      const ownedByUser = !seed.organization_id && seed.added_by === req.user.id;
      if (!sameOrg && !ownedByUser) return res.status(403).json({ error: "Forbidden" });
    }
    res.json(seed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/seeds", auth, validate(seedSchema), async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;

  const { seed_id, name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code } = req.body;

  try {
    // Duplicate check within scope
    const { clause, params } = seedOwnershipWhere(req.user.organization_id, req.user.id);
    const { rows: dup } = await pool.query(
      `SELECT id FROM seeds WHERE seed_id = $${params.length + 1} AND ${clause}`,
      [...params, seed_id]
    );
    if (dup.length) return res.status(409).json({ error: "This seed ID already exists in your collection" });

    const { rows } = await pool.query(
      `INSERT INTO seeds (seed_id, name, quantity, notes, image_url, latitude, longitude,
        street, city, country, zip_code, added_by, organization_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [seed_id, name, quantity || 0, notes, image_url, latitude, longitude,
        street, city, country, zip_code, req.user.id, req.user.organization_id]
    );

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1,$2,$3,$4)",
      [rows[0].id, "created", JSON.stringify(rows[0]), req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/seeds/lookup-ids", auth, async (req, res) => {
  const { seed_ids } = req.body;
  if (!Array.isArray(seed_ids) || !seed_ids.length) return res.json({});
  try {
    const safe = seed_ids.slice(0, 1000);
    const placeholders = safe.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await pool.query(`SELECT id, seed_id FROM seeds WHERE seed_id IN (${placeholders})`, safe);
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
      `UPDATE seeds SET name=COALESCE($1,name), quantity=COALESCE($2,quantity), notes=$3,
        image_url=COALESCE($4,image_url), latitude=$5, longitude=$6, street=$7, city=$8,
        country=$9, zip_code=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [name, quantity, notes, image_url, latitude, longitude, street, city, country, zip_code, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Seed not found" });

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1,$2,$3,$4)",
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
    if (!seedRows.length) return res.status(404).json({ error: "Seed not found" });
    const seed = seedRows[0];

    await pool.query("BEGIN");
    await pool.query("DELETE FROM buyer_seeds WHERE seed_id = $1", [req.params.id]);
    await pool.query("DELETE FROM order_items WHERE seed_id = $1", [req.params.id]);

    await pool.query(
      `INSERT INTO deleted_seeds (original_id, seed_id, name, quantity, notes, image_url,
        latitude, longitude, street, city, country, zip_code, added_by, organization_id,
        original_created_at, deleted_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now() + interval '90 days')`,
      [seed.id, seed.seed_id, seed.name, seed.quantity, seed.notes, seed.image_url,
        seed.latitude, seed.longitude, seed.street, seed.city, seed.country, seed.zip_code,
        seed.added_by, seed.organization_id, seed.created_at, req.user.id]
    );

    await pool.query("DELETE FROM seeds WHERE id = $1", [req.params.id]);

    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1,$2,$3,$4)",
      [seed.id, "deleted", JSON.stringify(seed), req.user.id]
    );
    await pool.query("COMMIT");
    res.json({ message: "Seed moved to recycle bin" });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

app.post("/seeds/batch-delete", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids required" });

  try {
    await pool.query("BEGIN");

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const { rows: seeds } = await pool.query(`SELECT * FROM seeds WHERE id IN (${placeholders})`, ids);

    if (seeds.length) {
      // Bulk remove references
      await pool.query(`DELETE FROM buyer_seeds WHERE seed_id IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM order_items WHERE seed_id IN (${placeholders})`, ids);

      // Bulk insert into deleted_seeds
      const insertValues = seeds.map((_, i) => {
        const base = i * 16;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16}, now() + interval '90 days')`;
      }).join(",");

      const insertParams = seeds.flatMap((s) => [
        s.id, s.seed_id, s.name, s.quantity, s.notes, s.image_url,
        s.latitude, s.longitude, s.street, s.city, s.country, s.zip_code,
        s.added_by, s.organization_id, s.created_at, req.user.id
      ]);

      await pool.query(
        `INSERT INTO deleted_seeds (original_id, seed_id, name, quantity, notes, image_url,
          latitude, longitude, street, city, country, zip_code, added_by, organization_id,
          original_created_at, deleted_by, expires_at) VALUES ${insertValues}`,
        insertParams
      );

      await pool.query(`DELETE FROM seeds WHERE id IN (${placeholders})`, ids);

      const historyValues = seeds.map((_, i) => `($${i*4+1},$${i*4+2},$${i*4+3},$${i*4+4})`).join(",");
      const historyParams = seeds.flatMap((s) => [s.id, "deleted", JSON.stringify(s), req.user.id]);
      await pool.query(
        `INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ${historyValues}`,
        historyParams
      );
    }

    await pool.query("COMMIT");
    res.json({ message: `${seeds.length} seed(s) moved to recycle bin` });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════

app.get("/orders", auth, async (req, res) => {
  try {
    const { rows: roleRows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    const isAdmin = roleRows.some((r) => r.role === "admin");
    const isCollector = roleRows.some((r) => r.role === "collector");

    let query, params;
    if (isAdmin) {
      query = "SELECT * FROM orders ORDER BY created_at DESC";
      params = [];
    } else if (isCollector) {
      // Collector sees orders for their org, or orders linked to them directly
      if (req.user.organization_id) {
        query = "SELECT * FROM orders WHERE organization_id = $1 ORDER BY created_at DESC";
        params = [req.user.organization_id];
      } else {
        query = "SELECT * FROM orders WHERE collector_id = $1 ORDER BY created_at DESC";
        params = [req.user.id];
      }
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
    const { rows: orderRows } = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
    if (!orderRows.length) return res.status(404).json({ error: "Order not found" });
    const order = orderRows[0];

    const { rows: roleRows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    const isAdmin = roleRows.some((r) => r.role === "admin");
    const isCollector = roleRows.some((r) => r.role === "collector");

    const canView = isAdmin
      || (isCollector && (order.collector_id === req.user.id || order.organization_id === req.user.organization_id))
      || order.buyer_id === req.user.id;
    if (!canView) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await pool.query(
      `SELECT oi.*, s.name as seed_name, s.seed_id as seed_code
       FROM order_items oi LEFT JOIN seeds s ON s.id = oi.seed_id
       WHERE oi.order_id = $1`, [req.params.id]
    );
    res.json(rows.map((r) => ({ ...r, seeds: r.seed_name ? { name: r.seed_name, seed_id: r.seed_code } : null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders/:id/history", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC", [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/orders", auth, validate(orderSchema), async (req, res) => {
  const { buyer_name, buyer_email, buyer_phone, buyer_address, delivery_method, notes, items } = req.body;

  try {
    // Determine collector_id: first item's seed owner, or the requesting user if they're a collector
    let collectorId = null;
    let orgId = null;

    if (items?.length) {
      const { rows: seedRows } = await pool.query("SELECT added_by, organization_id FROM seeds WHERE id = $1", [items[0].seed_id]);
      if (seedRows.length) {
        collectorId = seedRows[0].added_by;
        orgId = seedRows[0].organization_id;
      }
    }

    // If buyer is placing order and we didn't find a collector from seed, leave null
    const { rows: roleRows } = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    const isCollector = roleRows.some((r) => r.role === "collector");
    if (isCollector && !collectorId) collectorId = req.user.id;
    if (isCollector && !orgId) orgId = req.user.organization_id;

    const { rows } = await pool.query(
      `INSERT INTO orders (buyer_id, collector_id, organization_id, buyer_name, buyer_email,
        buyer_phone, buyer_address, delivery_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, collectorId, orgId, buyer_name, buyer_email, buyer_phone, buyer_address, delivery_method, notes]
    );
    const order = rows[0];

    if (items?.length) {
      const values = items.map((_, i) => `($1,$${i*2+2},$${i*2+3})`).join(",");
      const params = [order.id, ...items.flatMap((it) => [it.seed_id, it.quantity || 1])];
      await pool.query(`INSERT INTO order_items (order_id, seed_id, quantity) VALUES ${values}`, params);
    }

    await pool.query(
      "INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1,$2,$3)",
      [order.id, "requested", req.user.id]
    );

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/orders/:id/status", auth, validate(statusSchema), async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;
  const { status, notes, tracking_code, tracking_url } = req.body;

  try {
    const timestampField = { confirmed: "confirmed_at", shipped: "shipped_at", delivered: "delivered_at" }[status];
    const extraSet = timestampField ? `, ${timestampField} = now()` : "";
    const trackingSet = tracking_code !== undefined ? ", tracking_code = $3, tracking_url = $4" : "";

    let query, params;
    if (tracking_code !== undefined) {
      query = `UPDATE orders SET status=$1, updated_at=now()${extraSet}${trackingSet} WHERE id=$2 RETURNING *`;
      params = [status, req.params.id, tracking_code || null, tracking_url || null];
    } else {
      query = `UPDATE orders SET status=$1, updated_at=now()${extraSet} WHERE id=$2 RETURNING *`;
      params = [status, req.params.id];
    }

    const { rows } = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: "Order not found" });

    await pool.query(
      "INSERT INTO order_status_history (order_id, status, changed_by, notes, tracking_code) VALUES ($1,$2,$3,$4,$5)",
      [req.params.id, status, req.user.id, notes || null, tracking_code || null]
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
    if (!rowCount) return res.status(404).json({ error: "Order not found" });
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
    let query, params;
    if (req.user.organization_id) {
      query = "SELECT * FROM deleted_seeds WHERE organization_id = $1 ORDER BY deleted_at DESC";
      params = [req.user.organization_id];
    } else {
      query = "SELECT * FROM deleted_seeds WHERE (deleted_by = $1 OR added_by = $1) AND organization_id IS NULL ORDER BY deleted_at DESC";
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/bin/:id/restore", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;
  try {
    const { rows } = await pool.query("SELECT * FROM deleted_seeds WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found in bin" });
    const d = rows[0];

    await pool.query("BEGIN");
    await pool.query(
      `INSERT INTO seeds (id, seed_id, name, quantity, notes, image_url, latitude, longitude,
        street, city, country, zip_code, added_by, organization_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [d.original_id, d.seed_id, d.name, d.quantity, d.notes, d.image_url,
        d.latitude, d.longitude, d.street, d.city, d.country, d.zip_code,
        d.added_by, d.organization_id, d.original_created_at]
    );
    await pool.query("DELETE FROM deleted_seeds WHERE id = $1", [req.params.id]);
    await pool.query(
      "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1,$2,$3,$4)",
      [d.original_id, "restored", JSON.stringify(d), req.user.id]
    );
    await pool.query("COMMIT");
    res.json({ message: "Seed restored" });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

app.post("/bin/batch-restore", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids required" });

  try {
    await pool.query("BEGIN");
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await pool.query(`SELECT * FROM deleted_seeds WHERE id IN (${placeholders})`, ids);

    for (const d of rows) {
      await pool.query(
        `INSERT INTO seeds (id, seed_id, name, quantity, notes, image_url, latitude, longitude,
          street, city, country, zip_code, added_by, organization_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [d.original_id, d.seed_id, d.name, d.quantity, d.notes, d.image_url,
          d.latitude, d.longitude, d.street, d.city, d.country, d.zip_code,
          d.added_by, d.organization_id, d.original_created_at]
      );
      await pool.query(
        "INSERT INTO seed_history (seed_id, action, changes, performed_by) VALUES ($1,$2,$3,$4)",
        [d.original_id, "restored", JSON.stringify(d), req.user.id]
      );
    }
    await pool.query(`DELETE FROM deleted_seeds WHERE id IN (${placeholders})`, ids);
    await pool.query("COMMIT");
    res.json({ message: `${rows.length} seed(s) restored` });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

app.post("/bin/batch-delete", auth, async (req, res) => {
  if (!(await requireRole(req, res, ["admin", "collector"]))) return;
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids required" });
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    await pool.query(`DELETE FROM deleted_seeds WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} seed(s) permanently deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// BUYER SEEDS (persisted favorites in DB)
// ══════════════════════════════════════════════════════════

app.get("/buyer-seeds", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bs.id, bs.seed_id, bs.quantity, bs.assigned_at,
              s.id as s_id, s.seed_id as s_seed_id, s.name, s.image_url, s.country, s.city,
              s.street, s.zip_code, s.notes, s.latitude, s.longitude,
              s.created_at as s_created_at, s.quantity as s_quantity
       FROM buyer_seeds bs
       LEFT JOIN seeds s ON s.id = bs.seed_id
       WHERE bs.buyer_id = $1
       ORDER BY bs.assigned_at DESC`,
      [req.user.id]
    );
    const result = rows.map((r) => ({
      id: r.id, seed_id: r.seed_id, quantity: r.quantity, assigned_at: r.assigned_at,
      seeds: r.s_id ? {
        id: r.s_id, seed_id: r.s_seed_id, name: r.name, image_url: r.image_url,
        country: r.country, city: r.city, street: r.street, zip_code: r.zip_code,
        notes: r.notes, latitude: r.latitude, longitude: r.longitude,
        created_at: r.s_created_at, quantity: r.s_quantity,
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
      "INSERT INTO buyer_seeds (buyer_id, seed_id, quantity, notes) VALUES ($1,$2,$3,$4) ON CONFLICT (buyer_id, seed_id) DO UPDATE SET quantity = EXCLUDED.quantity RETURNING *",
      [req.user.id, seed_id, quantity || 1, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/buyer-seeds/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM buyer_seeds WHERE id = $1 AND buyer_id = $2", [req.params.id, req.user.id]);
    res.json({ message: "Removed from saved seeds" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/buyer-seeds/assigned-uuids", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT seed_id FROM buyer_seeds WHERE buyer_id = $1", [req.user.id]);
    res.json(rows.map((r) => r.seed_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// FILE UPLOAD
// ══════════════════════════════════════════════════════════

app.post("/upload/seed-image", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    if (r2Client && process.env.R2_BUCKET) {
      const ext = path.extname(req.file.originalname);
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET, Key: key,
        Body: req.file.buffer, ContentType: req.file.mimetype,
      }));
      const publicBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;
      res.json({ url: `${publicBase}/${key}` });
    } else {
      const ext = path.extname(req.file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
      res.json({ url: `https://${req.get("host")}/uploads/${filename}` });
    }
  } catch (err) {
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// ── Global Error Handler ────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  if (err.message === "Not allowed by CORS") return res.status(403).json({ error: "CORS error" });
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Indomitum API running on port ${PORT}`));
