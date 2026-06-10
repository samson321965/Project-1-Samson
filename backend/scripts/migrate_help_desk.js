const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('Creating help_desk_requests table...');
    await db.query(`
            CREATE TABLE IF NOT EXISTS help_desk_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) DEFAULT 'Password Reset Request',
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                admin_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
