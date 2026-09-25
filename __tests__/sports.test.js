'use strict';

const request = require('supertest');
const cheerio = require('cheerio');
const app = require('../app');
const { Sport, User, Session, SessionParticipant } = require('../models');

async function getCsrfToken(agent, path = '/login') {
  const res = await agent.get(path).set('Accept', 'text/html');
  const $ = cheerio.load(res.text);
  const token = $('meta[name="csrf-token"]').attr('content') || $('input[name="_csrf"]').val();
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

describe('Sports Management Suite (Admin & Player RBAC)', () => {
  beforeEach(() => {
    jest.spyOn(Sport, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'findAll').mockResolvedValue([]);
    jest.spyOn(SessionParticipant, 'findAll').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /sports - Sports Listing', () => {
    it('should redirect unauthenticated users to /login', async () => {
      const res = await request(app).get('/sports').expect(302);
      expect(res.header.location).toBe('/login');
    });

    it('should allow authenticated users to view the sports directory', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player');

      jest.spyOn(Sport, 'findAll').mockResolvedValue([
        { id: 1, name: 'Cricket', sessions: [], creator: { firstName: 'Admin' } },
        { id: 2, name: 'Football', sessions: [], creator: { firstName: 'Admin' } },
      ]);

      const res = await agent.get('/sports').expect(200);
      expect(res.text).toContain('Sports Directory');
      expect(res.text).toContain('Cricket');
      expect(res.text).toContain('Football');
    });
  });

  describe('POST /sports - Create Sport (Admin Only)', () => {
    it('should block non-admin players from creating a sport with status 403', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player');
      const token = await getCsrfToken(agent, '/sports');

      const res = await agent
        .post('/sports')
        .type('form')
        .send({
          name: 'Tennis',
          _csrf: token,
        })
        .expect(403);

      expect(res.text).toContain('Access Denied');
    });

    it('should allow admin to create a new sport and redirect to /sports', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');
      const token = await getCsrfToken(agent, '/sports');

      jest.spyOn(Sport, 'findOne').mockResolvedValue(null);
      const createSpy = jest.spyOn(Sport, 'create').mockResolvedValue({
        id: 3,
        name: 'Basketball',
        userId: 1,
      });

      const res = await agent
        .post('/sports')
        .type('form')
        .send({
          name: 'Basketball',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sports');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Basketball',
        })
      );
    });

    it('should reject creating a sport with an empty name', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');
      const token = await getCsrfToken(agent, '/sports');

      const res = await agent
        .post('/sports')
        .type('form')
        .send({
          name: '   ',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sports');
    });

    it('should reject creating a sport when the name already exists', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');
      const token = await getCsrfToken(agent, '/sports');

      jest.spyOn(Sport, 'findOne').mockResolvedValue({
        id: 1,
        name: 'Cricket',
      });

      const res = await agent
        .post('/sports')
        .type('form')
        .send({
          name: 'Cricket',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sports');
    });
  });

  describe('POST /sports/:id - Edit Sport (Admin Only)', () => {
    it('should block non-admin players from editing a sport with status 403', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player');
      const token = await getCsrfToken(agent, '/sports');

      const res = await agent
        .post('/sports/1')
        .type('form')
        .send({
          name: 'Tennis Pro',
          _csrf: token,
        })
        .expect(403);

      expect(res.text).toContain('Access Denied');
    });

    it('should allow admin to edit sport name', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');
      const token = await getCsrfToken(agent, '/sports');

      const mockSport = {
        id: 1,
        name: 'Old Sport',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Sport, 'findByPk').mockResolvedValue(mockSport);
      jest.spyOn(Sport, 'findOne').mockResolvedValue(null);

      const res = await agent
        .post('/sports/1')
        .type('form')
        .send({
          name: 'Updated Sport Name',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/sports');
      expect(mockSport.name).toBe('Updated Sport Name');
      expect(mockSport.save).toHaveBeenCalled();
    });
  });

  describe('POST /sports/:id/delete - Delete Sport (Admin Only)', () => {
    it('should block non-admin players from deleting a sport with status 403', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'player');
      const token = await getCsrfToken(agent, '/sports');

      const res = await agent
        .post('/sports/1/delete')
        .type('form')
        .send({ _csrf: token })
        .expect(403);

      expect(res.text).toContain('Access Denied');
    });

    it('should allow admin to delete sport', async () => {
      const agent = request.agent(app);
      await loginAs(agent, 'admin');
      const token = await getCsrfToken(agent, '/sports');

      const mockSport = {
        id: 1,
        name: 'Sport to Delete',
        destroy: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Sport, 'findByPk').mockResolvedValue(mockSport);

      const res = await agent
        .post('/sports/1/delete')
        .type('form')
        .send({ _csrf: token })
        .expect(302);

      expect(res.header.location).toBe('/sports');
      expect(mockSport.destroy).toHaveBeenCalled();
    });
  });
});
