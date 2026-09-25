'use strict';

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('Connecting to PostgreSQL database via DATABASE_URL...');
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');

      // Automatically sync models to create all tables (Users, Sports, Sessions, SessionParticipants)
      await sequelize.sync();
      console.log('Database tables synchronized successfully.');
    } else {
      console.log('DATABASE_URL not set, attempting fallback DB connection...');
      await sequelize.authenticate();
      await sequelize.sync();
      console.log('Local database connected and synchronized.');
    }
  } catch (error) {
    console.warn('Database connection warning:', error.message);
    console.warn(`Sports Scheduler server will continue and listen on port ${PORT}`);
  }

  // Always bind port so Render health check succeeds
  app.listen(PORT, () => {
    console.log(`Sports Scheduler application running at http://localhost:${PORT}`);
  });
}

startServer();
