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

async function loginAs(agent, userId = 5) {
  const token = await getCsrfToken(agent, '/login');
  const mockUser = {
    id: userId,
    firstName: 'Charlie',
    lastName: 'Striker',
    email: 'charlie@sports.test',
    role: 'player',
    verifyPassword: jest.fn().mockResolvedValue(true),
  };
  jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

  await agent
    .post('/session')
    .type('form')
    .send({
      email: 'charlie@sports.test',
      password: 'Password123',
      _csrf: token,
    });
}

describe('Session Participation Suite (Join / Leave)', () => {
  beforeEach(() => {
    jest.spyOn(Sport, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'findAll').mockResolvedValue([]);
    jest.spyOn(SessionParticipant, 'findAll').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /sessions/:id/join - Join Session', () => {
    it('should successfully join an open session and redirect to /sessions/joined', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockSession = {
        id: 77,
        creatorId: 1, // Different user
        dateTime: futureDate,
        additionalPlayersNeeded: 2,
        isCancelled: false,
        isPast: () => false,
        getRemainingSlots: () => 2,
        participants: [],
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);
      const participantCreateSpy = jest.spyOn(SessionParticipant, 'create').mockResolvedValue({
        id: 1,
        sessionId: 77,
        userId: 5,
      });

      const res = await agent
        .post('/sessions/77/join')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/joined');
      expect(participantCreateSpy).toHaveBeenCalledWith({
        sessionId: 77,
        userId: 5,
      });
    });

    it('should prevent joining if user has already joined', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 77,
        creatorId: 1,
        isCancelled: false,
        isPast: () => false,
        participants: [{ userId: 5 }], // Already joined
        getRemainingSlots: () => 1,
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/77/join')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/77');
    });

    it('should prevent joining if user is the session creator', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 77,
        creatorId: 5, // Same user
        isCancelled: false,
        isPast: () => false,
        participants: [],
        getRemainingSlots: () => 3,
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/77/join')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/77');
    });

    it('should prevent joining a past session', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 77,
        creatorId: 1,
        isCancelled: false,
        isPast: () => true, // Past
        participants: [],
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/77/join')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/77');
    });

    it('should prevent joining a cancelled session', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 77,
        creatorId: 1,
        isCancelled: true, // Cancelled
        participants: [],
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/77/join')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/77');
    });

    it('should prevent joining when all slots are full', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 77,
        creatorId: 1,
        isCancelled: false,
        isPast: () => false,
        participants: [{ userId: 2 }, { userId: 3 }],
        getRemainingSlots: () => 0, // 0 slots remaining
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent
        .post('/sessions/77/join')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/available');
    });
  });

  describe('POST /sessions/:id/leave - Leave Session', () => {
    it('should allow player to leave an upcoming session', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 5);
      const token = await getCsrfToken(agent, '/dashboard');

      const mockSession = {
        id: 77,
        isPast: () => false,
      };
      const mockParticipant = {
        id: 99,
        sessionId: 77,
        userId: 5,
        destroy: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);
      jest.spyOn(SessionParticipant, 'findOne').mockResolvedValue(mockParticipant);

      const res = await agent
        .post('/sessions/77/leave')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sessions/joined');
      expect(mockParticipant.destroy).toHaveBeenCalled();
    });
  });
});
