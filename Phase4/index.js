require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.IPORT || 5000;
const path = require("path");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");

// --- Middleware ---
app.use(express.json());

// Serve public folder
app.use(express.static(path.join(__dirname, "public")));

// --- Views ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/resources", (req, res) => res.sendFile(path.join(__dirname, "public", "resources.html")));

// --- DB Pool ---
const pool = new Pool({
  host: process.env.PGHOST || "database",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
});

// --- Wait for DB ---
async function waitForDb(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connection established!");
      return;
    } catch (err) {
      console.log(`⚠️ DB not ready, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error("❌ Could not connect to database. Exiting.");
  process.exit(1);
}

// --- Validation ---
const resourceValidators = [
  body("action").exists().isIn(["create"]),
  body("resourceName").exists().isString().isLength({ min: 3, max: 100 }).trim().escape(),
  body("resourceDescription").exists().isString().isLength({ min: 10, max: 50 }).trim(),
  body("resourceAvailable").exists().isBoolean().toBoolean(),
  body("resourcePrice").exists().isFloat({ min: 0 }).toFloat(),
  body("resourcePriceUnit").exists().isString().isIn(["hour", "day"]),
];

// --- Routes ---
app.post("/api/resources", resourceValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

  const { action, resourceName, resourceDescription, resourceAvailable, resourcePrice, resourcePriceUnit } = req.body;

  const insertSql = `
    INSERT INTO resources (resourcename, resourcedescription, resourceavailable, resourceprice, resourcepriceunit, created_at)
    VALUES ($1,$2,$3,$4,$5, NOW())
    RETURNING *;
  `;
  try {
    const { rows } = await pool.query(insertSql, [resourceName, resourceDescription, resourceAvailable, resourcePrice, resourcePriceUnit]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("DB insert failed:", err.message);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});

// --- Start server after DB ready ---
waitForDb().then(() => {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
});