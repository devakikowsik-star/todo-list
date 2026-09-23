'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      // define association here
    }
  }

  Todo.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Todo',
      tableName: 'todos',
    }
  );

  return Todo;
};
