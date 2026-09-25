'use strict';

const request = require('supertest');
const cheerio = require('cheerio');
const app = require('../app');
const { Session, Sport, User, SessionParticipant } = require('../models');

async function getCsrfToken(agent, path = '/login') {
  const res = await agent.get(path).set('Accept', 'text/html');
  const $ = cheerio.load(res.text);
  const token = $('meta[name="csrf-token"]').attr('content') || $('input[name="_csrf"]').val();
  return token || '';
}

async function loginAs(agent, userId = 10, role = 'player') {
  const token = await getCsrfToken(agent, '/login');
  const mockUser = {
    id: userId,
    firstName: 'Organizer',
    lastName: 'Dan',
    email: 'organizer@sports.test',
    role: role,
    verifyPassword: jest.fn().mockResolvedValue(true),
  };
  jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

  await agent
    .post('/session')
    .type('form')
    .send({
      email: 'organizer@sports.test',
      password: 'Password123',
      _csrf: token,
    });
}

describe('Session Cancellation Suite', () => {
  beforeEach(() => {
    jest.spyOn(Sport, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'findAll').mockResolvedValue([]);
    jest.spyOn(SessionParticipant, 'findAll').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /sessions/:id/cancel - Cancellation Page', () => {
    it('should render cancel session page for creator', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 10);

      const mockSession = {
        id: 42,
        creatorId: 10, // Matching creator
        venue: 'Park Turf Ground',
        dateTime: new Date(Date.now() + 86400000),
        isCancelled: false,
        sport: { name: 'Football' },
      };
      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent.get('/sessions/42/cancel').expect(200);
      expect(res.text).toContain('Cancel Sports Session');
      expect(res.text).toContain('Reason for Cancellation');
      expect(res.text).toContain('Park Turf Ground');
    });

    it('should block non-creator from viewing cancel page', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 10); // Logged in as user 10

      const mockSession = {
        id: 42,
        creatorId: 99, // Created by user 99
        isCancelled: false,
      };
      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent.get('/sessions/42/cancel').expect(302);
      expect(res.header.location).toBe('/sessions/42');
    });
  });

  describe('POST /sessions/:id/cancel - Cancellation Submission', () => {
    it('should successfully cancel session when mandatory reason is provided', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 10);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 42,
        creatorId: 10,
        isCancelled: false,
        cancellationReason: null,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/42/cancel')
        .type('form')
        .send({
          cancellationReason: 'Heavy thunderstorm warning across the city.',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sessions/42');
      expect(mockSession.isCancelled).toBe(true);
      expect(mockSession.cancellationReason).toBe(
        'Heavy thunderstorm warning across the city.'
      );
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should reject cancellation if cancellation reason is empty', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 10);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 42,
        creatorId: 10,
        isCancelled: false,
        save: jest.fn(),
      };
      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/42/cancel')
        .type('form')
        .send({
          cancellationReason: '   ',
          _csrf: token,
        })
        .expect(400);

      expect(mockSession.save).not.toHaveBeenCalled();
    });

    it('should block non-creator from cancelling session', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 10);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 42,
        creatorId: 99, // Different user
        isCancelled: false,
        save: jest.fn(),
      };
      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/42/cancel')
        .type('form')
        .send({
          cancellationReason: 'Someone else cancelling',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sessions/42');
      expect(mockSession.save).not.toHaveBeenCalled();
    });
  });
});
