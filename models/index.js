'use strict';

const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';
let sequelize;

if (process.env.DATABASE_URL) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  const requireSsl = isProduction || !isLocal;

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: requireSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
    logging: isTest || isProduction ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // If DATABASE_URL is not set, use SQLite for zero-config operation
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'sports_scheduler.sqlite'),
    logging: isTest ? false : console.log,
  });
}

const db = {};

const User = require('./user')(sequelize, DataTypes);
const Sport = require('./sport')(sequelize, DataTypes);
const Session = require('./session')(sequelize, DataTypes);
const SessionParticipant = require('./sessionparticipant')(sequelize, DataTypes);

db.User = User;
db.Sport = Sport;
db.Session = Session;
db.SessionParticipant = SessionParticipant;
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Run associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
