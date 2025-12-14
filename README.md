# Digital Library Catalogue System - Backend

Backend API for the Digital Library Catalogue System built with Node.js, Express, and PostgreSQL.

## 🛠️ Tech Stack

- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database (hosted on Neon)
- **pg** - PostgreSQL client for Node.js
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
  - Body: `{ username, email, password, first_name, last_name, student_id?, phone? }`
  - Returns: `{ token, user }`
- `POST /api/auth/login` - Login user
  - Body: `{ username, password }`
  - Returns: `{ token, user }`
- `GET /api/auth/verify` - Verify JWT token
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ valid: true, user }`

### Books
- `GET /api/books` - Get all books
  - Query params: `?search=<term>&genre=<genre>&available=<true|false>`
  - Returns: Array of book objects
- `GET /api/books/:id` - Get a specific book by ID
  - Returns: Book object
- `POST /api/books` - Create a new book (Admin only)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ title, author, isbn?, genre?, publication_year?, publisher?, description?, image_url? }`
  - Returns: Created book object
- `PUT /api/books/:id` - Update a book (Admin only)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ title?, author?, isbn?, genre?, publication_year?, publisher?, description?, image_url? }`
  - Returns: Updated book object
- `DELETE /api/books/:id` - Delete a book (Admin only)
  - Headers: `Authorization: Bearer <token>`
  - Returns: Success message

### Borrowings
- `GET /api/borrowings/my-books` - Get current user's borrowed books
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of borrowing objects with book details
- `GET /api/borrowings` - Get all borrowings (Admin only)
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of all borrowing objects with user and book details
- `POST /api/borrowings/borrow` - Borrow a book
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ book_id }`
  - Returns: Created borrowing object with due date
- `POST /api/borrowings/return/:id` - Return a borrowed book
  - Headers: `Authorization: Bearer <token>`
  - Params: `id` (borrowing_id)
  - Returns: Updated borrowing object

### Metadata
- `GET /api/books/meta/genres` - Get all unique genres
  - Returns: Array of unique genre strings

### Health Check
- `GET /api/health` - Check server and database status
  - Returns: `{ status: 'ok', database: 'connected'|'disconnected', timestamp }`

## 🗄️ Database Schema

The system automatically creates three tables on first run:

### Users Table
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR(100) UNIQUE NOT NULL)
- email (VARCHAR(255) UNIQUE NOT NULL)
- password (VARCHAR(255) NOT NULL) -- Hashed with bcrypt
- student_id (VARCHAR(50) UNIQUE)
- first_name (VARCHAR(100) NOT NULL)
- last_name (VARCHAR(100) NOT NULL)
- phone (VARCHAR(20))
- is_admin (BOOLEAN DEFAULT false)
- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
```

### Books Table
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR(255) NOT NULL)
- author (VARCHAR(255) NOT NULL)
- isbn (VARCHAR(50) UNIQUE)
- genre (VARCHAR(100))
- publication_year (INTEGER)
- publisher (VARCHAR(255))
- description (TEXT)
- image_url (VARCHAR(500)) -- URL to book cover image
- available (BOOLEAN DEFAULT true)
- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
```

### Borrowings Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users(id) ON DELETE CASCADE)
- book_id (INTEGER REFERENCES books(id) ON DELETE CASCADE)
- borrowed_date (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- due_date (TIMESTAMP NOT NULL) -- 14 days from borrow date
- returned_date (TIMESTAMP)
- status (VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')))
- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
```

**Indexes:**
- `idx_borrowings_user_id` on `borrowings(user_id)`
- `idx_borrowings_book_id` on `borrowings(book_id)`
- `idx_borrowings_status` on `borrowings(status)`

## 🚀 Deployment

### Render Deployment

The backend is configured for deployment on Render:

1. **Create a new Web Service on Render**
2. **Connect your GitHub repository**
3. **Configure environment variables:**
   - `DATABASE_URL` - postgresql://neondb_owner:npg_I2qMkGNRZJ1U@ep-purple-voice-abt2zkzb-pooler.eu-west-2.aws.neon.tech/library?sslmode=require&channel_binding=require
   - `JWT_SECRET` - A secure random string
   - `NODE_ENV` - `production`

4. **Build Command:** `npm install`
5. **Start Command:** `npm start`

The backend is currently deployed at: [https://backend-dzci.onrender.com](https://backend-dzci.onrender.com)
