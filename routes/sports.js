'use strict';

const express = require('express');
const router = express.Router();
const { Sport, Session, User } = require('../models');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// GET /sports - View all sports
router.get('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const sports = await Sport.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: Session, as: 'sessions', attributes: ['id', 'isCancelled'] },
      ],
      order: [['name', 'ASC']],
    });

    res.render('sports/index', {
      title: 'Sports Directory - Sports Scheduler',
      sports,
    });
  } catch (err) {
    next(err);
  }
});

// POST /sports - Create sport (Admin only)
router.post('/', ensureAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      req.flash('error', 'Sport name cannot be empty.');
      return res.redirect('/sports');
    }

    const trimmedName = name.trim();
    const existingSport = await Sport.findOne({
      where: Sport.sequelize.where(
        Sport.sequelize.fn('lower', Sport.sequelize.col('name')),
        trimmedName.toLowerCase()
      ),
    });

    if (existingSport) {
      req.flash('error', `A sport named "${trimmedName}" already exists.`);
      return res.redirect('/sports');
    }

    await Sport.create({
      name: trimmedName,
      userId: req.user.id,
    });

    req.flash('success', `Sport "${trimmedName}" has been successfully added.`);
    res.redirect('/sports');
  } catch (err) {
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      err.errors.forEach((e) => req.flash('error', e.message));
      return res.redirect('/sports');
    }
    next(err);
  }
});

// GET /sports/:id/edit - Render edit form (Admin only)
router.get('/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const sport = await Sport.findByPk(req.params.id);
    if (!sport) {
      req.flash('error', 'Sport not found.');
      return res.redirect('/sports');
    }

    res.render('sports/edit', {
      title: `Edit ${sport.name} - Sports Scheduler`,
      sport,
    });
  } catch (err) {
    next(err);
  }
});

// POST /sports/:id - Update sport (Admin only)
router.post('/:id', ensureAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    const sport = await Sport.findByPk(req.params.id);

    if (!sport) {
      req.flash('error', 'Sport not found.');
      return res.redirect('/sports');
    }

    if (!name || !name.trim()) {
      req.flash('error', 'Sport name cannot be empty.');
      return res.redirect(`/sports/${sport.id}/edit`);
    }

    const trimmedName = name.trim();
    // Check if another sport uses this name
    const existingSport = await Sport.findOne({
      where: Sport.sequelize.where(
        Sport.sequelize.fn('lower', Sport.sequelize.col('name')),
        trimmedName.toLowerCase()
      ),
    });

    if (existingSport && existingSport.id !== sport.id) {
      req.flash('error', `A sport named "${trimmedName}" already exists.`);
      return res.redirect(`/sports/${sport.id}/edit`);
    }

    sport.name = trimmedName;
    await sport.save();

    req.flash('success', `Sport updated to "${trimmedName}".`);
    res.redirect('/sports');
  } catch (err) {
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      err.errors.forEach((e) => req.flash('error', e.message));
      return res.redirect(`/sports/${req.params.id}/edit`);
    }
    next(err);
  }
});

// POST /sports/:id/delete - Delete sport (Admin only)
router.post('/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    const sport = await Sport.findByPk(req.params.id);
    if (!sport) {
      req.flash('error', 'Sport not found.');
      return res.redirect('/sports');
    }

    const sportName = sport.name;
    await sport.destroy();

    req.flash('success', `Sport "${sportName}" and its associated sessions have been deleted.`);
    res.redirect('/sports');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
