const db = require('../src/config/db');

const migrate = async () => {
  try {
    console.log('Starting migration...');

    // Update users table
    console.log('Updating users table...');
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(100)`
    );
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`
    );

    // Update role constraint
    console.log('Updating role constraint in users table...');
    // Note: We need to drop the old constraint and add the new one.
    // The name of the constraint might be users_role_check if it was created as in init_db.js
    try {
      await db.query(
        `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`
      );
    } catch (e) {
      console.log(
        'Wait: Could not drop constraint (might have a different name). Attempting to proceed...'
      );
    }
    await db.query(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('patient', 'doctor', 'nurse', 'admin'))`
    );

    // Update patients table
    console.log('Updating patients table...');
    await db.query(
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT`
    );
    await db.query(
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`
    );

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    process.exit(0);
  }
};

migrate();
