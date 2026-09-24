const request = require('supertest');
const app = require('../app');
const { Todo } = require('../models');

describe('Todo Routes - GET and DELETE', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /todos', () => {
    it('should return a list of todos using Todo.findAll() with status 200', async () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Complete homework',
          dueDate: '2026-09-30',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Submit project report',
          dueDate: '2026-10-05',
          completed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const findAllSpy = jest.spyOn(Todo, 'findAll').mockResolvedValue(mockTodos);

      const res = await request(app)
        .get('/todos')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Complete homework');
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

  describe('DELETE /todos/:id', () => {
    it('should delete a todo by id using Todo.destroy() with status 200', async () => {
      const destroySpy = jest.spyOn(Todo, 'destroy').mockResolvedValue(1);

      const res = await request(app)
        .delete('/todos/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(destroySpy).toHaveBeenCalledTimes(1);
      expect(destroySpy).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.body).toEqual({
        success: true,
        message: 'Todo with id 1 deleted successfully',
      });
    });

    it('should return status 404 if the todo to delete is not found', async () => {
      jest.spyOn(Todo, 'destroy').mockResolvedValue(0);

      const res = await request(app)
        .delete('/todos/999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Todo with id 999 not found');
    });

    it('should return status 500 if Todo.destroy() fails', async () => {
      jest.spyOn(Todo, 'destroy').mockRejectedValue(new Error('Database delete error'));

      const res = await request(app)
        .delete('/todos/1')
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Database delete error');
    });
  });

  describe('POST /todos (helper creation endpoint)', () => {
    it('should create a new todo and return status 201', async () => {
      const newTodo = {
        id: 3,
        title: 'Buy groceries',
        dueDate: '2026-09-28',
        completed: false,
      };

      const createSpy = jest.spyOn(Todo, 'create').mockResolvedValue(newTodo);

      const res = await request(app)
        .post('/todos')
        .send({
          title: 'Buy groceries',
          dueDate: '2026-09-28',
          completed: false,
        })
        .expect(201);

      expect(createSpy).toHaveBeenCalledWith({
        title: 'Buy groceries',
        dueDate: '2026-09-28',
        completed: false,
      });
      expect(res.body).toEqual(newTodo);
    });

    it('should return status 400 if title is missing', async () => {
      const res = await request(app)
        .post('/todos')
        .send({ dueDate: '2026-09-28' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Title is required');
    });

    it('should redirect to / when html is requested after todo creation', async () => {
      const newTodo = {
        id: 4,
        title: 'Submit assignment',
        dueDate: '2026-09-29',
        completed: false,
      };

      jest.spyOn(Todo, 'create').mockResolvedValue(newTodo);

      const res = await request(app)
        .post('/todos')
        .type('form')
        .set('Accept', 'text/html')
        .send({
          title: 'Submit assignment',
          dueDate: '2026-09-29',
        })
        .expect(302);

      expect(res.header.location).toBe('/');
    });
  });

  describe('PUT /todos/:id', () => {
    it('should update todo completion status and return 200', async () => {
      const mockTodo = {
        id: 1,
        title: 'Task 1',
        completed: false,
        update: jest.fn().mockImplementation((fields) =>
          Promise.resolve({
            id: 1,
            title: 'Task 1',
            completed: fields.completed,
          })
        ),
      };

      jest.spyOn(Todo, 'findByPk').mockResolvedValue(mockTodo);

      const res = await request(app)
        .put('/todos/1')
        .send({ completed: true })
        .expect(200);

      expect(mockTodo.update).toHaveBeenCalledWith({ completed: true });
      expect(res.body.completed).toBe(true);
    });

    it('should toggle todo completion status when completed is not explicitly provided', async () => {
      const mockTodo = {
        id: 2,
        title: 'Task 2',
        completed: true,
        update: jest.fn().mockImplementation((fields) =>
          Promise.resolve({
            id: 2,
            title: 'Task 2',
            completed: fields.completed,
          })
        ),
      };

      jest.spyOn(Todo, 'findByPk').mockResolvedValue(mockTodo);

      const res = await request(app)
        .put('/todos/2')
        .send({})
        .expect(200);

      expect(mockTodo.update).toHaveBeenCalledWith({ completed: false });
      expect(res.body.completed).toBe(false);
    });

    it('should return 404 if todo to update is not found', async () => {
      jest.spyOn(Todo, 'findByPk').mockResolvedValue(null);

      const res = await request(app)
        .put('/todos/999')
        .send({ completed: true })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Todo with id 999 not found');
    });

    it('should return 500 if update fails', async () => {
      jest.spyOn(Todo, 'findByPk').mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/todos/1')
        .send({ completed: true })
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('Dashboard View - GET / with EJS partials and counts', () => {
    it('should render HTML dashboard with categorized todos and matching counts', async () => {
      const overdueList = [
        { id: 1, title: 'Overdue task 1', dueDate: '2026-09-01', completed: false },
        { id: 2, title: 'Overdue task 2', dueDate: '2026-09-10', completed: true },
      ];
      const dueTodayList = [
        { id: 3, title: 'Today task', dueDate: '2026-09-24', completed: false },
      ];
      const dueLaterList = [
        { id: 4, title: 'Future task 1', dueDate: '2026-10-01', completed: false },
        { id: 5, title: 'Future task 2', dueDate: '2026-10-15', completed: false },
        { id: 6, title: 'Future task 3', dueDate: '2026-10-20', completed: true },
      ];

      jest.spyOn(Todo, 'overdue').mockResolvedValue(overdueList);
      jest.spyOn(Todo, 'dueToday').mockResolvedValue(dueTodayList);
      jest.spyOn(Todo, 'dueLater').mockResolvedValue(dueLaterList);

      const res = await request(app)
        .get('/')
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(200);

      const html = res.text;

      // Category headings and count spans
      expect(html).toContain('Overdue');
      expect(html).toContain('Due Today');
      expect(html).toContain('Due Later');

      expect(html).toContain('id="count-overdue">2<');
      expect(html).toContain('id="count-due-today">1<');
      expect(html).toContain('id="count-due-later">3<');

      // Verify todos rendered via todos.ejs partial
      expect(html).toContain('Overdue task 1');
      expect(html).toContain('Overdue task 2');
      expect(html).toContain('Today task');
      expect(html).toContain('Future task 1');
      expect(html).toContain('Future task 2');
      expect(html).toContain('Future task 3');

      // Verify checkboxes and completion styling
      expect(html).toContain('id="todo-checkbox-1"');
      expect(html).toContain('id="todo-checkbox-2"');
      expect(html).toContain('id="todo-checkbox-3"');
      expect(html).toContain('id="todo-checkbox-4"');
    });

    it('should render empty category placeholder when category has 0 todos', async () => {
      jest.spyOn(Todo, 'overdue').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueToday').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueLater').mockResolvedValue([]);

      const res = await request(app)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200);

      const html = res.text;
      expect(html).toContain('id="count-overdue">0<');
      expect(html).toContain('id="count-due-today">0<');
      expect(html).toContain('id="count-due-later">0<');
      expect(html).toContain('No tasks in this category.');
    });

    it('should return JSON categorized data when json is accepted', async () => {
      const overdueList = [{ id: 1, title: 'Task 1', dueDate: '2026-09-01', completed: false }];
      jest.spyOn(Todo, 'overdue').mockResolvedValue(overdueList);
      jest.spyOn(Todo, 'dueToday').mockResolvedValue([]);
      jest.spyOn(Todo, 'dueLater').mockResolvedValue([]);

      const res = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('overdueTodos');
      expect(res.body).toHaveProperty('dueTodayTodos');
      expect(res.body).toHaveProperty('dueLaterTodos');
      expect(res.body.overdueCount).toBe(1);
      expect(res.body.dueTodayCount).toBe(0);
      expect(res.body.dueLaterCount).toBe(0);
    });

    it('should return 500 when fetching dashboard todos fails', async () => {
      jest.spyOn(Todo, 'overdue').mockRejectedValue(new Error('Fetch failed'));

      const res = await request(app)
        .get('/')
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Fetch failed');
    });
  });
});