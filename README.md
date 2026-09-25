# 🏅 Sports Scheduler - WD201 Capstone Project

> A modern, full-stack sports scheduling web application built for the **WD201: Server-Side Programming with Node.js & Express** curriculum. Enables administrators to organize sports catalogues and generate analytics, while players can host games, coordinate open slots, and join matches in real-time.

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791.svg)](https://www.postgresql.org/)
[![Sequelize](https://img.shields.io/badge/Sequelize-v6-52B0E7.svg)](https://sequelize.org/)
[![Passport](https://img.shields.io/badge/Passport.js-Local%20Strategy-34E0A1.svg)](https://www.passportjs.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3.svg)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](#license)

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Database Schema & Models](#-database-schema--models)
5. [Role-Based Access Control](#-role-based-access-control)
6. [Local Installation & Setup](#-local-installation--setup)
7. [Environment Variables](#-environment-variables)
8. [Running Automated Tests](#-running-automated-tests)
9. [Deployment on Render](#-deployment-on-render)
10. [Application Screenshots](#-application-screenshots)
11. [Author & Acknowledgments](#-author--acknowledgments)

---

## 🌟 Project Overview

Finding enough players for casual and competitive team sports is a persistent challenge. The **Sports Scheduler** provides an intuitive community hub where players can:
- Schedule sports matches by venue, date, and open slot counts.
- Specify existing friends/teammates outside the platform who are already coming.
- Browse open games and RSVP with automatic slot decrements.
- Cancel sessions with mandatory reasons transparently communicated to joined participants.
- Administrators oversee sports management and inspect analytical reports across date ranges.

---

## ✨ Key Features

### 1. Authentication & Security
- **Secure Registration & Login**: User signup with `firstName`, `email`, and hashed `password` using `bcryptjs`.
- **Role Assignment**: Choose between **Admin** and **Player** profiles.
- **CSRF Protection**: Form and session token verification across mutating endpoints via `tiny-csrf` and `cookie-parser`.
- **Flash Alerts**: User feedback for validation failures, login errors, and action confirmations using `connect-flash`.

### 2. Sports Management (Admin)
- Create new sports with uniqueness validation.
- Browse the complete sports directory with session metrics.
- Edit existing sports display names.
- Delete sports and cascade cleanup of associated records.

### 3. Sports Session Lifecycle (Host & Players)
- **Host Games**: Select sport, venue, future date/time, and define open player slots.
- **Add Confirmed Teammates**: Declare friends already playing via free-text roster declaration.
- **Future Validation**: Prevents scheduling matches in the past.

### 4. Joining & Leaving Matches
- **Browse Available Sessions**: Filter games by future date, open spots, and uncancelled status.
- **Instant RSVP**: Slot capacity decreases automatically when players join.
- **Double-Booking & Self-Join Guards**: Prevents hosts from joining their own game as players and prevents duplicate RSVPs.
- **Leave Match**: Players can back out of upcoming matches, freeing slots for others.

### 5. Session Cancellation
- **Mandatory Reason**: Creators or Admins must submit a written reason for cancellation (e.g. weather, turf maintenance).
- **Public Visibility**: The cancellation alert and reason are prominently displayed on the session view and player dashboards.

### 6. Admin Analytics & Reporting
- **Total Sessions Played**: Count of completed matches that took place in the past.
- **Date Range Filters**: Filter match history by `startDate` and `endDate`.
- **Popular Sports Report**: Algorithmic ranking of sports based on total sessions hosted and player turnout.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime Environment** | Node.js (v18+) |
| **Backend Framework** | Express.js (v4.21) |
| **Database** | PostgreSQL |
| **Object-Relational Mapping (ORM)** | Sequelize (v6) with `pg` and `pg-hstore` |
| **Authentication** | Passport.js (`passport-local`), `express-session` |
| **Security & Cryptography** | `bcryptjs`, `tiny-csrf`, `cookie-parser` |
| **View Engine** | EJS (Embedded JavaScript) |
| **Frontend Styling** | Bootstrap 5.3, FontAwesome 6, Google Fonts |
| **Testing** | Jest, Supertest, Cheerio |
| **Cloud Deployment** | Render (Web Service + Managed PostgreSQL) |

---

## 🗄️ Database Schema & Models

```mermaid
erDiagram
    USERS ||--o{ SPORTS : "creates (admin)"
    USERS ||--o{ SESSIONS : "hosts"
    USERS ||--o{ SESSION_PARTICIPANTS : "joins"
    SPORTS ||--o{ SESSIONS : "categorizes"
    SESSIONS ||--o{ SESSION_PARTICIPANTS : "contains"

    USERS {
        int id PK
        string firstName
        string lastName
        string email UK
        string password
        string role "admin | player"
        datetime createdAt
        datetime updatedAt
    }

    SPORTS {
        int id PK
        string name UK
        int userId FK
        datetime createdAt
        datetime updatedAt
    }

    SESSIONS {
        int id PK
        int sportId FK
        int creatorId FK
        string venue
        datetime dateTime
        int additionalPlayersNeeded
        text existingPlayers
        boolean isCancelled
        text cancellationReason
        datetime createdAt
        datetime updatedAt
    }

    SESSION_PARTICIPANTS {
        int id PK
        int sessionId FK
        int userId FK
        datetime createdAt
        datetime updatedAt
    }
```

---

## 🔐 Role-Based Access Control

| Action / Route | Guest | Player | Admin |
|---|:---:|:---:|:---:|
| Home / Landing Page (`/`) | ✅ | ✅ | ✅ |
| Signup & Sign In (`/signup`, `/login`) | ✅ | ❌ (Redirects) | ❌ (Redirects) |
| Dashboard (`/dashboard`) | ❌ | ✅ | ✅ |
| View Available Sessions (`/sessions/available`) | ❌ | ✅ | ✅ |
| Join / Leave Session (`/sessions/:id/join`) | ❌ | ✅ | ✅ |
| Host New Session (`/sessions/new`) | ❌ | ✅ | ✅ |
| Cancel Hosted Session (`/sessions/:id/cancel`) | ❌ | ✅ (Own sessions) | ✅ (Any session) |
| View Sports List (`/sports`) | ❌ | ✅ (Read-only) | ✅ |
| Add / Edit / Delete Sports (`/sports/*`) | ❌ | ❌ (403) | ✅ |
| View Reports & Analytics (`/reports`) | ❌ | ❌ (403) | ✅ |

---

## 🚀 Local Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL (v14+) running locally

### 1. Clone the Repository
```bash
git clone https://github.com/devakikowsik-star/sports-scheduler.git
cd sports-scheduler
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your local PostgreSQL credentials:
```bash
cp .env.example .env
```

### 4. Run Database Migrations
```bash
npx sequelize-cli db:migrate
```

### 5. Start the Application
```bash
# Start development server with auto-reload
npm run dev

# Or start in standard production mode
npm start
```

Visit `http://localhost:3000` in your web browser.

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Port for the HTTP server | `3000` |
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection URL (Render / production) | `postgres://user:pass@host:5432/db` |
| `SESSION_SECRET` | Secret key used to sign session cookies | `super_secret_session_key` |
| `CSRF_SECRET` | 32-character secret key for CSRF token generator | `12345678901234567890123456789012` |

---

## 🧪 Running Automated Tests

The application includes an automated test suite verifying CSRF security, authentication, RBAC authorization, session lifecycle, RSVP slot mathematics, cancellations, and report queries.

```bash
# Run all test suites
npm test
```

### Test Coverage Highlights:
- **Authentication**: Registration input validation, duplicate email prevention, password hashing, and session authentication.
- **Sports Catalog**: Admin sport creation, editing, deletion, and non-admin 403 authorization guards.
- **Session Lifecycle**: Future date enforcement, venue validation, and open slot calculation.
- **RSVP Logic**: Capacity decrement, duplicate join prevention, and past/cancelled session join blocking.
- **Cancellations**: Mandatory cancellation reason validation and public reason broadcasting.
- **Reports Dashboard**: Non-admin blocking, sessions played counting, popular sports ranking, and date range query filters.

---

## ☁️ Deployment on Render

The application is fully configured for zero-configuration hosting on [Render](https://render.com) using managed PostgreSQL.

- **Full Deployment Guide**: See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.
- **Live Demo URL**: [https://sports-scheduler-app.onrender.com](https://sports-scheduler-app.onrender.com) *(Configure your live instance URL here)*

### Quick Deployment Steps:
1. **Create Managed PostgreSQL Database**:
   - In Render, click **New +** -> **PostgreSQL**.
   - Set Name: `sports-scheduler-db`, Database: `sports_scheduler`, User: `sports_admin`.
   - Copy the **Internal Database URL**.
2. **Create Web Service**:
   - In Render, click **New +** -> **Web Service** and connect your GitHub repository (`sports-scheduler` branch or `main`).
   - Runtime: `Node`
   - Build Command: `npm install`
   - Pre-Deploy Command: `npx sequelize-cli db:migrate`
   - Start Command: `node index.js`
3. **Configure Environment Variables**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Render Internal Database URL)*
   - `SESSION_SECRET`: *(64-character random string)*
   - `CSRF_SECRET`: `123456789iamasecret987654321look`
4. **Deploy Service**:
   - Render automatically builds the project, runs database migrations, and serves the app over HTTPS.

---

## 📸 Application Screenshots

| Landing Page | User Dashboard |
|:---:|:---:|
| Hero section with feature cards & platform metrics | Quick action hubs, KPI cards & active games preview |

| Available Sessions | Detailed Match View |
|:---:|:---:|
| Grid of open games with real-time slot counters | Full logistics, confirmed player rosters & join actions |

| Session Cancellation | Admin Reports Dashboard |
|:---:|:---:|
| Mandatory cancellation reason alert and form | KPI cards, date range filter & popular sports ranking |

---

## 👤 Author & Acknowledgments

- **Author**: devakikowsik-star
- **Course**: WD201 Server-Side Web Development (Pupilfirst LITE)
- **Project**: Sports Scheduler Capstone

---

## 📄 License
This project is open source and available under the [ISC License](LICENSE).
