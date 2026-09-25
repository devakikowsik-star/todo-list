'use strict';

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
  sequelize = new Sequelize(
    process.env.DB_NAME || 'sports_scheduler_development',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: isTest ? false : console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
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
