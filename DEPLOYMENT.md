# Render Deployment Guide: Sports Scheduler

This guide details the procedure for deploying the **Sports Scheduler** application to [Render](https://render.com) using a Managed PostgreSQL database.

---

## Method 1: Blueprint Deployment (Automated via `render.yaml`)

1. **Sign in to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and log in with your GitHub account.

2. **Create New Blueprint Instance**:
   - Navigate to the **Blueprints** tab and click **New Blueprint Instance**.
   - Connect your GitHub repository (`sports-scheduler` or your WD201 repository).
   - Render will detect [`render.yaml`](file:///C:/Users/DELL/Downloads/sports-scheduler/render.yaml) automatically.

3. **Verify Configuration**:
   - Render creates:
     - **Web Service**: `sports-scheduler` (Node environment)
     - **Database**: `sports-scheduler-db` (PostgreSQL free tier)
   - Click **Apply** to begin building and provisioning.

4. **Automatic Migrations & Health**:
   - Render runs `npm install` followed by `npx sequelize-cli db:migrate` prior to launching `node index.js`.
   - Your live service URL will be displayed in the Render dashboard (e.g. `https://sports-scheduler-xxxx.onrender.com`).

---

## Method 2: Manual Setup on Render

### Step 1: Create PostgreSQL Database
1. In Render dashboard, click **New +** -> **PostgreSQL**.
2. Set Name: `sports-scheduler-db`.
3. Set Database: `sports_scheduler`.
4. Set User: `sports_admin`.
5. Select Region: Closest to your target users (e.g., Oregon / Singapore / Frankfurt).
6. Click **Create Database**.
7. Once provisioned, copy the **Internal Database URL** (or **External Database URL**).

### Step 2: Create Web Service
1. In Render dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `sports-scheduler`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Pre-Deploy Command**: `npx sequelize-cli db:migrate`
   - **Start Command**: `node index.js`

### Step 3: Configure Environment Variables
Under the **Environment** tab of the Web Service, add the following key-value pairs:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production security & SSL dialect |
| `DATABASE_URL` | *(Paste Internal Database URL from Step 1)* | Managed database connection string |
| `SESSION_SECRET` | *(64-character random string)* | Used by `express-session` |
| `CSRF_SECRET` | *(32-character random string)* | Used by `tiny-csrf` |

4. Click **Save Changes** and allow Render to trigger a deployment.
5. Access your live web application at your allocated `onrender.com` domain!
