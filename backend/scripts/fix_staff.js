const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixStaff() {
  try {
    console.log('Converting staff table to view...');

    // Drop existing table
    await pool.query('DROP TABLE IF EXISTS staff CASCADE');

    // Ensure roles exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL
      )
    `);

    await pool.query(`
      INSERT INTO roles (role_name) 
      VALUES ('Admin'), ('Doctor'), ('Nurse'), ('Patient')
      ON CONFLICT (role_name) DO NOTHING
    `);

    // Create view
    await pool.query(`
      CREATE OR REPLACE VIEW staff AS
      SELECT 
          u.id AS staff_id, 
          u.id AS user_id, 
          r.role_id, 
          u.phone AS phone_number, 
          u.created_at,
          u.full_name,
          u.email,
          u.role AS user_role,
          u.specialty
      FROM users u
      LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name)
      WHERE u.role IN ('doctor', 'nurse', 'admin')
    `);

    console.log(
      'Done! You can now run "select * from staff" and see the results.'
    );

    const check = await pool.query('SELECT * FROM staff');
    console.log(`Staff count: ${check.rowCount}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixStaff();
