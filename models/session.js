'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Sport, { foreignKey: 'sportId', as: 'sport' });
      Session.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
      Session.hasMany(models.SessionParticipant, {
        foreignKey: 'sessionId',
        as: 'participants',
        onDelete: 'CASCADE',
      });
      Session.belongsToMany(models.User, {
        through: models.SessionParticipant,
        foreignKey: 'sessionId',
        as: 'joinedUsers',
      });
    }

    getRemainingSlots() {
      const joinedCount = this.participants ? this.participants.length : 0;
      return Math.max(0, this.additionalPlayersNeeded - joinedCount);
    }

    isPast() {
      return new Date(this.dateTime) < new Date();
    }
  }

  Session.init(
    {
      sportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Sport selection is required' },
        },
      },
      creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      venue: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Venue cannot be empty' },
        },
      },
      dateTime: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Date and time is required' },
        },
      },
      additionalPlayersNeeded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [0],
            msg: 'Additional players needed must be 0 or more',
          },
        },
      },
      existingPlayers: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isCancelled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Session',
    }
  );

  return Session;
};
