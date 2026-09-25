'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    static associate(models) {
      Sport.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
      Sport.hasMany(models.Session, { foreignKey: 'sportId', as: 'sessions', onDelete: 'CASCADE' });
    }
  }

  Sport.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'A sport with this name already exists' },
        validate: {
          notEmpty: { msg: 'Sport name cannot be empty' },
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Sport',
    }
  );

  return Sport;
};
