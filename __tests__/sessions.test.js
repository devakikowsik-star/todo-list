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

async function loginAs(agent, role = 'player', id = 2) {
  const token = await getCsrfToken(agent, '/login');
  const mockUser = {
    id: id,
    firstName: 'Alex',
    lastName: 'Player',
    email: 'alex@sports.test',
    role: role,
    verifyPassword: jest.fn().mockResolvedValue(true),
  };
  jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

  await agent
    .post('/session')
    .type('form')
    .send({
      email: 'alex@sports.test',
      password: 'Password123',
      _csrf: token,
    });
}

describe('Session Lifecycle Suite', () => {
  beforeEach(() => {
    jest.spyOn(Sport, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'findAll').mockResolvedValue([]);
    jest.spyOn(SessionParticipant, 'findAll').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /sessions/new - Session Creation Form', () => {
    it('should render session creation form when sports exist', async () => {
      const agent = request.agent(app);
      await loginAs(agent);

      jest.spyOn(Sport, 'findAll').mockResolvedValue([
        { id: 1, name: 'Cricket' },
        { id: 2, name: 'Football' },
      ]);

      const res = await agent.get('/sessions/new').expect(200);
      expect(res.text).toContain('Host a Sports Game');
      expect(res.text).toContain('Select Sport');
      expect(res.text).toContain('Venue / Location');
      expect(res.text).toContain('Additional Player Slots Needed');
    });

    it('should redirect to /sports if no sports exist yet', async () => {
      const agent = request.agent(app);
      await loginAs(agent);

      jest.spyOn(Sport, 'findAll').mockResolvedValue([]);

      const res = await agent.get('/sessions/new').expect(302);
      expect(res.header.location).toBe('/sports');
    });
  });

  describe('POST /sessions - Create Session Validation', () => {
    it('should successfully create session with future date and redirect to /sessions/my', async () => {
      const agent = request.agent(app);
      await loginAs(agent);
      const token = await getCsrfToken(agent, '/sessions/new');

      jest.spyOn(Sport, 'findByPk').mockResolvedValue({ id: 1, name: 'Cricket' });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const createSpy = jest.spyOn(Session, 'create').mockResolvedValue({
        id: 100,
        sportId: 1,
        creatorId: 2,
        venue: 'Starlight Stadium',
        dateTime: futureDate,
        additionalPlayersNeeded: 5,
        existingPlayers: 'John, Sam',
      });

      const res = await agent
        .post('/sessions')
        .type('form')
        .send({
          sportId: 1,
          venue: 'Starlight Stadium',
          dateTime: futureDate.toISOString().slice(0, 16),
          additionalPlayersNeeded: 5,
          existingPlayers: 'John, Sam',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sessions/my');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          venue: 'Starlight Stadium',
          additionalPlayersNeeded: 5,
        })
      );
    });

    it('should reject session creation when venue is missing', async () => {
      const agent = request.agent(app);
      await loginAs(agent);
      const token = await getCsrfToken(agent, '/sessions/new');

      jest.spyOn(Sport, 'findAll').mockResolvedValue([{ id: 1, name: 'Cricket' }]);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const res = await agent
        .post('/sessions')
        .type('form')
        .send({
          sportId: 1,
          venue: '',
          dateTime: futureDate.toISOString().slice(0, 16),
          additionalPlayersNeeded: 4,
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('Venue cannot be empty');
    });

    it('should reject session creation when scheduled date is in the past', async () => {
      const agent = request.agent(app);
      await loginAs(agent);
      const token = await getCsrfToken(agent, '/sessions/new');

      jest.spyOn(Sport, 'findAll').mockResolvedValue([{ id: 1, name: 'Cricket' }]);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);

      const res = await agent
        .post('/sessions')
        .type('form')
        .send({
          sportId: 1,
          venue: 'Old Arena',
          dateTime: pastDate.toISOString().slice(0, 16),
          additionalPlayersNeeded: 4,
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('Session date and time must be set in the future');
    });

    it('should reject session creation when additional slots is negative', async () => {
      const agent = request.agent(app);
      await loginAs(agent);
      const token = await getCsrfToken(agent, '/sessions/new');

      jest.spyOn(Sport, 'findAll').mockResolvedValue([{ id: 1, name: 'Cricket' }]);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const res = await agent
        .post('/sessions')
        .type('form')
        .send({
          sportId: 1,
          venue: 'Ground 1',
          dateTime: futureDate.toISOString().slice(0, 16),
          additionalPlayersNeeded: -2,
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('Additional players needed must be 0 or more');
    });
  });

  describe('GET /sessions/available - Available Sessions List', () => {
    it('should list available sessions that user has not created or joined', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player', 2);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const mockSession = {
        id: 50,
        creatorId: 99, // Another user created it
        venue: 'Metro Sports Park',
        dateTime: futureDate,
        additionalPlayersNeeded: 3,
        isCancelled: false,
        sport: { name: 'Football' },
        creator: { firstName: 'Dave' },
        participants: [], // No participants yet
        getRemainingSlots: () => 3,
      };

      jest.spyOn(Session, 'findAll').mockResolvedValue([mockSession]);

      const res = await agent.get('/sessions/available').expect(200);
      expect(res.text).toContain('Available Sessions');
      expect(res.text).toContain('Metro Sports Park');
      expect(res.text).toContain('3 slots open');
    });
  });

  describe('GET /sessions/:id - Session Details View', () => {
    it('should render detailed view of a session', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player', 2);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 4);

      const mockSession = {
        id: 12,
        creatorId: 1,
        venue: 'Grand Central Field',
        dateTime: futureDate,
        additionalPlayersNeeded: 4,
        existingPlayers: 'Mike, Tom',
        isCancelled: false,
        sport: { name: 'Basketball' },
        creator: { firstName: 'Coach', lastName: 'Carter' },
        participants: [
          { userId: 3, user: { firstName: 'Jordan', lastName: 'B' } },
        ],
        isPast: () => false,
        getRemainingSlots: () => 3,
      };

      jest.spyOn(Session, 'findByPk').mockResolvedValue(mockSession);

      const res = await agent.get('/sessions/12').expect(200);
      expect(res.text).toContain('Grand Central Field');
      expect(res.text).toContain('Basketball');
      expect(res.text).toContain('Coach Carter');
      expect(res.text).toContain('Jordan B');
      expect(res.text).toContain('Mike, Tom');
    });

    it('should redirect if session is not found', async () => {
      const agent = request.agent(app);
      await loginAs(agent);

      jest.spyOn(Session, 'findByPk').mockResolvedValue(null);

      const res = await agent.get('/sessions/9999').expect(302);
      expect(res.header.location).toBe('/dashboard');
    });
  });
});
