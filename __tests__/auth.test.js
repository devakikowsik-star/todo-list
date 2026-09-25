'use strict';

const request = require('supertest');
const cheerio = require('cheerio');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { User, Sport, Session, SessionParticipant } = require('../models');

// Helper to extract CSRF token from HTML view
async function getCsrfToken(agent, path = '/login') {
  const res = await agent.get(path).set('Accept', 'text/html');
  const $ = cheerio.load(res.text);
  const token = $('meta[name="csrf-token"]').attr('content') || $('input[name="_csrf"]').val();
  return token || '';
}

describe('Authentication & User Management Suite', () => {
  beforeEach(() => {
    jest.spyOn(Sport, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'count').mockResolvedValue(0);
    jest.spyOn(Session, 'findAll').mockResolvedValue([]);
    jest.spyOn(SessionParticipant, 'findAll').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /signup - Registration Page', () => {
    it('should render the signup page with CSRF token and role options', async () => {
      const res = await request(app).get('/signup').expect(200);

      expect(res.text).toContain('Create Your Account');
      expect(res.text).toContain('name="_csrf"');
      expect(res.text).toContain('rolePlayer');
      expect(res.text).toContain('roleAdmin');
    });
  });

  describe('POST /users - User Registration', () => {
    it('should reject signup without CSRF token with status 403', async () => {
      const res = await request(app)
        .post('/users')
        .send({
          firstName: 'Alice',
          email: 'alice@example.com',
          password: 'Password123',
        })
        .expect(403);

      expect(res.body).toHaveProperty('error', 'Invalid or missing CSRF token');
    });

    it('should reject signup when firstName is missing', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/signup');

      const res = await agent
        .post('/users')
        .type('form')
        .send({
          firstName: '',
          email: 'alice@example.com',
          password: 'Password123',
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('First name cannot be empty');
    });

    it('should reject signup when email is missing', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/signup');

      const res = await agent
        .post('/users')
        .type('form')
        .send({
          firstName: 'Alice',
          email: '',
          password: 'Password123',
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('Email cannot be empty');
    });

    it('should reject signup when password is empty', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/signup');

      const res = await agent
        .post('/users')
        .type('form')
        .send({
          firstName: 'Alice',
          email: 'alice@example.com',
          password: '',
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('Password cannot be empty');
    });

    it('should reject signup if email is already registered', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/signup');

      jest.spyOn(User, 'findOne').mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
      });

      const res = await agent
        .post('/users')
        .type('form')
        .send({
          firstName: 'Alice',
          email: 'alice@example.com',
          password: 'Password123',
          _csrf: token,
        })
        .expect(400);

      expect(res.text).toContain('Email is already registered');
    });

    it('should successfully register a new player user and redirect to /login', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/signup');

      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'create').mockResolvedValue({
        id: 10,
        firstName: 'Bob',
        lastName: 'Athlete',
        email: 'bob@example.com',
        role: 'player',
      });

      const res = await agent
        .post('/users')
        .type('form')
        .send({
          firstName: 'Bob',
          lastName: 'Athlete',
          email: 'bob@example.com',
          password: 'Password123',
          role: 'player',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/login');
    });

    it('should successfully register an admin user if admin role selected', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/signup');

      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const createSpy = jest.spyOn(User, 'create').mockResolvedValue({
        id: 11,
        firstName: 'Coach',
        email: 'coach@example.com',
        role: 'admin',
      });

      await agent
        .post('/users')
        .type('form')
        .send({
          firstName: 'Coach',
          email: 'coach@example.com',
          password: 'Password123',
          role: 'admin',
          _csrf: token,
        })
        .expect(302);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        })
      );
    });
  });

  describe('GET /login & POST /session - User Authentication', () => {
    it('should render the login form', async () => {
      const res = await request(app).get('/login').expect(200);

      expect(res.text).toContain('Welcome Back');
      expect(res.text).toContain('name="email"');
      expect(res.text).toContain('name="password"');
    });

    it('should authenticate user and redirect to /dashboard on valid credentials', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/login');

      const mockUser = {
        id: 1,
        firstName: 'John',
        email: 'john@example.com',
        role: 'player',
        verifyPassword: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

      const res = await agent
        .post('/session')
        .type('form')
        .send({
          email: 'john@example.com',
          password: 'CorrectPassword123',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/dashboard');
    });

    it('should reject login with invalid password and redirect to /login', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/login');

      const mockUser = {
        id: 1,
        email: 'john@example.com',
        verifyPassword: jest.fn().mockResolvedValue(false),
      };
      jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

      const res = await agent
        .post('/session')
        .type('form')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/login');
    });

    it('should reject login when user email is not found', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent, '/login');

      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      const res = await agent
        .post('/session')
        .type('form')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/login');
    });
  });

  describe('GET /signout & /logout - Session Termination', () => {
    it('should log out user and redirect to /login', async () => {
      const res = await request(app).get('/signout').expect(302);
      expect(res.header.location).toBe('/login');
    });
  });
});
