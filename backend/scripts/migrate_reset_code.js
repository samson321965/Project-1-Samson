const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('Adding reset_code columns to users table...');
    await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_code VARCHAR(10),
            ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMP;
        `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
