const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/appointments — book a new appointment
router.post('/', async (req, res) => {
  const { patientId, doctorId, date, time, reason } = req.body;

  if (!patientId || !doctorId || !date || !time) {
    return res
      .status(400)
      .json({ message: 'patientId, doctorId, date, and time are required.' });
  }

  try {
    // Combine date + time into a single timestamp
    const appointmentDate = new Date(`${date}T${time}:00`);

    const result = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason, status)
       VALUES ($1, $2, $3, $4, 'scheduled')
       RETURNING *`,
      [patientId, doctorId, appointmentDate, reason || 'General consultation']
    );

    const row = result.rows[0];
    const dateObj = new Date(row.appointment_date);

    res.status(201).json({
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      date: dateObj.toISOString().split('T')[0],
      time: dateObj.toISOString().split('T')[1].substring(0, 5),
      reason: row.reason,
      status: row.status,
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: 'Server error while booking appointment' });
  }
});

// PATCH /api/appointments/:id/cancel — cancel an appointment
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

  try {
    await db.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1`,
      [id]
    );
    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res
      .status(500)
      .json({ message: 'Server error while cancelling appointment' });
  }
});

// PATCH /api/appointments/:id/status — update an appointment status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

  try {
    await db.query(`UPDATE appointments SET status = $1 WHERE id = $2`, [
      status,
      id,
    ]);
    res.json({ message: 'Appointment status updated' });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res
      .status(500)
      .json({ message: 'Server error while updating appointment status' });
  }
});

// GET /api/appointments/patient/:id — get all appointments for a patient
router.get('/patient/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

  try {
    const result = await db.query(
      `SELECT a.*, u.full_name AS doctor_name
       FROM appointments a
       JOIN users u ON a.doctor_id = u.id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC`,
      [id]
    );

    const formatted = result.rows.map((row) => {
      const dateObj = new Date(row.appointment_date);
      return {
        id: row.id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        doctorName: row.doctor_name,
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toISOString().split('T')[1].substring(0, 5),
        reason: row.reason,
        status: row.status,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/appointments/:id — full update an appointment (Requirement 3 & 5)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { date, time, reason } = req.body;
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
  if (!date || !time)
    return res
      .status(400)
      .json({ message: 'Date and time are required for PUT update' });

  try {
    const appointmentDate = new Date(`${date}T${time}:00`);
    await db.query(
      `UPDATE appointments SET appointment_date = $1, reason = $2 WHERE id = $3`,
      [appointmentDate, reason, id]
    );
    res.json({ message: 'Appointment fully updated via PUT' });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res
      .status(500)
      .json({ message: 'Server error while updating appointment' });
  }
});

// DELETE /api/appointments/:id — delete an appointment (Requirement 3 & 5)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

  try {
    await db.query(`DELETE FROM appointments WHERE id = $1`, [id]);
    res.json({ message: 'Appointment permanently deleted via DELETE' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res
      .status(500)
      .json({ message: 'Server error while deleting appointment' });
  }
});

module.exports = router;
