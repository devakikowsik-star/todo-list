'use strict';

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Session, Sport, User, SessionParticipant } = require('../models');
const { ensureAuthenticated } = require('../middleware/auth');

// GET /sessions/new - Render create session form
router.get('/new', ensureAuthenticated, async (req, res, next) => {
  try {
    const sports = await Sport.findAll({ order: [['name', 'ASC']] });
    if (sports.length === 0) {
      req.flash('error', 'No sports available yet. Please ask an administrator to add sports first.');
      return res.redirect('/sports');
    }

    res.render('sessions/new', {
      title: 'Create Session - Sports Scheduler',
      sports,
      formData: {},
    });
  } catch (err) {
    next(err);
  }
});

// POST /sessions - Create new sports session
router.post('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const { sportId, venue, dateTime, additionalPlayersNeeded, existingPlayers } = req.body;

    const errors = [];
    if (!sportId) errors.push('Please select a sport.');
    if (!venue || !venue.trim()) errors.push('Venue cannot be empty.');
    if (!dateTime) errors.push('Date and time is required.');

    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid date and time format.');
    } else if (parsedDate <= new Date()) {
      errors.push('Session date and time must be set in the future.');
    }

    const slots = parseInt(additionalPlayersNeeded, 10);
    if (isNaN(slots) || slots < 0) {
      errors.push('Additional players needed must be 0 or more.');
    }

    if (errors.length > 0) {
      const sports = await Sport.findAll({ order: [['name', 'ASC']] });
      return res.status(400).render('sessions/new', {
        title: 'Create Session - Sports Scheduler',
        sports,
        formData: req.body,
        messages: { error: errors, success: [] },
      });
    }

    // Verify sport exists
    const sport = await Sport.findByPk(sportId);
    if (!sport) {
      req.flash('error', 'Selected sport does not exist.');
      return res.redirect('/sessions/new');
    }

    const session = await Session.create({
      sportId: parseInt(sportId, 10),
      creatorId: req.user.id,
      venue: venue.trim(),
      dateTime: parsedDate,
      additionalPlayersNeeded: slots,
      existingPlayers: existingPlayers ? existingPlayers.trim() : null,
    });

    req.flash('success', 'Sports session created successfully!');
    res.redirect('/sessions/my');
  } catch (err) {
    next(err);
  }
});

