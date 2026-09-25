'use strict';

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Session, Sport, User, SessionParticipant } = require('../models');
const { ensureAdmin } = require('../middleware/auth');

// GET /reports - Admin analytics & reporting dashboard
router.get('/', ensureAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();

    // Base date filter: default to past sessions that took place and weren't cancelled
    const dateCondition = {};

    if (startDate && startDate.trim()) {
      const start = new Date(startDate.trim());
      if (!isNaN(start.getTime())) {
        dateCondition[Op.gte] = start;
      }
    }

    if (endDate && endDate.trim()) {
      const end = new Date(endDate.trim());
      if (!isNaN(end.getTime())) {
        // Set to end of day
        end.setHours(23, 59, 59, 999);
        dateCondition[Op.lte] = end;
      }
    }

    // Where condition for sessions played
    const playedWhere = {
      isCancelled: false,
      dateTime: {
        [Op.lt]: now,
        ...(Object.keys(dateCondition).length > 0 ? dateCondition : {}),
      },
    };

    // 1. Fetch all played sessions in the date range
    const playedSessions = await Session.findAll({
      where: playedWhere,
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator' },
        {
          model: SessionParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user' }],
        },
      ],
      order: [['dateTime', 'DESC']],
    });

    // 2. Total metrics
    const totalSessionsPlayed = playedSessions.length;
    const totalUpcomingSessions = await Session.count({
      where: {
        dateTime: { [Op.gt]: now },
        isCancelled: false,
      },
    });
    const totalCancelledSessions = await Session.count({
      where: { isCancelled: true },
    });

    // 3. Popular sports calculation
    const allSports = await Sport.findAll({
      include: [
        {
          model: Session,
          as: 'sessions',
          where: { isCancelled: false },
          required: false,
          include: [{ model: SessionParticipant, as: 'participants' }],
        },
      ],
    });

    const sportsReport = allSports.map((sport) => {
      const sessionsCount = sport.sessions ? sport.sessions.length : 0;
      let totalParticipants = 0;

      if (sport.sessions) {
        sport.sessions.forEach((s) => {
          totalParticipants += s.participants ? s.participants.length : 0;
        });
      }

      return {
        id: sport.id,
        name: sport.name,
        sessionsCount,
        totalParticipants,
        popularityScore: sessionsCount * 2 + totalParticipants,
      };
    });

    // Sort by popularity score descending
    sportsReport.sort((a, b) => b.popularityScore - a.popularityScore);

    res.render('reports/index', {
      title: 'Analytics & Reports - Sports Scheduler',
      totalSessionsPlayed,
      totalUpcomingSessions,
      totalCancelledSessions,
      playedSessions,
      sportsReport,
      filters: {
        startDate: startDate || '',
        endDate: endDate || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
