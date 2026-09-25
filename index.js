'use strict';

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

// 1. Immediately bind port so Render port-detection succeeds in seconds
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sports Scheduler application running at http://0.0.0.0:${PORT}`);
});

// 2. Initialize database connection in the background without blocking port binding
async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    try {
      console.log('Connecting to PostgreSQL database via DATABASE_URL...');
      await sequelize.authenticate();
      console.log('PostgreSQL database connection established successfully.');

      // Automatically create and sync all tables
      await sequelize.sync();
      console.log('All database tables synchronized successfully.');
    } catch (error) {
      console.error('Database connection error:', error.message);
    }
  } else {
    console.warn('DATABASE_URL is not set. Please link your PostgreSQL database in the Render dashboard.');
  }
}

initializeDatabase();
