const db = require('../src/config/db');

const updateExistingPatients = async () => {
  try {
    console.log('Connecting to database...');

    // 1. Get all patients
    const result = await db.query('SELECT user_id FROM patients');
    const patients = result.rows;

    console.log(
      `Found ${patients.length} patients. Updating missing records...`
    );

    let allergiesAdded = 0;
    let medicalHistoryAdded = 0;

    for (const patient of patients) {
      const patientId = patient.user_id;

      // Check if they have allergies
      const allergiesResult = await db.query(
        'SELECT id FROM allergies WHERE patient_id = $1',
        [patientId]
      );
      if (allergiesResult.rows.length === 0) {
        // Insert a dummy allergy
        await db.query(
          'INSERT INTO allergies (patient_id, allergy_name, severity) VALUES ($1, $2, $3)',
          [patientId, 'Dust Mites (Added via script)', 'Unknown']
        );
        allergiesAdded++;
      }

      // Check if they have medical history
      const historyResult = await db.query(
        'SELECT id FROM medical_history WHERE patient_id = $1',
        [patientId]
      );
      if (historyResult.rows.length === 0) {
        // Insert dummy medical history
        await db.query(
          'INSERT INTO medical_history (patient_id, condition, date_diagnosed, notes) VALUES ($1, $2, CURRENT_DATE, $3)',
          [
            patientId,
            'Reported on Registration',
            'General physical checkup history (Added via script)',
          ]
        );
        medicalHistoryAdded++;
      }
    }

    console.log(
      `Update complete! Added ${allergiesAdded} allergies and ${medicalHistoryAdded} medical history records.`
    );
  } catch (error) {
    console.error('Error updating existing patients:', error);
  } finally {
    process.exit(0);
  }
};

updateExistingPatients();
