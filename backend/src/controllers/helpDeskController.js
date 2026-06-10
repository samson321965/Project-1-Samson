const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.createRequest = async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ message: 'Email and message are required.' });
  }

  try {
    // Check if user exists
    const userQuery = 'SELECT id FROM users WHERE email = $1 AND role = $2';
    const userResult = await db.query(userQuery, [email, 'patient']);

    const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;

    const query = `
      INSERT INTO help_desk_requests (user_id, email, subject, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [
      userId,
      email,
      subject || 'Password Reset Request',
      message,
    ]);

    res.status(201).json({
      success: true,
      message: 'Your request has been submitted to the Help Desk.',
      request: result.rows[0],
    });
  } catch (error) {
    console.error('Create help desk request error:', error);
    res.status(500).json({ message: 'Server error while submitting request.' });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const query = `
      SELECT h.*, u.full_name 
      FROM help_desk_requests h
      LEFT JOIN users u ON h.user_id = u.id
      ORDER BY h.created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ message: 'Server error while fetching requests.' });
  }
};

exports.respondToRequest = async (req, res) => {
  const { requestId, adminResponse, resetPassword, newPassword } = req.body;

  if (!requestId || !adminResponse) {
    return res
      .status(400)
      .json({ message: 'Request ID and response message are required.' });
  }

  try {
    // 1. Update the request status and response
    const updateQuery = `
      UPDATE help_desk_requests 
      SET admin_response = $1, status = 'resolved' 
      WHERE id = $2 
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [
      adminResponse,
      requestId,
    ]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    const request = updateResult.rows[0];

    // 2. If admin wants to reset password
    if (resetPassword && newPassword && request.user_id) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        hashedPassword,
        request.user_id,
      ]);
    }

    res.json({
      success: true,
      message: 'Response sent successfully.',
      request: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    res
      .status(500)
      .json({ message: 'Server error while responding to request.' });
  }
};

exports.getRequestStatus = async (req, res) => {
  const { email } = req.params;

  try {
    const query =
      'SELECT * FROM help_desk_requests WHERE email = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [email]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get request status error:', error);
    res.status(500).json({ message: 'Server error while fetching status.' });
  }
};
