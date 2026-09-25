'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Op } = require('sequelize');
const { User, Sport, Session, SessionParticipant } = require('../models');
const { ensureAuthenticated } = require('../middleware/auth');

// GET / - Home landing page or dashboard redirect
router.get('/', async (req, res, next) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }

    let totalSports = 0;
    let totalSessions = 0;
    try {
      totalSports = await Sport.count();
      totalSessions = await Session.count({ where: { isCancelled: false } });
    } catch (dbErr) {
      console.warn('Database count query standby:', dbErr.message);
    }

    res.render('home', {
      title: 'Sports Scheduler - Connect & Play',
      totalSports,
      totalSessions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /signup - Registration page
router.get('/signup', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('signup', {
    title: 'Sign Up - Sports Scheduler',
    formData: {},
  });
});

// POST /users - Create new user account
router.post('/users', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Validation
    const errors = [];
    if (!firstName || !firstName.trim()) {
      errors.push('First name cannot be empty');
    }
    if (!email || !email.trim()) {
      errors.push('Email cannot be empty');
    }
    if (!password || !password.trim()) {
      errors.push('Password cannot be empty');
    }

    if (errors.length > 0) {
      return res.status(400).render('signup', {
        title: 'Sign Up - Sports Scheduler',
        formData: { firstName, lastName, email, role },
        messages: { error: errors, success: [] },
      });
    }

    // Check if email already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).render('signup', {
        title: 'Sign Up - Sports Scheduler',
        formData: { firstName, lastName, email, role },
        messages: { error: ['Email is already registered. Please log in.'], success: [] },
      });
    }

    // Valid role: admin or player (defaults to player)
    const assignedRole = role === 'admin' ? 'admin' : 'player';

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : null,
      email: normalizedEmail,
      password: password,
      role: assignedRole,
    });

    req.flash('success', 'Account created successfully! Please sign in with your credentials.');
    return res.redirect('/login');
  } catch (err) {
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      err.errors.forEach((e) => req.flash('error', e.message));
      return res.status(400).render('signup', {
        title: 'Sign Up - Sports Scheduler',
        formData: req.body,
      });
    }
    next(err);
  }
});

// GET /login - Login page
router.get('/login', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    title: 'Log In - Sports Scheduler',
  });
});

// POST /session - Authenticate credentials with Passport
router.post(
  '/session',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

// GET /signout & /logout - Destroy session and log out
function handleSignout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'You have been successfully logged out.');
    res.redirect('/login');
  });
}
router.get('/signout', handleSignout);
router.get('/logout', handleSignout);

// GET /dashboard - Central authenticated hub
router.get('/dashboard', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // 1. Total sports
    const totalSports = await Sport.count();

    // 2. Available upcoming sessions
    const allUpcoming = await Session.findAll({
      where: {
        dateTime: { [Op.gt]: now },
        isCancelled: false,
      },
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator' },
        { model: SessionParticipant, as: 'participants' },
      ],
      order: [['dateTime', 'ASC']],
    });

    // Filter available sessions (has open slots, user is not creator, user hasn't joined)
    const availableSessions = allUpcoming.filter((s) => {
      const isCreator = s.creatorId === userId;
      const hasJoined = s.participants.some((p) => p.userId === userId);
      const hasSlots = s.getRemainingSlots() > 0;
      return !isCreator && !hasJoined && hasSlots;
    });

    // 3. User's joined upcoming sessions
    const joinedParticipations = await SessionParticipant.findAll({
      where: { userId },
      include: [
        {
          model: Session,
          as: 'session',
          where: { dateTime: { [Op.gt]: now }, isCancelled: false },
          include: [
            { model: Sport, as: 'sport' },
            { model: User, as: 'creator' },
          ],
        },
      ],
    });

    // 4. User's created sessions count
    const myCreatedCount = await Session.count({ where: { creatorId: userId } });

    res.render('dashboard', {
      title: 'Dashboard - Sports Scheduler',
      totalSports,
      availableCount: availableSessions.length,
      joinedCount: joinedParticipations.length,
      myCreatedCount,
      recentAvailable: availableSessions.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
