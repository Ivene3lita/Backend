const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET all books
router.get('/', async (req, res) => {
  try {
    const { search, genre, available } = req.query;
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR author ILIKE $${paramCount} OR isbn ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (genre) {
      paramCount++;
      query += ` AND genre = $${paramCount}`;
      params.push(genre);
    }

    if (available !== undefined) {
      paramCount++;
      query += ` AND available = $${paramCount}`;
      params.push(available === 'true');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET book by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new book (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, author, isbn, genre, publication_year, publisher, description, available } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const result = await pool.query(
      `INSERT INTO books (title, author, isbn, genre, publication_year, publisher, description, available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, author, isbn || null, genre || null, publication_year || null, publisher || null, description || null, available !== undefined ? available : true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating book:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'ISBN already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update book (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, isbn, genre, publication_year, publisher, description, available } = req.body;

    const result = await pool.query(
      `UPDATE books 
       SET title = COALESCE($1, title),
           author = COALESCE($2, author),
           isbn = COALESCE($3, isbn),
           genre = COALESCE($4, genre),
           publication_year = COALESCE($5, publication_year),
           publisher = COALESCE($6, publisher),
           description = COALESCE($7, description),
           available = COALESCE($8, available),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [title, author, isbn, genre, publication_year, publisher, description, available, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating book:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'ISBN already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE book (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully', book: result.rows[0] });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all genres
router.get('/meta/genres', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre');
    res.json(result.rows.map(row => row.genre));
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

