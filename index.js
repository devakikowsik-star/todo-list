'use strict';

const app = require('./app');
const { sequelize, User, Sport } = require('./models');

const PORT = process.env.PORT || 3000;

// 1. Immediately bind port so Render port-detection succeeds in seconds
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sports Scheduler application running at http://0.0.0.0:${PORT}`);
});

// 2. Initialize database connection and auto-seed initial data
async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    try {
      console.log('Connecting to PostgreSQL database via DATABASE_URL...');
      await sequelize.authenticate();
      console.log('PostgreSQL database connection established successfully.');

      // Automatically create and sync all tables
      await sequelize.sync();
      console.log('All database tables synchronized successfully.');

      // 1. Ensure Kowsik and the first user have Admin privileges
      await User.update({ role: 'admin' }, { where: { email: 'devakikowsik@gmail.com' } });
      const firstUser = await User.findOne({ order: [['id', 'ASC']] });
      if (firstUser && firstUser.role !== 'admin') {
        firstUser.role = 'admin';
        await firstUser.save();
      }

      // 2. Auto-seed default sports catalog if empty
      const sportsCount = await Sport.count();
      if (sportsCount === 0) {
        const adminUser = (await User.findOne({ where: { role: 'admin' } })) || firstUser;
        if (adminUser) {
          const defaultSports = ['Badminton', 'Football', 'Cricket', 'Basketball', 'Tennis'];
          for (const name of defaultSports) {
            await Sport.findOrCreate({
              where: { name },
              defaults: { name, userId: adminUser.id },
            });
          }
          console.log('Successfully seeded default sports catalog.');
        }
      }
    } catch (error) {
      console.error('Database connection / seeding error:', error.message);
    }
  } else {
    console.warn('DATABASE_URL is not set. Please link your PostgreSQL database in the Render dashboard.');
  }
}

initializeDatabase();
