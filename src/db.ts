import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('aura.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    google_id TEXT UNIQUE,
    is_verified INTEGER DEFAULT 0,
    otp TEXT,
    otp_expiry DATETIME,
    role TEXT DEFAULT 'user',
    language TEXT DEFAULT 'english',
    theme TEXT DEFAULT 'dark',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add language column to users if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'english'");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'");
} catch (e) {}

export default db;
