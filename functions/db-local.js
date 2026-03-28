// db-local.js - Local SQLite Database (Temporary - until network issue fixed)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'fitness_hub.db');

// Create or open database
let db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database opening error: ', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phone TEXT,
        age INTEGER,
        gender TEXT,
        weight REAL,
        height REAL,
        fitnessGoal TEXT,
        role TEXT DEFAULT 'user',
        isVerified BOOLEAN DEFAULT 0,
        membershipStatus TEXT DEFAULT 'inactive',
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Memberships table
    db.run(`
      CREATE TABLE IF NOT EXISTS memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        planName TEXT NOT NULL,
        planType TEXT NOT NULL,
        price REAL NOT NULL,
        duration INTEGER NOT NULL,
        durationUnit TEXT DEFAULT 'months',
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        status TEXT DEFAULT 'active',
        features TEXT,
        autoRenew BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Payments table
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        membershipId INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        paymentMethod TEXT NOT NULL,
        transactionId TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        description TEXT,
        paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (membershipId) REFERENCES memberships(id)
      )
    `);

    // OTPs table
    db.run(`
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT 0,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('📦 Database tables initialized');
  });
}

// Get database instance
function getDB() {
  return db;
}

// Close database connection
function closeDB() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = {
  getDB,
  db,
  closeDB,
};
