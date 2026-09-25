# 🚀 Complete Render Deployment Guide: Sports Scheduler

This document provides step-by-step instructions for deploying the **Sports Scheduler** application to [Render](https://render.com) using a Managed PostgreSQL database.

---

## 📋 Overview of What We Will Do
1. **Create a Managed PostgreSQL Database** on Render.
2. **Connect the GitHub Repository** containing the Sports Scheduler code.
3. **Configure Environment Variables** on the Render Web Service.
4. **Run Sequelize Migrations** automatically upon each deployment.
5. **Verify the Live Web Application** using your assigned Render URL.

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Sign In & Create PostgreSQL Database

1. Open your browser and go to [dashboard.render.com](https://dashboard.render.com).
2. Sign in using your GitHub account (`devakikowsik-star`).
3. Click the **New +** button in the top navigation bar and select **PostgreSQL**.
4. Configure the database details:
   - **Name**: `sports-scheduler-db`
   - **Database**: `sports_scheduler`
   - **User**: `sports_admin`
   - **Region**: Choose the region closest to you (e.g., *Singapore*, *Frankfurt*, or *Oregon*).
   - **PostgreSQL Version**: Leave default (e.g. 16 or 15).
   - **Instance Type / Plan**: Select **Free**.
5. Click **Create Database**.
6. Wait 1–2 minutes for the database to provision.
7. Once provisioned, scroll down to the **Connections** section:
   - Copy the **Internal Database URL** (e.g., `postgres://sports_admin:password@dpg-xxxx-a:5432/sports_scheduler`).
   - *(Note: Use the Internal Database URL when connecting from a Render Web Service in the same region for maximum speed and zero egress cost).*

---

### Step 2: Create the Web Service

1. In the Render Dashboard, click the **New +** button and select **Web Service**.
2. Under **Connect a repository**, find your GitHub repository:
   - If using `todo-list`, select repository `todo-list`.
   - Under **Branch**, select `sports-scheduler` (or `main` if merged).
   - If you created a standalone repository `sports-scheduler`, select that repository and branch `main`.
3. Configure the web service settings:
   - **Name**: `sports-scheduler` (or a custom name like `sports-scheduler-app`)
   - **Region**: Select the **same region** chosen for your PostgreSQL database in Step 1.
   - **Branch**: `sports-scheduler` (or `main`)
   - **Root Directory**: Leave blank (root).
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install
     ```
   - **Pre-Deploy Command** *(runs migrations before server boot)*:
     ```bash
     npx sequelize-cli db:migrate
     ```
   - **Start Command**:
     ```bash
     node index.js
     ```
   - **Instance Type / Plan**: Select **Free**.

---

### Step 3: Configure Environment Variables

Under the **Environment** tab of your new Web Service, add the following environment variables:

| Environment Variable Key | Value / Source | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production security, cookie trust proxy, and SSL |
| `DATABASE_URL` | *(Paste the Internal Database URL from Step 1)* | Managed PostgreSQL connection string |
| `SESSION_SECRET` | *(Click "Generate" or enter a 64-character random string)* | Used to sign session cookies |
| `CSRF_SECRET` | `123456789iamasecret987654321look` *(or click "Generate")* | 32-character secret for CSRF token generator |
| `PORT` | `3000` *(Render provides its own PORT automatically, but setting this is safe)* | HTTP listener port |

---

### Step 4: Deploy & Run Database Migrations

1. Click **Create Web Service** at the bottom of the page.
2. Render will trigger the initial build:
   - It clones your repository branch.
   - It runs `npm install`.
   - It executes the Pre-Deploy command: `npx sequelize-cli db:migrate`.
     - *You will see in the deploy logs:*
       ```
       Sequelize CLI [Node: 18.x.x, CLI: 6.x.x, ORM: 6.x.x]
       Loaded configuration file "config/config.json".
       Using environment "production".
       == 20260925100000-create-users: migrating =======
       == 20260925100000-create-users: migrated (0.045s)
       == 20260925100001-create-sports: migrating ======
       == 20260925100001-create-sports: migrated (0.038s)
       == 20260925100002-create-sessions: migrating ====
       == 20260925100002-create-sessions: migrated (0.041s)
       == 20260925100003-create-session-participants: migrating
       == 20260925100003-create-session-participants: migrated (0.036s)
       ```
   - It executes `node index.js`.
     - *You will see:*
       ```
       Database connection has been established successfully.
       Sports Scheduler application running at http://localhost:10000
       ==> Your service is live 🎉
       ```

---

### Step 5: Verify the Live Application

1. At the top of your Render Web Service page, locate your public HTTPS URL:
   - Example: `https://sports-scheduler-xxxx.onrender.com`
2. Open the URL in an incognito window:
   - **Test Registration**: Sign up with an **Admin** account (`admin@test.com`) and verify you are redirected to the login/dashboard.
   - **Create Sports**: Navigate to **Sports** and add sports categories (e.g., *Cricket*, *Football*, *Badminton*).
   - **Host a Session**: Click **Create Session**, enter venue, future date/time, and slot counts.
   - **Test Player Account**: Log out and register a **Player** account (`player@test.com`).
   - **Join Session**: Browse **Available Sessions** and join the created game. Verify open slots decrement by 1.
   - **Check Admin Reports**: Log back into the Admin account, navigate to **Reports**, and verify the analytics dashboard calculates sessions played and sports popularity.

---

## ⚡ Alternative Method: Deploying with Render Blueprint (`render.yaml`)

Because this repository contains a pre-configured [`render.yaml`](render.yaml), you can also deploy both the database and web service in a single click:

1. In the Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your GitHub repository.
3. Select branch `sports-scheduler` (or `main`).
4. Render will parse [`render.yaml`](render.yaml) and automatically create:
   - Database: `sports-scheduler-db`
   - Web Service: `sports-scheduler`
5. Click **Apply** and Render handles everything automatically!

---

## 🔍 Troubleshooting Tips

1. **Database Connection Refused / SSL Error**:
   - Verify `DATABASE_URL` is set in the Web Service environment variables.
   - Ensure the database and web service are created in the **same region**.
   - `models/index.js` automatically enables SSL (`rejectUnauthorized: false`) for non-localhost connections.

2. **Session Logouts Immediately on Redirect**:
   - Render uses reverse proxies for SSL termination.
   - `app.js` has `app.set('trust proxy', 1);` enabled in production, which ensures cookies are passed securely through the proxy.

3. **Running Migrations Manually**:
   - If you ever need to rerun migrations manually from the Render dashboard:
     - Go to your Web Service -> **Shell** tab.
     - Type: `npx sequelize-cli db:migrate` and press Enter.
