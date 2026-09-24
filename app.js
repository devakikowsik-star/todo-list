const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const csurf = require('tiny-csrf');
const { Todo } = require('./models');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie_secret_key_32_characters_!'));

// Bridge request headers or query to req.body._csrf for API/fetch requests
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && !req.body._csrf) {
    req.body._csrf =
      req.headers['csrf-token'] ||
      req.headers['x-csrf-token'] ||
      (req.query && req.query._csrf);
  }
  next();
});

// CSRF Protection
const csrfMiddleware = csurf(
  process.env.CSRF_SECRET || '123456789iamasecret987654321look',
  ['POST', 'PUT', 'DELETE']
);

if (process.env.DISABLE_CSRF !== 'true') {
  app.use(csrfMiddleware);
}

// Expose csrfToken to all templates
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  next();
});

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
    let completedTodos = [];

    if (typeof Todo.overdue === 'function') {
      overdueTodos = await Todo.overdue();
      dueTodayTodos = await Todo.dueToday();
      dueLaterTodos = await Todo.dueLater();
      if (typeof Todo.completedItems === 'function') {
        completedTodos = await Todo.completedItems();
      } else if (typeof Todo.completed === 'function') {
        completedTodos = await Todo.completed();
      }
    } else {
      const allTodos = await Todo.findAll({ order: [['id', 'ASC']] });
      overdueTodos = allTodos.filter((t) => t.dueDate && t.dueDate < today && !t.completed);
      dueTodayTodos = allTodos.filter((t) => t.dueDate === today && !t.completed);
      dueLaterTodos = allTodos.filter((t) => t.dueDate && t.dueDate > today && !t.completed);
      completedTodos = allTodos.filter((t) => t.completed);
    }

    const token = req.csrfToken ? req.csrfToken() : '';

    const viewData = {
      overdueTodos,
      dueTodayTodos,
      dueLaterTodos,
      completedTodos,
      completedItems: completedTodos,
      overdueCount: overdueTodos.length,
      dueTodayCount: dueTodayTodos.length,
      dueLaterCount: dueLaterTodos.length,
      completedCount: completedTodos.length,
      completedItemsCount: completedTodos.length,
      csrfToken: token,
    };

    if (req.accepts('html')) {
      return res.render('index', viewData);
    }

    return res.status(200).json(viewData);
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
    const todos = await Todo.findAll({ order: [['id', 'ASC']] });
    return res.status(200).json(todos);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /todos
 * Creates a new todo item with validation and CSRF protection
 */
app.post('/todos', async (req, res) => {
  try {
    const { title, dueDate, completed } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and cannot be empty' });
    }

    if (!dueDate || typeof dueDate !== 'string' || dueDate.trim() === '') {
      return res.status(400).json({ error: 'Due date is required and cannot be empty' });
    }

    const todo = await Todo.create({
      title: title.trim(),
      dueDate: dueDate.trim(),
      completed: completed !== undefined ? Boolean(completed) : false,
    });

    if (req.accepts('html') && !req.is('json')) {
      return res.redirect('/');
    }

    return res.status(201).json(todo);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /todos/:id
 * Updates todo completion status using setCompletionStatus()
 */
app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const todo = await Todo.findByPk(id);
    if (!todo) {
      return res.status(404).json({ error: `Todo with id ${id} not found` });
    }

    const newCompleted = completed !== undefined ? Boolean(completed) : !todo.completed;

    let updatedTodo;
    if (typeof todo.setCompletionStatus === 'function') {
      updatedTodo = await todo.setCompletionStatus(newCompleted);
    } else {
      updatedTodo = await todo.update({ completed: newCompleted });
    }

    return res.status(200).json(updatedTodo);
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

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('Did not get a valid CSRF token')) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

module.exports = app;
