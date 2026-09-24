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
          completed: false,
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
          completed: false,
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
          completed: false,
        },
        order: [['id', 'ASC']],
      });
    }

    static completedItems() {
      return this.findAll({
        where: {
          completed: true,
        },
        order: [['id', 'ASC']],
      });
    }

    static completed() {
      return this.completedItems();
    }

    setCompletionStatus(completed) {
      return this.update({ completed: Boolean(completed) });
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
