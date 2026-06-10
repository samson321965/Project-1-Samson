# 🏥 HealthSphere — GitHub Actions CI/CD Workflow Guide

> **Purpose:** This document describes the CI/CD workflow to create as a new GitHub Actions workflow.
> You can use the YAML blocks below to create `.github/workflows/deploy.yml` in your repository,
> then delete this guide file once you're done.

---

## 📁 Project Structure Overview

```
HealthSphere App/
├── backend/                  # Node.js + Express API (esbuild-bundled)
│   ├── server.js             # Entry point
│   ├── dist/server.js        # Production bundle (built by esbuild)
│   ├── src/
│   │   ├── config/db.js      # PostgreSQL pool (supports DATABASE_URL or individual vars)
│   │   ├── controllers/      # authController, adminController, doctorController, etc.
│   │   ├── middleware/       # JWT auth middleware
│   │   └── routes/           # authRoutes, appointmentRoutes, patientRoutes, etc.
│   └── package.json
├── healthsphere/             # React 19 frontend (Create React App)
│   ├── src/
│   │   ├── apiConfig.js      # Switches API base URL based on environment
│   │   ├── pages/            # patient/, doctor/, admin/, helpdesk/ pages
│   │   └── components/
│   └── package.json
├── render.yaml               # Render.com deployment config (infrastructure-as-code)
├── package.json              # Root monorepo scripts (install:all, build, start, dev)
└── Procfile                  # Legacy process file
```

---

## ⚙️ What the CI/CD Workflow Does

This is a **monorepo workflow** that handles both the Node.js backend and React frontend in a single pipeline.

### Trigger Events

- **Push to `main`** → runs the full build + deploy pipeline
- **Pull Requests to `main`** → runs tests & build checks only (no deploy)

### Pipeline Stages

```
┌──────────────────────────────────────────────────────────┐
│  STAGE 1: Test & Lint (runs on every PR and push)        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • Checkout code                                     │ │
│  │ • Set up Node.js 20                                 │ │
│  │ • Install root + backend + frontend dependencies    │ │
│  │ • Run Prettier format check (backend & frontend)    │ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  STAGE 2: Build                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • Build backend  → esbuild bundles dist/server.js   │ │
│  │ • Build frontend → react-scripts → healthsphere/    │ │
│  │                    build/ (static files)            │ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  STAGE 3: Deploy to Render (push to main only)           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • Trigger Render Deploy Hook for backend API        │ │
│  │ • Trigger Render Deploy Hook for frontend static    │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🔑 Required GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions** and add:

| Secret Name                  | Where to get it                                                      | What it's for                                          |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| `RENDER_API_KEY`             | Render Dashboard → Account Settings → API Keys                       | Authenticates with Render API                          |
| `RENDER_BACKEND_SERVICE_ID`  | Render Dashboard → `healthsphere-api` service URL (e.g. `srv-xxxx`)  | Triggers redeploy of backend                           |
| `RENDER_FRONTEND_SERVICE_ID` | Render Dashboard → `healthsphere-ui` service URL (e.g. `srv-xxxx`)   | Triggers redeploy of frontend                          |
| `REACT_APP_API_URL`          | Your Render backend URL e.g. `https://healthsphere-api.onrender.com` | Injected into React build so frontend hits correct API |

> **How to find your Service ID:** In Render, open your service → the URL will be like
> `https://dashboard.render.com/web/srv-cxxxxxxxxxx` — the `srv-cxxxxxxxxxx` part is your service ID.

---

## 📄 Full Workflow YAML

Create this file in your repo at: `.github/workflows/deploy.yml`

