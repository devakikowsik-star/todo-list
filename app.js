const express = require('express');
const cors = require('cors');
const { Todo } = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Express Todo API with Sequelize and PostgreSQL is running' });
});

/**
 * GET /todos
 * Fetches all todos from database using Todo.findAll()
 */
app.get('/todos', async (req, res) => {
  try {
    const todos = await Todo.findAll();
    return res.status(200).json(todos);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /todos/:id
 * Deletes a todo by id using Todo.destroy()
 */
app.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCount = await Todo.destroy({
      where: { id },
    });

    if (deletedCount === 0) {
      return res.status(404).json({ error: `Todo with id ${id} not found` });
    }

    return res.status(200).json({
      success: true,
      message: `Todo with id ${id} deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /todos
 * Creates a new todo item
 */
app.post('/todos', async (req, res) => {
  try {
    const { title, dueDate, completed } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const todo = await Todo.create({
      title: title.trim(),
      dueDate: dueDate || null,
      completed: completed !== undefined ? completed : false,
    });

    return res.status(201).json(todo);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

module.exports = app;
