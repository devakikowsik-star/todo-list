const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const csurf = require('tiny-csrf');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { Todo, User } = require('./models');

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

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'todo_session_super_secret_key_12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Flash messages
app.use(flash());

// Passport configuration
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        if (!email || !password) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(passport.initialize());
app.use(passport.session());

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

// Expose variables to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.messages = req.flash();
  res.locals.currentUser = req.user;
  next();
});

/**
 * Authentication Routes
 */
app.get('/signup', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('signup', { csrfToken: req.csrfToken ? req.csrfToken() : '' });
});

async function handleSignup(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      req.flash('error', 'First name cannot be empty');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/signup');
      }
      return res.status(400).json({ error: 'First name cannot be empty' });
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      req.flash('error', 'Email cannot be empty');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/signup');
      }
      return res.status(400).json({ error: 'Email cannot be empty' });
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      req.flash('error', 'Password cannot be empty');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/signup');
      }
      return res.status(400).json({ error: 'Password cannot be empty' });
    }

    const existingUser = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      req.flash('error', 'Email already registered');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/signup');
      }
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : null,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });

    req.login(user, (err) => {
      if (err) {
        return res.redirect('/login');
      }
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/');
      }
      return res.status(201).json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    });
  } catch (error) {
    req.flash('error', error.message);
    if (req.accepts('html') && !req.is('json')) {
      return res.redirect('/signup');
    }
    return res.status(500).json({ error: error.message });
  }
}

app.post('/users', handleSignup);
app.post('/signup', handleSignup);

app.get('/login', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('login', { csrfToken: req.csrfToken ? req.csrfToken() : '' });
});

function handleLogin(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash('error', (info && info.message) || 'Invalid email or password');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/login');
      }
      return res.status(401).json({ error: (info && info.message) || 'Invalid email or password' });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/');
      }
      return res.status(200).json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    });
  })(req, res, next);
}

app.post('/session', handleLogin);
app.post('/login', handleLogin);

function handleSignout(req, res) {
  req.logout((err) => {
    if (req.session) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
    } else {
      res.redirect('/login');
    }
  });
}

app.get('/signout', handleSignout);
app.get('/logout', handleSignout);

/**
 * GET /
 * Main dashboard view rendering index.ejs with categorized todos and counts
 */
app.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user ? req.user.id : undefined;

    let overdueTodos = [];
    let dueTodayTodos = [];
    let dueLaterTodos = [];
    let completedTodos = [];

    if (typeof Todo.overdue === 'function') {
      overdueTodos = await Todo.overdue(userId);
      dueTodayTodos = await Todo.dueToday(userId);
      dueLaterTodos = await Todo.dueLater(userId);
      if (typeof Todo.completedItems === 'function') {
        completedTodos = await Todo.completedItems(userId);
      } else if (typeof Todo.completed === 'function') {
        completedTodos = await Todo.completed(userId);
      }
    } else {
      const where = userId ? { userId } : {};
      const allTodos = await Todo.findAll({ where, order: [['id', 'ASC']] });
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
      currentUser: req.user,
      messages: req.flash(),
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
 * Fetches todos (user-scoped if authenticated)
 */
app.get('/todos', async (req, res) => {
  try {
    const where = req.user ? { userId: req.user.id } : {};
    const todos = await Todo.findAll({ where, order: [['id', 'ASC']] });
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
      req.flash('error', 'Title is required and cannot be empty');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/');
      }
      return res.status(400).json({ error: 'Title is required and cannot be empty' });
    }

    if (!dueDate || typeof dueDate !== 'string' || dueDate.trim() === '') {
      req.flash('error', 'Due date is required and cannot be empty');
      if (req.accepts('html') && !req.is('json')) {
        return res.redirect('/');
      }
      return res.status(400).json({ error: 'Due date is required and cannot be empty' });
    }

    const todo = await Todo.create({
      title: title.trim(),
      dueDate: dueDate.trim(),
      completed: completed !== undefined ? Boolean(completed) : false,
      userId: req.user ? req.user.id : (req.body.userId || null),
    });

    if (req.accepts('html') && !req.is('json')) {
      return res.redirect('/');
    }

    return res.status(201).json(todo);
  } catch (error) {
    req.flash('error', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /todos/:id
 * Updates todo completion status using setCompletionStatus() (enforces ownership)
 */
app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const where = { id };
    if (req.user && req.user.id) {
      where.userId = req.user.id;
    }

    const todo = await Todo.findOne({ where });
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
 * Deletes a todo by id (enforces ownership)
 */
app.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };
    if (req.user && req.user.id) {
      where.userId = req.user.id;
    }

    const deletedCount = await Todo.destroy({
      where,
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
