# Express.js Todo Application with Sequelize & PostgreSQL

A complete RESTful Todo API built using **Express.js**, **Sequelize ORM**, and **PostgreSQL**, with automated test coverage using **Jest** and **Supertest**.

---

## Features

- **Express.js Application**: Decoupled architecture (`app.js` and `index.js`) for modularity and testing.
- **Sequelize ORM**: PostgreSQL connection handling, schema definition, and query abstractions.
- **Todo Model**:
  - `id`: Auto-incrementing primary key integer.
  - `title`: Non-empty string.
  - `dueDate`: Date only (`YYYY-MM-DD`).
  - `completed`: Boolean flag (default `false`).
- **REST Endpoints**:
  - `GET /todos`: Retrieves all todos via `Todo.findAll()`.
  - `DELETE /todos/:id`: Deletes a todo by its ID via `Todo.destroy()`.
  - `POST /todos`: Helper endpoint to create new todos.
- **Automated Tests**: Route tests with **Jest** and **Supertest**.

---

## Project Structure

```
.
├── .env.example            # Sample environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Project dependencies and npm scripts
├── README.md               # Documentation and run instructions
├── app.js                  # Express app setup, middlewares, and route handlers
├── index.js                # Database connection and server listener
├── models/
│   ├── index.js            # Model exports and Sequelize instance
│   └── todo.js             # Todo model definition
└── __tests__/
    └── todo.test.js        # Jest + Supertest test suite
```

---

## Instructions to Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure PostgreSQL Database

Create a database named `todo_db` in PostgreSQL:

```sql
CREATE DATABASE todo_db;
```

Update or verify your connection settings in `.env`:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### 3. Run Tests

Execute the automated test suite using Jest and Supertest:

```bash
npm test
```

### 4. Start the Application

Start the server:

```bash
npm start
```

Or run in development mode with auto-reloading using `nodemon`:

```bash
npm run dev
```

---

## API Endpoints

### 1. Get All Todos
- **Method**: `GET`
- **URL**: `/todos`
- **Description**: Returns all todo records from the database using `Todo.findAll()`.
- **Response**: `200 OK`

### 2. Delete Todo by ID
- **Method**: `DELETE`
- **URL**: `/todos/:id`
- **Description**: Deletes a specific todo by ID using `Todo.destroy({ where: { id } })`.
- **Response (Success)**: `200 OK`
- **Response (Not Found)**: `404 Not Found`

### 3. Create Todo
- **Method**: `POST`
- **URL**: `/todos`
- **Response**: `201 Created`
