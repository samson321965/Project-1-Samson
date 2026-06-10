const db = require('../src/config/db');

const seedData = async () => {
  try {
    console.log('Starting database seeding...');

    // First, allow 'nurse' as a role
    await db.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('patient', 'doctor', 'admin', 'nurse'));
    `);

    // Clean up existing data just in case
    await db.query(
      `TRUNCATE TABLE appointments, doctor_notes, prescriptions, allergies, medical_history, patients, users RESTART IDENTITY CASCADE;`
    );

    // 1. Insert Users (Admin, Doctor, Nurse, Patients)
    // Note: For dummy data, we'll use a simple placeholder for password_hash
    const usersQuery = `
      INSERT INTO users (username, password_hash, role, full_name, email)
      VALUES 
        ('admin1', 'admin123', 'admin', 'System Admin', 'admin@health.com'),
        ('doc_smith', 'doctor123', 'doctor', 'Dr. Sarah Smith', 'drsmith@health.com'),
        ('doc_jones', 'doctor123', 'doctor', 'Dr. Mike Jones', 'drlee@health.com'),
        ('nurse_joy', 'nurse123', 'nurse', 'Nurse Joy', 'echen@health.com'),
        ('pat_doe', 'patient123', 'patient', 'John Doe', 'john.doe@example.com'),
        ('pat_lee', 'patient123', 'patient', 'Amanda Lee', 'amanda.lee@example.com')
      RETURNING id, username, role;
    `;
    const usersResult = await db.query(usersQuery);

    // Map created users to their IDs for relationships
    const userMap = {};
    usersResult.rows.forEach((u) => {
      userMap[u.username] = u.id;
    });

    // 2. Insert Patients Details
    await db.query(
      `
      INSERT INTO patients (user_id, date_of_birth, contact_number, blood_type, emergency_contact_name, emergency_contact_number)
      VALUES 
        ($1, '1985-06-15', '555-0101', 'O+', 'Jane Doe', '555-0102'),
        ($2, '1992-11-23', '555-0201', 'A-', 'Robert Lee', '555-0202')
    `,
      [userMap['pat_doe'], userMap['pat_lee']]
    );

    // 3. Insert Medical History
    await db.query(
      `
      INSERT INTO medical_history (patient_id, condition, date_diagnosed, notes)
      VALUES 
        ($1, 'Hypertension', '2019-03-10', 'Controlled with medication'),
        ($1, 'Type 2 Diabetes', '2021-08-15', 'Diet controlled'),
        ($2, 'Asthma', '2005-04-20', 'Uses inhaler as needed')
    `,
      [userMap['pat_doe'], userMap['pat_lee']]
    );

    // 4. Insert Allergies
    await db.query(
      `
      INSERT INTO allergies (patient_id, allergy_name, severity)
      VALUES 
        ($1, 'Penicillin', 'Severe'),
        ($2, 'Peanuts', 'Moderate'),
        ($2, 'Pollen', 'Mild')
    `,
      [userMap['pat_doe'], userMap['pat_lee']]
    );

    // 5. Insert Prescriptions
    await db.query(
      `
      INSERT INTO prescriptions (patient_id, doctor_id, medication, dosage, frequency, start_date, end_date)
      VALUES 
        ($1, $3, 'Lisinopril', '10mg', 'Once daily', '2023-01-01', '2024-01-01'),
        ($2, $4, 'Albuterol Inhaler', '90mcg', 'As needed', '2023-05-15', '2024-05-15')
    `,
      [
        userMap['pat_doe'],
        userMap['pat_lee'],
        userMap['doc_smith'],
        userMap['doc_jones'],
      ]
    );

    // 6. Insert Doctor Notes
    await db.query(
      `
      INSERT INTO doctor_notes (patient_id, doctor_id, note_text)
      VALUES 
        ($1, $3, 'Patient is doing well. Blood pressure is stable. Advised to continue current diet.'),
        ($2, $4, 'Asthma symptoms have been mild recently. Refilled inhaler prescription.')
    `,
      [
        userMap['pat_doe'],
        userMap['pat_lee'],
        userMap['doc_smith'],
        userMap['doc_jones'],
      ]
    );

    // 7. Insert Appointments
    await db.query(
      `
      INSERT INTO appointments (patient_id, doctor_id, appointment_date, status)
      VALUES 
        ($1, $3, '2026-05-01 10:00:00', 'scheduled'),
        ($2, $4, '2026-05-02 14:30:00', 'scheduled'),
        ($1, $4, '2026-04-10 09:00:00', 'completed')
    `,
      [
        userMap['pat_doe'],
        userMap['pat_lee'],
        userMap['doc_smith'],
        userMap['doc_jones'],
      ]
    );

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
};

seedData();
