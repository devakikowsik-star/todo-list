# Deployment Guide - Express.js Todo Manager on Render

This guide outlines the steps to deploy the Express.js Todo Manager application to [Render](https://render.com).

---

## 1. Blueprint Deployment (Automated via `render.yaml`)

The repository includes a `render.yaml` blueprint configuration that automatically provisions:
1. **Web Service**: Node.js web application running `node index.js`.
2. **PostgreSQL Database**: Free managed PostgreSQL database (`todo-manager-db`).

### Steps:
1. Push your latest code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. Log in to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub account and select the `todo-list` repository.
5. Render will detect `render.yaml` and configure:
   - Web Service: `todo-manager`
   - Database: `todo-manager-db`
6. Click **Apply**. Render will automatically build the service, provision PostgreSQL, run database migrations/synchronization, and provide a live URL (`https://todo-manager-xxxx.onrender.com`).

---

## 2. Manual Deployment Steps

If you prefer to configure the Web Service and Database manually:

### Step A: Provision PostgreSQL Database on Render
1. In the Render Dashboard, click **New +** -> **PostgreSQL**.
2. Set:
   - **Name**: `todo-db`
   - **Database**: `todo_manager`
   - **User**: `todo_user`
   - **Region**: Choose the region closest to you (e.g., Singapore, Frankfurt, Oregon).
   - **Plan**: `Free`
3. Click **Create Database**.
4. Once provisioned, copy the **Internal Database URL** (if deploying web service in same region) or **External Database URL**.

### Step B: Deploy the Web Service
1. Click **New +** -> **Web Service**.
2. Select your `todo-list` repository.
3. Configure the service settings:
   - **Name**: `todo-manager`
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: `Free`

---

## 3. Environment Variables

Configure the following environment variables in the Render Dashboard (**Environment** tab):

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | HTTP server port (set automatically by Render) | `10000` |
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://todo_user:password@hostname/todo_manager` |
| `COOKIE_SECRET` | 32+ character secret for signed cookies | `your_secure_random_cookie_secret_key_32` |
| `CSRF_SECRET` | Exactly 32-character secret for `tiny-csrf` | `123456789iamasecret987654321look` |

---

## 4. Verification

After deployment:
1. Open the deployed application URL: `https://<service-name>.onrender.com`
2. Test the core workflows:
   - Create a new todo with title and due date.
   - Verify category counts: Overdue, Due Today, Due Later, Completed Items.
   - Mark a task complete and verify it moves to **Completed Items**.
   - Mark a task incomplete and verify it returns to its date category.
   - Delete a task.
