const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    if (sequelize) {
      await sequelize.authenticate();
      console.log('PostgreSQL database connection established successfully.');
      await sequelize.sync();
      console.log('Database synchronized.');
    }
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();