const express = require('express');
const cors = require('cors');
const { initializeDatabase, testConnection } = require('./database');
const booksRouter = require('./routes/books');
const authRouter = require('./routes/auth');
const borrowingsRouter = require('./routes/borrowings');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow frontend domain from environment or all origins in development
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/borrowings', borrowingsRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Digital Library Catalogue API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Test connection
    await testConnection();
    
    // Start listening - use 0.0.0.0 for Render deployment
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API endpoints available at /api/books`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

