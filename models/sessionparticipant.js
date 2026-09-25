'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SessionParticipant extends Model {
    static associate(models) {
      SessionParticipant.belongsTo(models.Session, { foreignKey: 'sessionId', as: 'session' });
      SessionParticipant.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  SessionParticipant.init(
    {
      sessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Session ID is required' },
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'User ID is required' },
        },
      },
    },
    {
      sequelize,
      modelName: 'SessionParticipant',
      indexes: [
        {
          unique: true,
          fields: ['sessionId', 'userId'],
        },
      ],
    }
  );

  return SessionParticipant;
};
