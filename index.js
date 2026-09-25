'use strict';

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    app.listen(PORT, () => {
      console.log(`Sports Scheduler application running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    // Even if db connection fails during boot, start server so health check responds
    app.listen(PORT, () => {
      console.log(`Sports Scheduler fallback server running on port ${PORT}`);
    });
  }
}

startServer();
