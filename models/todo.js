const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      // define association here
    }

    static overdue() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          dueDate: {
            [Op.lt]: today,
          },
        },
        order: [['id', 'ASC']],
      });
    }

    static dueToday() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          dueDate: {
            [Op.eq]: today,
          },
        },
        order: [['id', 'ASC']],
      });
    }

    static dueLater() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          dueDate: {
            [Op.gt]: today,
          },
        },
        order: [['id', 'ASC']],
      });
    }

    setCompletionStatus(completed) {
      return this.update({ completed });
    }

    markAsCompleted() {
      return this.setCompletionStatus(true);
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