```yaml
# =============================================================
# HealthSphere CI/CD Pipeline
# Runs on: push to main (full pipeline) | PRs to main (CI only)
# =============================================================

name: HealthSphere CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  # ─────────────────────────────────────────────
  # JOB 1: Lint & Format Check
  # ─────────────────────────────────────────────
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Install root dev dependencies (prettier, concurrently)
      - name: Install root dependencies
        run: npm install

      # Install backend dependencies
      - name: Install backend dependencies
        run: cd backend && npm install

      # Install frontend dependencies
      - name: Install frontend dependencies
        run: cd healthsphere && npm install

      # Run Prettier check — fails if any file is not formatted
      - name: Check code formatting (Prettier)
        run: npx prettier --check "backend/**/*.js" "healthsphere/src/**/*.{js,jsx,css}"

  # ─────────────────────────────────────────────
  # JOB 2: Build
  # ─────────────────────────────────────────────
  build:
    name: Build Backend & Frontend
    runs-on: ubuntu-latest
    needs: lint # Only runs if lint passes

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # ── Backend Build ──────────────────────────
      - name: Install backend dependencies
        run: cd backend && npm install

      # esbuild bundles server.js → dist/server.js (minified + sourcemap)
      # Externals: bcryptjs, pg (native C modules — excluded from bundle)
      - name: Build backend (esbuild)
        run: cd backend && npm run build
        # This runs:
        # esbuild server.js --bundle --platform=node --target=node20
        #   --outfile=dist/server.js --minify --sourcemap
        #   --external:bcryptjs --external:pg

      # Verify dist file exists
      - name: Verify backend build output
        run: test -f backend/dist/server.js && echo " Backend build OK"

      # ── Frontend Build ─────────────────────────
      - name: Install frontend dependencies
        run: cd healthsphere && npm install

      # Inject backend URL so apiConfig.js uses the Render API in production
      - name: Build frontend (React)
        run: cd healthsphere && npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
          # CI=false allows build to succeed even if there are warnings
          CI: false

      # Verify React build folder
      - name: Verify frontend build output
        run: test -d healthsphere/build && echo " Frontend build OK"

      # ── Upload Artifacts (optional, for debugging) ──
      - name: Upload backend dist as artifact
        uses: actions/upload-artifact@v4
        with:
          name: backend-dist
          path: backend/dist/
          retention-days: 3

      - name: Upload frontend build as artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: healthsphere/build/
          retention-days: 3

  # ─────────────────────────────────────────────
  # JOB 3: Deploy to Render
  # Only runs on push to main (not on PRs)
  # ─────────────────────────────────────────────
  deploy:
    name: Deploy to Render
    runs-on: ubuntu-latest
    needs: build # Only runs if build passes
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Deploy Backend API to Render
        run: |
          echo " Triggering Render deploy for healthsphere-api..."
          curl -s -o response.json -w "%{http_code}" \
            --request POST \
            --url "https://api.render.com/v1/services/${{ secrets.RENDER_BACKEND_SERVICE_ID }}/deploys" \
            --header "Accept: application/json" \
            --header "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            --header "Content-Type: application/json" \
            --data '{"clearCache": false}' > http_code.txt
          HTTP_CODE=$(cat http_code.txt)
          echo "Response code: $HTTP_CODE"
          cat response.json
          if [ "$HTTP_CODE" != "201" ]; then
            echo " Backend deploy trigger failed (HTTP $HTTP_CODE)"
            exit 1
          fi
          echo " Backend deploy triggered successfully"

      - name: Deploy Frontend Static Site to Render
        run: |
          echo " Triggering Render deploy for healthsphere-ui..."
          curl -s -o response.json -w "%{http_code}" \
            --request POST \
            --url "https://api.render.com/v1/services/${{ secrets.RENDER_FRONTEND_SERVICE_ID }}/deploys" \
            --header "Accept: application/json" \
            --header "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            --header "Content-Type: application/json" \
            --data '{"clearCache": false}' > http_code.txt
          HTTP_CODE=$(cat http_code.txt)
          echo "Response code: $HTTP_CODE"
          cat response.json
          if [ "$HTTP_CODE" != "201" ]; then
            echo " Frontend deploy trigger failed (HTTP $HTTP_CODE)"
            exit 1
          fi
          echo " Frontend deploy triggered successfully"

      - name: Deployment Summary
        run: |
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "  HealthSphere Deployment Triggered "
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "  Backend API  → healthsphere-api (Render)"
          echo "  Frontend UI  → healthsphere-ui  (Render)"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## 🪜 Step-by-Step Setup on GitHub

### 1. Create the workflow file

In your repo, create the file exactly at this path:

```
.github/workflows/deploy.yml
```

Paste the YAML above into it.

### 2. Add Secrets to GitHub

1. Go to your repo on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each secret from the table above

### 3. Get Your Render Service IDs

1. Log into [render.com](https://render.com)
2. Click on **`healthsphere-api`** → copy the service ID from the URL bar
   - URL looks like: `https://dashboard.render.com/web/srv-abc123xyz`
   - The service ID is: `srv-abc123xyz`
3. Repeat for **`healthsphere-ui`**

### 4. Get Your Render API Key

1. In Render, click your **profile picture** (top right)
2. Go to **Account Settings** → **API Keys**
3. Click **Create API Key**, give it a name like `github-actions`
4. Copy the key → add as `RENDER_API_KEY` secret in GitHub

### 5. Push to main to trigger

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions CI/CD workflow"
git push origin main
```

---

## 🔄 What Happens on Each Push

```
Developer pushes to main
        │
        ▼
┌──────────────┐
│  1. Lint Job │  ← Checks Prettier formatting
└──────┬───────┘
       │ (passes)
       ▼
┌──────────────┐
│  2. Build    │  ← Builds backend (esbuild) + frontend (React)
│     Job      │     Verifies dist/server.js and build/ exist
└──────┬───────┘
       │ (passes)
       ▼
┌──────────────┐
│  3. Deploy   │  ← Calls Render API to trigger redeploy
│     Job      │     of both services
└──────────────┘
        │
        ▼
Render pulls latest code from GitHub
and runs its own build + start commands
(as configured in render.yaml)
```

---

## 📝 Notes Specific to Your Project

| Detail              | Value                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Node version        | 20 (matches `--target=node20` in esbuild)                                                       |
| Backend build tool  | `esbuild` (fast JS bundler, already in `backend/package.json`)                                  |
| Backend externals   | `bcryptjs`, `pg` — excluded from bundle (native modules)                                        |
| Frontend build tool | `react-scripts build` (Create React App)                                                        |
| Frontend output     | `healthsphere/build/`                                                                           |
| Backend output      | `backend/dist/server.js`                                                                        |
| Database            | PostgreSQL on Render — uses `DATABASE_URL` env var automatically injected by Render             |
| CORS                | Backend reads `FRONTEND_URL` env var — set this in Render backend env vars to your frontend URL |
| Auth                | JWT — `JWT_SECRET` is auto-generated by Render (`generateValue: true` in render.yaml)           |

---

> ✅ Once this file is created and secrets are configured, every push to `main` will automatically:
> lint → build → deploy to Render.
> Delete this guide file (`CICD_WORKFLOW_GUIDE.md`) once you've set everything up.
