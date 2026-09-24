const express = require('express');
const cors = require('cors');
const path = require('path');
const { Todo } = require('./models');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * GET /
 * Main dashboard view rendering index.ejs with categorized todos and counts
 */
app.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let overdueTodos = [];
    let dueTodayTodos = [];
    let dueLaterTodos = [];

    if (typeof Todo.overdue === 'function') {
      overdueTodos = await Todo.overdue();
      dueTodayTodos = await Todo.dueToday();
      dueLaterTodos = await Todo.dueLater();
    } else {
      const allTodos = await Todo.findAll();
      overdueTodos = allTodos.filter((t) => t.dueDate && t.dueDate < today);
      dueTodayTodos = allTodos.filter((t) => t.dueDate === today);
      dueLaterTodos = allTodos.filter((t) => t.dueDate && t.dueDate > today);
    }

    if (req.accepts('html')) {
      return res.render('index', {
        overdueTodos,
        dueTodayTodos,
        dueLaterTodos,
        overdueCount: overdueTodos.length,
        dueTodayCount: dueTodayTodos.length,
        dueLaterCount: dueLaterTodos.length,
      });
    }

    return res.status(200).json({
      overdueTodos,
      dueTodayTodos,
      dueLaterTodos,
      overdueCount: overdueTodos.length,
      dueTodayCount: dueTodayTodos.length,
      dueLaterCount: dueLaterTodos.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
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
 * PUT /todos/:id
 * Updates completion status of a todo
 */
app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const todo = await Todo.findByPk(id);
    if (!todo) {
      return res.status(404).json({ error: `Todo with id ${id} not found` });
    }

    const updatedTodo = await todo.update({
      completed: completed !== undefined ? completed : !todo.completed,
    });

    return res.status(200).json(updatedTodo);
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

    if (req.accepts('html') && !req.is('json')) {
      return res.redirect('/');
    }

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
