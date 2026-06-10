# HealthSphere 🏥

A professional, high-performance healthcare management system.

## ✨ Professional Features

- **Backend Minification**: Bundled with `esbuild` for lightning-fast startup and minimum deployment size.
- **Unified Deployment**: Optimized `render.yaml` that handles both frontend and backend in a single service.
- **Production Asset Serving**: Backend is configured to serve minified frontend assets automatically.
- **Standardized Formatting**: Prettier integration for a clean, consistent codebase.

## 🚀 Quick Start (Development)

```bash
# Install all dependencies
npm run install:all

# Run development servers
npm run dev
```

## 🛠️ Build & Deployment

### 1. Production Build

This command minifies the backend into a single `dist/server.js` file and creates the production React bundle in `healthsphere/build`.

```bash
npm run build
```

### 2. Manual Start

```bash
npm start
```

### 🌐 Render Deployment

The project includes a `render.yaml` Blueprint. Simply connect your repo to Render and it will:

1. Provision a PostgreSQL database.
2. Build the project using `npm run build`.
3. Start the production server using `npm start`.

## 📂 Structure

- `/healthsphere`: React frontend (minified during build).
- `/backend`: Node.js API (bundled and minified into `/dist` during build).
- `render.yaml`: Infrastructure as code for seamless deployment.

---

_Optimized for performance and professional standards._
