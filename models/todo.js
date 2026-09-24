const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      Todo.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    static overdue(userId) {
      const today = new Date().toISOString().split('T')[0];
      const whereClause = {
        dueDate: {
          [Op.lt]: today,
        },
        completed: false,
      };
      if (userId !== undefined) {
        whereClause.userId = userId;
      }
      return this.findAll({
        where: whereClause,
        order: [['id', 'ASC']],
      });
    }

    static dueToday(userId) {
      const today = new Date().toISOString().split('T')[0];
      const whereClause = {
        dueDate: {
          [Op.eq]: today,
        },
        completed: false,
      };
      if (userId !== undefined) {
        whereClause.userId = userId;
      }
      return this.findAll({
        where: whereClause,
        order: [['id', 'ASC']],
      });
    }

    static dueLater(userId) {
      const today = new Date().toISOString().split('T')[0];
      const whereClause = {
        dueDate: {
          [Op.gt]: today,
        },
        completed: false,
      };
      if (userId !== undefined) {
        whereClause.userId = userId;
      }
      return this.findAll({
        where: whereClause,
        order: [['id', 'ASC']],
      });
    }

    static completedItems(userId) {
      const whereClause = {
        completed: true,
      };
      if (userId !== undefined) {
        whereClause.userId = userId;
      }
      return this.findAll({
        where: whereClause,
        order: [['id', 'ASC']],
      });
    }

    static completed(userId) {
      return this.completedItems(userId);
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
