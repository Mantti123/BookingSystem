// src/routes/resources.routes.js
import express from "express";
import pool from "../db/pool.js";
import { resourceValidators } from "../validators/resource.validators.js";
import { validationResult } from "express-validator";
import timestamp from "../utils/timestamp.js";
import { logEvent } from "../services/log.service.js";

const router = express.Router();

// POST /api/resources -> create (minimal) + duplicate check
router.post("/", resourceValidators, async (req, res) => {
  const actorUserId = null;

  // -----------------------------
  // 1) Validate input (400)
  // -----------------------------
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const mappedErrors = errors.array().map((e) => ({ field: e.path, msg: e.msg }));
    const errText = mappedErrors.map((e) => `${e.field}: ${e.msg}`).join("; ");

    // Respond first
    res.status(400).json({
      ok: false,
      errors: mappedErrors,
    });

    // Log after response (must not break the request)
    logEvent({
      actorUserId,
      message: `RESOURCE_CREATE_FAILED_VALIDATION (400): ${errText}`,
      entityType: "resource",
      entityId: null,
    }).catch((e) => console.error("Logging failed (validation):", e?.message || e));

    return;
  }

  // -----------------------------
  // 2) Read body
  // -----------------------------
  const {
    action = "",
    resourceName = "",
    resourceDescription = "",
    resourceAvailable = false,
    resourcePrice = 0,
    resourcePriceUnit = "",
  } = req.body;

  console.log("The client's POST request ", `[${timestamp()}]`);
  console.log("------------------------------");
  console.log("Action ➡️ ", action);
  console.log("Name ➡️ ", resourceName);
  console.log("Description ➡️ ", resourceDescription);
  console.log("Availability ➡️ ", resourceAvailable);
  console.log("Price ➡️ ", resourcePrice);
  console.log("Price unit ➡️ ", resourcePriceUnit);
  console.log("------------------------------");

  if (action !== "create") {
    return res
      .status(400)
      .json({ ok: false, error: "Only create is implemented right now" });
  }

  // -----------------------------
  // 3) Insert (201) or duplicate (409)
  // -----------------------------
  try {
    const insertSql = `
      INSERT INTO resources (name, description, available, price, price_unit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, available, price, price_unit, created_at
    `;

    const params = [
      resourceName,
      resourceDescription,
      Boolean(resourceAvailable),
      Number(resourcePrice),
      resourcePriceUnit,
    ];

    const { rows } = await pool.query(insertSql, params);
    const created = rows[0];

    // Respond first
    res.status(201).json({ ok: true, data: created });

    // Log after response
    logEvent({
      actorUserId,
      message: `RESOURCE_CREATED: id=${created.id}, name="${created.name}", price=${created.price}, unit="${created.price_unit}"`,
      entityType: "resource",
      entityId: created.id,
    }).catch((e) => console.error("Logging failed (success):", e?.message || e));

    return;
  } catch (err) {
    // PostgreSQL unique violation error code is 23505
    if (err && err.code === "23505") {
      // Respond first
      res.status(409).json({
        ok: false,
        error: "Duplicate resourceName",
        details: "A resource with the same name already exists.",
      });

      // Log after response
      logEvent({
        actorUserId,
        message: `RESOURCE_CREATE_BLOCKED_DUPLICATE (409): name="${resourceName}"`,
        entityType: "resource",
        entityId: null,
      }).catch((e) => console.error("Logging failed (duplicate):", e?.message || e));

      return;
    }

    console.error("DB insert failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
});

export default router;
``