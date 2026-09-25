'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const csrf = require('tiny-csrf');
require('dotenv').config();

const { User } = require('./models');
const indexRouter = require('./routes/index');
const sportsRouter = require('./routes/sports');
const sessionsRouter = require('./routes/sessions');
const reportsRouter = require('./routes/reports');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('sports_scheduler_cookie_secret_wd201'));

// Trust proxy for production reverse proxy environments (e.g. Render)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sports_scheduler_super_secret_session_key_wd201',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Flash messages
app.use(flash());

// Passport setup
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        if (!email || !password) {
          return done(null, false, { message: 'Email and password are required' });
        }
        const user = await User.findOne({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await user.verifyPassword(password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (err) {
        console.error('Passport login error:', err.message);
        return done(null, false, { message: 'Database connecting or unavailable. Please ensure PostgreSQL is linked.' });
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
    });
    done(null, user);
  } catch (err) {
    done(err, null);
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
const CSRF_SECRET =
  process.env.CSRF_SECRET || '123456789iamasecret987654321look';
app.use(csrf(CSRF_SECRET, ['POST', 'PUT', 'DELETE']));

// Global variables for templates
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  } catch (e) {
    res.locals.csrfToken = '';
  }
  res.locals.user = req.user || null;
  res.locals.messages = {
    error: req.flash('error'),
    success: req.flash('success'),
  };
  res.locals.currentPath = req.path;
  next();
});

// Mount Routes
app.use('/', indexRouter);
app.use('/sports', sportsRouter);
app.use('/sessions', sessionsRouter);
app.use('/reports', reportsRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Page Not Found',
    user: req.user || null,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // CSRF token error
  if (err.message && err.message.includes('Did not get a valid CSRF token')) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  console.error('Unhandled Application Error:', err);
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title: '500 - Server Error',
    user: req.user || null,
    error: process.env.NODE_ENV === 'production' ? null : err,
  });
});

module.exports = app;
