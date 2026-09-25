'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Sport, { foreignKey: 'userId', as: 'sports' });
      User.hasMany(models.Session, { foreignKey: 'creatorId', as: 'createdSessions' });
      User.hasMany(models.SessionParticipant, { foreignKey: 'userId', as: 'participations' });
      User.belongsToMany(models.Session, {
        through: models.SessionParticipant,
        foreignKey: 'userId',
        as: 'joinedSessions',
      });
    }

    static async hashPassword(password) {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(password, salt);
    }

    verifyPassword(password) {
      return bcrypt.compare(password, this.password);
    }
  }

  User.init(
    {
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'First name cannot be empty' },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'Email is already registered' },
        validate: {
          isEmail: { msg: 'Please provide a valid email address' },
          notEmpty: { msg: 'Email cannot be empty' },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Password cannot be empty' },
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'player',
        validate: {
          isIn: {
            args: [['admin', 'player']],
            msg: 'Role must be either admin or player',
          },
        },
      },
    },
    {
      sequelize,
      modelName: 'User',
      hooks: {
        beforeSave: async (user) => {
          if (user.changed('password')) {
            user.password = await User.hashPassword(user.password);
          }
          if (user.email) {
            user.email = user.email.toLowerCase().trim();
          }
        },
      },
    }
  );

  return User;
};