// GET /sessions/available - View available upcoming sessions
router.get('/available', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const allUpcoming = await Session.findAll({
      where: {
        dateTime: { [Op.gt]: now },
        isCancelled: false,
      },
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator' },
        {
          model: SessionParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user' }],
        },
      ],
      order: [['dateTime', 'ASC']],
    });

    // Available sessions:
    // 1. User is not creator
    // 2. User has not already joined
    // 3. Has available slots remaining (additionalPlayersNeeded > participants.length)
    const availableSessions = allUpcoming.filter((s) => {
      const isCreator = s.creatorId === userId;
      const alreadyJoined = s.participants.some((p) => p.userId === userId);
      const remainingSlots = s.getRemainingSlots();
      return !isCreator && !alreadyJoined && remainingSlots > 0;
    });

    res.render('sessions/available', {
      title: 'Available Sessions - Sports Scheduler',
      sessions: availableSessions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /sessions/joined - View sessions joined by current user
router.get('/joined', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const participations = await SessionParticipant.findAll({
      where: { userId },
      include: [
        {
          model: Session,
          as: 'session',
          include: [
            { model: Sport, as: 'sport' },
            { model: User, as: 'creator' },
            {
              model: SessionParticipant,
              as: 'participants',
              include: [{ model: User, as: 'user' }],
            },
          ],
        },
      ],
      order: [[{ model: Session, as: 'session' }, 'dateTime', 'ASC']],
    });

    const upcomingSessions = [];
    const pastSessions = [];

    participations.forEach((p) => {
      if (p.session) {
        if (new Date(p.session.dateTime) > now && !p.session.isCancelled) {
          upcomingSessions.push(p.session);
        } else {
          pastSessions.push(p.session);
        }
      }
    });

    res.render('sessions/joined', {
      title: 'Joined Sessions - Sports Scheduler',
      upcomingSessions,
      pastSessions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /sessions/my - View sessions created by current user
router.get('/my', ensureAuthenticated, async (req, res, next) => {
  try {
    const sessions = await Session.findAll({
      where: { creatorId: req.user.id },
      include: [
        { model: Sport, as: 'sport' },
        {
          model: SessionParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user' }],
        },
      ],
      order: [['dateTime', 'DESC']],
    });

    res.render('sessions/my', {
      title: 'My Created Sessions - Sports Scheduler',
      sessions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /sessions/:id - View single session details
router.get('/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator' },
        {
          model: SessionParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user' }],
        },
      ],
    });

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/dashboard');
    }

    const userId = req.user.id;
    const isCreator = session.creatorId === userId;
    const isAdmin = req.user.role === 'admin';
    const hasJoined = session.participants.some((p) => p.userId === userId);
    const isPast = session.isPast();
    const remainingSlots = session.getRemainingSlots();

    res.render('sessions/show', {
      title: `${session.sport ? session.sport.name : 'Session'} at ${session.venue} - Sports Scheduler`,
      session,
      isCreator,
      isAdmin,
      hasJoined,
      isPast,
      remainingSlots,
    });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/join - Join a session
router.post('/:id/join', ensureAuthenticated, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await Session.findByPk(sessionId, {
      include: [{ model: SessionParticipant, as: 'participants' }],
    });

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/sessions/available');
    }

    // Guard: Cancelled session
    if (session.isCancelled) {
      req.flash('error', 'Cannot join a session that has been cancelled.');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // Guard: Past session
    if (session.isPast()) {
      req.flash('error', 'Cannot join a past session.');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // Guard: Creator cannot join their own session as participant
    if (session.creatorId === userId) {
      req.flash('error', 'You are the creator of this session.');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // Guard: Already joined
    const alreadyJoined = session.participants.some((p) => p.userId === userId);
    if (alreadyJoined) {
      req.flash('error', 'You have already joined this session.');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // Guard: Open slots
    if (session.getRemainingSlots() <= 0) {
      req.flash('error', 'Sorry, all available slots for this session are filled.');
      return res.redirect('/sessions/available');
    }

    await SessionParticipant.create({
      sessionId: session.id,
      userId,
    });

    req.flash('success', 'You have successfully joined the session!');
    res.redirect('/sessions/joined');
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/leave - Leave a joined session
router.post('/:id/leave', ensureAuthenticated, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await Session.findByPk(sessionId);
    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/sessions/joined');
    }

    if (session.isPast()) {
      req.flash('error', 'Cannot leave a past session.');
      return res.redirect('/sessions/joined');
    }

    const participant = await SessionParticipant.findOne({
      where: { sessionId, userId },
    });

    if (!participant) {
      req.flash('error', 'You are not registered as a participant in this session.');
      return res.redirect('/sessions/joined');
    }

    await participant.destroy();
    req.flash('success', 'You have successfully left the session.');
    res.redirect('/sessions/joined');
  } catch (err) {
    next(err);
  }
});

// GET /sessions/:id/cancel - Render cancel confirmation view
router.get('/:id/cancel', ensureAuthenticated, async (req, res, next) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator' },
      ],
    });

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/sessions/my');
    }

    // Check authorization: must be creator or admin
    if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error', 'Access denied. You can only cancel sessions that you created.');
      return res.redirect(`/sessions/${session.id}`);
    }

    if (session.isCancelled) {
      req.flash('error', 'This session is already cancelled.');
      return res.redirect(`/sessions/${session.id}`);
    }

    res.render('sessions/cancel', {
      title: 'Cancel Session - Sports Scheduler',
      session,
    });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/cancel - Process session cancellation with mandatory reason
router.post('/:id/cancel', ensureAuthenticated, async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/sessions/my');
    }

    // Check authorization: must be creator or admin
    if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error', 'Access denied. You can only cancel sessions that you created.');
      return res.redirect(`/sessions/${session.id}`);
    }

    if (session.isCancelled) {
      req.flash('error', 'This session has already been cancelled.');
      return res.redirect(`/sessions/${session.id}`);
    }

    // Cancellation reason is mandatory!
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).render('sessions/cancel', {
        title: 'Cancel Session - Sports Scheduler',
        session,
        messages: {
          error: ['Cancellation reason is required to cancel a session.'],
          success: [],
        },
      });
    }

    session.isCancelled = true;
    session.cancellationReason = cancellationReason.trim();
    await session.save();

    req.flash('success', 'Session has been cancelled successfully.');
    res.redirect(`/sessions/${session.id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
