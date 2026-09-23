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
  });
});