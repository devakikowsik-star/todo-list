'use strict';

const request = require('supertest');
const cheerio = require('cheerio');
const app = require('../app');
const { Session, Sport, User } = require('../models');

async function getCsrfToken(agent, path = '/login') {
  const res = await agent.get(path).set('Accept', 'text/html');
  const $ = cheerio.load(res.text);
  const token = $('input[name="_csrf"]').val();
  return token || '';
}

async function loginAs(agent, role = 'admin') {
  const token = await getCsrfToken(agent, '/login');
  const mockUser = {
    id: role === 'admin' ? 1 : 2,
    firstName: role === 'admin' ? 'Admin' : 'Player',
    lastName: 'User',
    email: `${role}@sports.test`,
    role: role,
    verifyPassword: jest.fn().mockResolvedValue(true),
  };
  jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

  await agent
    .post('/session')
    .type('form')
    .send({
      email: `${role}@sports.test`,
      password: 'Password123',
      _csrf: token,
    });
}

describe('Admin Reports & Analytics Suite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /reports - Role Access Control', () => {
    it('should block non-admin player with status 403', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player');

      const res = await agent.get('/reports').expect(403);
      expect(res.text).toContain('Access Denied');
    });

    it('should allow admin to view reports dashboard', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');

      jest.spyOn(Session, 'findAll').mockResolvedValue([
        {
          id: 1,
          venue: 'City Court',
          dateTime: new Date('2026-08-15'),
          isCancelled: false,
          sport: { name: 'Badminton' },
          participants: [{ id: 1 }, { id: 2 }],
        },
      ]);
      jest.spyOn(Session, 'count').mockResolvedValue(1);
      jest.spyOn(Sport, 'findAll').mockResolvedValue([
        {
          id: 1,
          name: 'Badminton',
          sessions: [{ participants: [{ id: 1 }, { id: 2 }] }],
        },
      ]);

      const res = await agent.get('/reports').expect(200);
      expect(res.text).toContain('Sports Analytics & Reports');
      expect(res.text).toContain('Sessions Played');
      expect(res.text).toContain('Popular Sports Report');
      expect(res.text).toContain('Badminton');
    });
  });

  describe('GET /reports - Metrics & Date Filtering', () => {
    it('should correctly filter completed sessions by date range', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');

      const findAllSpy = jest.spyOn(Session, 'findAll').mockResolvedValue([]);
      jest.spyOn(Session, 'count').mockResolvedValue(0);
      jest.spyOn(Sport, 'findAll').mockResolvedValue([]);

      const res = await agent
        .get('/reports?startDate=2026-08-01&endDate=2026-08-31')
        .expect(200);

      expect(res.text).toContain('2026-08-01');
      expect(res.text).toContain('2026-08-31');
      expect(findAllSpy).toHaveBeenCalled();
    });
  });
});
