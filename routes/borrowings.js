const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET all borrowings for the logged-in user
router.get('/my-books', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        b.id as borrowing_id,
        b.borrowed_date,
        b.due_date,
        b.returned_date,
        b.status,
        bk.id as book_id,
        bk.title,
        bk.author,
        bk.isbn,
        bk.genre
      FROM borrowings b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.user_id = $1
      ORDER BY b.borrowed_date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user borrowings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all borrowings (for admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only admins can see all borrowings
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT 
        b.id as borrowing_id,
        b.borrowed_date,
        b.due_date,
        b.returned_date,
        b.status,
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.student_id,
        bk.id as book_id,
        bk.title,
        bk.author,
        bk.isbn
      FROM borrowings b
      JOIN users u ON b.user_id = u.id
      JOIN books bk ON b.book_id = bk.id
      ORDER BY b.borrowed_date DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all borrowings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST borrow a book
router.post('/borrow', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { book_id } = req.body;

    if (!book_id) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    // Check if book exists and is available
    const bookResult = await pool.query('SELECT * FROM books WHERE id = $1', [book_id]);
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];

    if (!book.available) {
      return res.status(400).json({ error: 'Book is not available' });
    }

    // Check if user already has this book borrowed
    const existingBorrowing = await pool.query(
      'SELECT * FROM borrowings WHERE user_id = $1 AND book_id = $2 AND status = $3',
      [userId, book_id, 'borrowed']
    );

    if (existingBorrowing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already borrowed this book' });
    }

    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Create borrowing record
    const borrowingResult = await pool.query(
      `INSERT INTO borrowings (user_id, book_id, due_date, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, book_id, dueDate, 'borrowed']
    );

    // Update book availability
    await pool.query('UPDATE books SET available = false WHERE id = $1', [book_id]);

    res.status(201).json({
      message: 'Book borrowed successfully',
      borrowing: borrowingResult.rows[0]
    });
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST return a book
router.post('/return/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const borrowingId = req.params.id;

    // Get borrowing record
    const borrowingResult = await pool.query(
      'SELECT * FROM borrowings WHERE id = $1 AND user_id = $2',
      [borrowingId, userId]
    );

    if (borrowingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Borrowing record not found' });
    }

    const borrowing = borrowingResult.rows[0];

    if (borrowing.status === 'returned') {
      return res.status(400).json({ error: 'Book has already been returned' });
    }

    // Update borrowing status
    const returnDate = new Date();
    let status = 'returned';
    
    // Check if overdue
    if (new Date(borrowing.due_date) < returnDate) {
      status = 'overdue';
    }

    await pool.query(
      `UPDATE borrowings 
       SET returned_date = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [returnDate, status, borrowingId]
    );

    // Update book availability
    await pool.query('UPDATE books SET available = true WHERE id = $1', [borrowing.book_id]);

    res.json({
      message: 'Book returned successfully',
      borrowing: {
        ...borrowing,
        returned_date: returnDate,
        status: status
      }
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET borrowing by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const borrowingId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        b.*,
        bk.title,
        bk.author,
        bk.isbn,
        u.username,
        u.first_name,
        u.last_name
      FROM borrowings b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1`,
      [borrowingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Borrowing record not found' });
    }

    const borrowing = result.rows[0];

    // Users can only see their own borrowings unless they're admin
    if (!req.user.is_admin && borrowing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(borrowing);
  } catch (error) {
    console.error('Error fetching borrowing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

