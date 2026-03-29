// src/routes/reservations.routes.js
import express from "express";
import pool from "../db/pool.js";
import { logEvent } from "../services/log.service.js";
import { requireAuth as authMiddleware } from "../../middleware/auth.middleware.js";

const router = express.Router();

/* =====================================================
   CREATE
   POST /api/reservations
===================================================== */
router.post("/", authMiddleware, async (req, res) => {
  const actorUserId = null;

  const userId = req.user.id;

  const {
    resourceId,
    startTime,
    endTime,
    note,
    status
  } = req.body;

  try {
    const insertSql = `
      INSERT INTO reservations
      (resource_id, user_id, start_time, end_time, note, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [
      Number(resourceId),
      Number(userId),
      startTime,
      endTime,
      note || null,
      status || "active"
    ];

    const { rows } = await pool.query(insertSql, params);

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation created (ID ${rows[0].id})`,
      entityType: "reservation",
      entityId: rows[0].id,
    });

    return res.status(201).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("DB insert failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
});


/* =====================================================
   READ ALL
   GET /api/reservations
===================================================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT
        r.*,
        u.email AS user_email,
        res.name AS resource_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      WHERE r.user_id = $1
      ORDER BY r.start_time DESC
    `;

    const { rows } = await pool.query(sql, [userId]);

    return res.status(200).json({ ok: true, data: rows });

  } catch (err) {
    console.error("READ OWN failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
});


/* =====================================================
   READ ONE
   GET /api/reservations/:id
===================================================== */
router.get("/:id", authMiddleware, async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  try {

    const sql = `
      SELECT
        r.*,
        u.email AS user_email,
        res.name AS resource_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      WHERE r.id = $1 AND r.user_id = $2
    `;

    const userId = req.user.id;

    const { rows } = await pool.query(sql, [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    return res.status(200).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("READ ONE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   UPDATE
   PUT /api/reservations/:id
===================================================== */
router.put("/:id", authMiddleware, async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  const actorUserId = null;

  const {
    resourceId,
    startTime,
    endTime,
    note,
    status
  } = req.body;

  try {

    const sql = `
      UPDATE reservations
      SET resource_id = $1,
          start_time = $2,
          end_time = $3,
          note = $4,
          status = $5
      WHERE id = $6
      RETURNING *
    `;

    const params = [
      Number(resourceId),
      startTime,
      endTime,
      note,
      status || "active",
      id
    ];

    const { rows } = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation updated (ID ${id})`,
      entityType: "reservation",
      entityId: id,
    });

    return res.status(200).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("UPDATE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   DELETE
   DELETE /api/reservations/:id
===================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  const actorUserId = null;

  try {

    const userId = req.user.id;

    const result = await pool.query(
      "DELETE FROM reservations WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation deleted (ID ${id})`,
      entityType: "reservation",
      entityId: id,
    });

    return res.status(204).send();

  } catch (err) {
    console.error("DELETE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});

export default router;