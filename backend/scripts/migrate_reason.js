const db = require('../src/config/db');

const migrate = async () => {
  try {
    await db.query(
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason VARCHAR(255) DEFAULT 'Follow-up'`
    );
    console.log('Migration done: reason column added to appointments.');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    process.exit(0);
  }
};

migrate();
