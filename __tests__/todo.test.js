const request = require('supertest');
const cheerio = require('cheerio');
const app = require('../app');
const { Todo } = require('../models');

// Helper to extract CSRF token from HTML view
async function getCsrfToken(agent) {
  const res = await agent.get('/').set('Accept', 'text/html');
  const $ = cheerio.load(res.text);
  const token = $('input[name="_csrf"]').val();
  return token || '';
}

describe('Express Todo Manager - Milestone Tests', () => {
  beforeEach(() => {
    jest.spyOn(Todo, 'overdue').mockResolvedValue([]);
    jest.spyOn(Todo, 'dueToday').mockResolvedValue([]);
    jest.spyOn(Todo, 'dueLater').mockResolvedValue([]);
    jest.spyOn(Todo, 'completedItems').mockResolvedValue([]);
    jest.spyOn(Todo, 'completed').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CSRF Security Protection', () => {
    it('should reject POST /todos without CSRF token with status 403', async () => {
      const res = await request(app)
        .post('/todos')
        .send({ title: 'Unauthorized Task', dueDate: '2026-10-01' })
        .expect(403);

      expect(res.body).toHaveProperty('error', 'Invalid or missing CSRF token');
    });

    it('should reject PUT /todos/:id without CSRF token with status 403', async () => {
      const res = await request(app)
        .put('/todos/1')
        .send({ completed: true })
        .expect(403);

      expect(res.body).toHaveProperty('error', 'Invalid or missing CSRF token');
    });

    it('should reject DELETE /todos/:id without CSRF token with status 403', async () => {
      const res = await request(app)
        .delete('/todos/1')
        .expect(403);

      expect(res.body).toHaveProperty('error', 'Invalid or missing CSRF token');
    });
  });

  describe('POST /todos - Todo Creation & Validation', () => {
    it('should create a new todo and return status 201 with valid CSRF token', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const newTodo = {
        id: 10,
        title: 'Buy groceries',
        dueDate: '2026-10-10',
        completed: false,
      };

      const createSpy = jest.spyOn(Todo, 'create').mockResolvedValue(newTodo);

      const res = await agent
        .post('/todos')
        .send({
          title: 'Buy groceries',
          dueDate: '2026-10-10',
          _csrf: token,
        })
        .expect(201);

      expect(createSpy).toHaveBeenCalledWith({
        title: 'Buy groceries',
        dueDate: '2026-10-10',
        completed: false,
      });
      expect(res.body).toEqual(newTodo);
    });

    it('should redirect to / when html form is submitted with valid CSRF token', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const newTodo = {
        id: 11,
        title: 'Finish lab report',
        dueDate: '2026-10-12',
        completed: false,
      };

      jest.spyOn(Todo, 'create').mockResolvedValue(newTodo);

      const res = await agent
        .post('/todos')
        .type('form')
        .set('Accept', 'text/html')
        .send({
          title: 'Finish lab report',
          dueDate: '2026-10-12',
          _csrf: token,
        })
        .expect(302);

      expect(res.header.location).toBe('/');
    });

    it('should return status 400 if title is missing or empty', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const res = await agent
        .post('/todos')
        .send({
          title: '   ',
          dueDate: '2026-10-15',
          _csrf: token,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Title is required and cannot be empty');
    });

    it('should return status 400 if dueDate is missing or empty', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const res = await agent
        .post('/todos')
        .send({
          title: 'Valid title',
          dueDate: '',
          _csrf: token,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Due date is required and cannot be empty');
    });

    it('should return status 500 if database creation fails', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      jest.spyOn(Todo, 'create').mockRejectedValue(new Error('Database insertion error'));

      const res = await agent
        .post('/todos')
        .send({
          title: 'Crash test',
          dueDate: '2026-10-20',
          _csrf: token,
        })
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Database insertion error');
    });
  });

  describe('PUT /todos/:id - Update Completion Status', () => {
    it('should mark todo as complete (completed: true) using setCompletionStatus()', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const mockTodo = {
        id: 1,
        title: 'Task to complete',
        completed: false,
        setCompletionStatus: jest.fn().mockImplementation((completed) =>
          Promise.resolve({
            id: 1,
            title: 'Task to complete',
            completed: Boolean(completed),
          })
        ),
      };

      jest.spyOn(Todo, 'findByPk').mockResolvedValue(mockTodo);

      const res = await agent
        .put('/todos/1')
        .send({
          completed: true,
          _csrf: token,
        })
        .expect(200);

      expect(mockTodo.setCompletionStatus).toHaveBeenCalledWith(true);
      expect(res.body.completed).toBe(true);
    });

    it('should mark todo as incomplete (completed: false) using setCompletionStatus()', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const mockTodo = {
        id: 2,
        title: 'Task to uncomplete',
        completed: true,
        setCompletionStatus: jest.fn().mockImplementation((completed) =>
          Promise.resolve({
            id: 2,
            title: 'Task to uncomplete',
            completed: Boolean(completed),
          })
        ),
      };

      jest.spyOn(Todo, 'findByPk').mockResolvedValue(mockTodo);

      const res = await agent
        .put('/todos/2')
        .send({
          completed: false,
          _csrf: token,
        })
        .expect(200);

      expect(mockTodo.setCompletionStatus).toHaveBeenCalledWith(false);
      expect(res.body.completed).toBe(false);
    });

    it('should toggle completion status when completed field is not provided', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const mockTodo = {
        id: 3,
        title: 'Toggle task',
        completed: false,
        setCompletionStatus: jest.fn().mockImplementation((completed) =>
          Promise.resolve({
            id: 3,
            title: 'Toggle task',
            completed: Boolean(completed),
          })
        ),
      };

      jest.spyOn(Todo, 'findByPk').mockResolvedValue(mockTodo);

      const res = await agent
        .put('/todos/3')
        .send({
          _csrf: token,
        })
        .expect(200);

      expect(mockTodo.setCompletionStatus).toHaveBeenCalledWith(true);
      expect(res.body.completed).toBe(true);
    });

    it('should return status 404 if todo to update is not found', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      jest.spyOn(Todo, 'findByPk').mockResolvedValue(null);

      const res = await agent
        .put('/todos/999')
        .send({
          completed: true,
          _csrf: token,
        })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Todo with id 999 not found');
    });

    it('should return status 500 if Todo.findByPk fails', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      jest.spyOn(Todo, 'findByPk').mockRejectedValue(new Error('Query error'));

      const res = await agent
        .put('/todos/1')
        .send({
          completed: true,
          _csrf: token,
        })
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Query error');
    });
  });

  describe('DELETE /todos/:id - Todo Deletion', () => {
    it('should delete a todo by id using Todo.destroy() with status 200', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      const destroySpy = jest.spyOn(Todo, 'destroy').mockResolvedValue(1);

      const res = await agent
        .delete('/todos/1')
        .send({ _csrf: token })
        .expect(200);

      expect(destroySpy).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.body).toEqual({
        success: true,
        message: 'Todo with id 1 deleted successfully',
      });
    });

    it('should return status 404 if todo to delete is not found', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      jest.spyOn(Todo, 'destroy').mockResolvedValue(0);

      const res = await agent
        .delete('/todos/999')
        .send({ _csrf: token })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Todo with id 999 not found');
    });

    it('should return status 500 if Todo.destroy fails', async () => {
      const agent = request.agent(app);
      const token = await getCsrfToken(agent);

      jest.spyOn(Todo, 'destroy').mockRejectedValue(new Error('Delete error'));

      const res = await agent
        .delete('/todos/1')
        .send({ _csrf: token })
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Delete error');
    });
  });

  describe('GET /todos - API Listing', () => {
    it('should return a list of todos using Todo.findAll() with status 200', async () => {
      const mockTodos = [
        { id: 1, title: 'Task 1', dueDate: '2026-09-30', completed: false },
        { id: 2, title: 'Task 2', dueDate: '2026-10-05', completed: true },
      ];

      const findAllSpy = jest.spyOn(Todo, 'findAll').mockResolvedValue(mockTodos);

      const res = await request(app)
        .get('/todos')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].completed).toBe(true);
    });

    it('should return an empty array if no todos exist', async () => {
      jest.spyOn(Todo, 'findAll').mockResolvedValue([]);

      const res = await request(app)
        .get('/todos')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return status 500 if Todo.findAll() fails', async () => {
      jest.spyOn(Todo, 'findAll').mockRejectedValue(new Error('Database query failure'));

      const res = await request(app)
        .get('/todos')
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Database query failure');
    });
  });

  describe('GET / - Dashboard View with Categories, Partials & Counts', () => {
    it('should render HTML dashboard with 4 categories and verify completed items are excluded from first three', async () => {
      const overdueList = [
        { id: 1, title: 'Overdue task 1', dueDate: '2026-09-01', completed: false },
        { id: 2, title: 'Overdue task 2', dueDate: '2026-09-10', completed: false },
      ];
      const dueTodayList = [
        { id: 3, title: 'Today task', dueDate: '2026-09-24', completed: false },
      ];
      const dueLaterList = [
        { id: 4, title: 'Future task 1', dueDate: '2026-10-01', completed: false },
        { id: 5, title: 'Future task 2', dueDate: '2026-10-15', completed: false },
      ];
      const completedList = [
        { id: 6, title: 'Completed task 1', dueDate: '2026-09-02', completed: true },
        { id: 7, title: 'Completed task 2', dueDate: '2026-09-24', completed: true },
      ];

      jest.spyOn(Todo, 'overdue').mockResolvedValue(overdueList);
      jest.spyOn(Todo, 'dueToday').mockResolvedValue(dueTodayList);
      jest.spyOn(Todo, 'dueLater').mockResolvedValue(dueLaterList);
      jest.spyOn(Todo, 'completedItems').mockResolvedValue(completedList);

      const res = await request(app)
        .get('/')
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(200);

      const html = res.text;

      // Category headings
      expect(html).toContain('Overdue');
      expect(html).toContain('Due Today');
      expect(html).toContain('Due Later');
      expect(html).toContain('Completed Items');

      // Category counts
      expect(html).toContain('id="count-overdue">2<');
      expect(html).toContain('id="count-due-today">1<');
      expect(html).toContain('id="count-due-later">2<');
      expect(html).toContain('id="count-completed">2<');

      // Items rendered
      expect(html).toContain('Overdue task 1');
      expect(html).toContain('Today task');
      expect(html).toContain('Future task 1');
      expect(html).toContain('Completed task 1');

      // Verify header and footer partials
      expect(html).toContain('My Todo-List');
      expect(html).toContain('Built with Express.js');

      // Verify CSRF input exists in the form
      expect(html).toContain('name="_csrf"');
    });

    it('should render empty category placeholder when categories have 0 todos', async () => {
      jest.spyOn(Todo, 'overdue').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueToday').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueLater').mockResolvedValue([]);
      jest.spyOn(Todo, 'completedItems').mockResolvedValue([]);

      const res = await request(app)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200);

      const html = res.text;
      expect(html).toContain('id="count-overdue">0<');
      expect(html).toContain('id="count-due-today">0<');
      expect(html).toContain('id="count-due-later">0<');
      expect(html).toContain('id="count-completed">0<');
      expect(html).toContain('No tasks in this category.');
    });

    it('should return JSON categorized data when JSON is accepted', async () => {
      jest.spyOn(Todo, 'overdue').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueToday').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueLater').mockResolvedValue([]);
      jest.spyOn(Todo, 'completedItems').mockResolvedValue([]);

      const res = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('overdueTodos');
      expect(res.body).toHaveProperty('dueTodayTodos');
      expect(res.body).toHaveProperty('dueLaterTodos');
      expect(res.body).toHaveProperty('completedTodos');
      expect(res.body.overdueCount).toBe(0);
      expect(res.body.dueTodayCount).toBe(0);
      expect(res.body.dueLaterCount).toBe(0);
      expect(res.body.completedCount).toBe(0);
    });

    it('should return status 500 when fetching dashboard todos fails', async () => {
      jest.spyOn(Todo, 'overdue').mockRejectedValue(new Error('Fetch failed'));

      const res = await request(app)
        .get('/')
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Fetch failed');
    });
  });
});