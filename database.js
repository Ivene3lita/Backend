const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Enable SSL for production (required for Neon and most cloud databases)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        student_id VARCHAR(50) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add is_admin column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='is_admin') THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);

    // Create books table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(50) UNIQUE,
        genre VARCHAR(100),
        publication_year INTEGER,
        publisher VARCHAR(255),
        description TEXT,
        image_url VARCHAR(500),
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add image_url column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='books' AND column_name='image_url') THEN
          ALTER TABLE books ADD COLUMN image_url VARCHAR(500);
        END IF;
      END $$;
    `);

    // Create borrowings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS borrowings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        borrowed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP NOT NULL,
        returned_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON borrowings(user_id);
      CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON borrowings(book_id);
      CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Test database connection
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

module.exports = {
  pool,
  initializeDatabase,
  testConnection
};

