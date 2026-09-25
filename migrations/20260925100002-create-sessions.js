'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Sports',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      creatorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      venue: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      dateTime: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      additionalPlayersNeeded: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      existingPlayers: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isCancelled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cancellationReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Sessions');
  },
};
