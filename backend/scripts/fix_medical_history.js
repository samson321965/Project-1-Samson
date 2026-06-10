/**
 * fix_medical_history.js
 *
 * One-time migration script to fix medical_history records that were incorrectly
 * saved with condition = 'Reported on Registration' and the real text in notes.
 *
 * After running this script, the `condition` column will contain the real patient
 * history text so all dashboards (patient, doctor, admin) can display it correctly.
 *
 * Run with: node scripts/fix_medical_history.js
 */

const db = require('../src/config/db');

const fixMedicalHistory = async () => {
  try {
    console.log('Connecting to database...');

    // Find all broken records: condition is the generic label but notes has real text
    const brokenRecords = await db.query(`
      SELECT id, patient_id, condition, notes
      FROM medical_history
      WHERE condition = 'Reported on Registration'
        AND notes IS NOT NULL
        AND notes <> ''
        AND notes NOT LIKE '%Added via script%'
    `);

    console.log(
      `Found ${brokenRecords.rows.length} medical history records to fix.`
    );

    let fixed = 0;
    for (const row of brokenRecords.rows) {
      // Move the real text from `notes` into `condition`
      await db.query(
        `UPDATE medical_history
         SET condition = $1, notes = 'Reported on Registration'
         WHERE id = $2`,
        [row.notes.substring(0, 255), row.id]
      );
      console.log(
        `  Fixed record ID ${row.id} for patient_id ${row.patient_id}: "${row.notes.substring(0, 60)}..."`
      );
      fixed++;
    }

    console.log(`\nDone! Fixed ${fixed} medical history record(s).`);
    console.log(
      'Medical history will now display correctly in all dashboards.'
    );
  } catch (error) {
    console.error('Error fixing medical history:', error);
  } finally {
    process.exit(0);
  }
};

fixMedicalHistory();
