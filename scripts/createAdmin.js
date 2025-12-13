const bcrypt = require('bcrypt');
const { pool } = require('../database');
require('dotenv').config();

async function createAdmin() {
  try {
    const username = 'admin';
    const email = 'admin@library.com';
    const password = 'admin12';
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists. Updating to admin...');
      // Update existing user to admin
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true, first_name = $2, last_name = $3 WHERE username = $4',
        [hashedPassword, firstName, lastName, username]
      );
      console.log('✅ Admin user updated successfully!');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO users (username, email, password, first_name, last_name, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, is_admin`,
      [username, email, hashedPassword, firstName, lastName, true]
    );

    console.log('✅ Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    console.log(`Admin Status: ${result.rows[0].is_admin}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Initialize database first, then create admin
async function init() {
  try {
    const { initializeDatabase, testConnection } = require('../database');
    await initializeDatabase();
    const connected = await testConnection();
    if (connected) {
      await createAdmin();
    } else {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  }
}

init();

