const db = require('../config/db');

exports.getPatientRecords = async (req, res) => {
  const patientId = req.params.id;

  if (isNaN(patientId)) {
    return res
      .status(400)
      .json({ message: 'Invalid patient ID. ID must be a number.' });
  }

  try {
    // 1. Fetch patient details
    const patientQuery = `
      SELECT p.*, u.full_name, u.email 
      FROM patients p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = $1
    `;
    const patientResult = await db.query(patientQuery, [patientId]);

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patientData = patientResult.rows[0];

    // 2. Fetch medical history
    const historyResult = await db.query(
      'SELECT * FROM medical_history WHERE patient_id = $1',
      [patientId]
    );

    // 3. Fetch allergies
    const allergiesResult = await db.query(
      'SELECT * FROM allergies WHERE patient_id = $1',
      [patientId]
    );

    // 4. Fetch prescriptions
    const prescriptionsResult = await db.query(
      `
      SELECT pr.*, u.full_name as prescribed_by 
      FROM prescriptions pr
      LEFT JOIN users u ON pr.doctor_id = u.id
      WHERE pr.patient_id = $1
    `,
      [patientId]
    );

    // 5. Fetch doctor notes
    const notesResult = await db.query(
      `
      SELECT dn.*, u.full_name as written_by 
      FROM doctor_notes dn
      LEFT JOIN users u ON dn.doctor_id = u.id
      WHERE dn.patient_id = $1
      ORDER BY dn.created_at DESC
    `,
      [patientId]
    );

    // Combine all data into the format expected by the frontend
    const fullRecord = {
      ...patientData,
      medicalHistory: historyResult.rows.map((row) => row.condition), // or map full object depending on UI needs
      allergies: allergiesResult.rows.map((row) => row.allergy_name),
      prescriptions: prescriptionsResult.rows.map((row) => ({
        id: row.id,
        medication: row.medication,
        dosage: row.dosage,
        frequency: row.frequency,
        startDate: row.start_date,
        endDate: row.end_date,
        prescribedBy: row.prescribed_by || 'Unknown',
      })),
      doctorNotes: notesResult.rows.map((row) => row.note_text),
    };

    res.json(fullRecord);
  } catch (error) {
    console.error('Error fetching patient records:', error);
    res.status(500).json({ message: 'Server error while fetching records' });
  }
};

exports.addPrescription = async (req, res) => {
  const patientId = req.params.id;
  const { doctorId, medication, dosage, frequency, startDate, endDate } =
    req.body;

  if (isNaN(patientId)) {
    return res.status(400).json({ message: 'Invalid patient ID.' });
  }

  try {
    const query = `
      INSERT INTO prescriptions (patient_id, doctor_id, medication, dosage, frequency, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      patientId,
      doctorId,
      medication,
      dosage,
      frequency,
      startDate,
      endDate,
    ];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Prescription added successfully',
      prescription: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding prescription:', error);
    res.status(500).json({ message: 'Server error while adding prescription' });
  }
};

exports.addNote = async (req, res) => {
  const patientId = req.params.id;
  const { doctorId, noteText } = req.body;

  if (isNaN(patientId)) {
    return res.status(400).json({ message: 'Invalid patient ID.' });
  }

  try {
    const query = `
      INSERT INTO doctor_notes (patient_id, doctor_id, note_text)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [patientId, doctorId, noteText];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Note added successfully',
      note: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error while adding note' });
  }
};
