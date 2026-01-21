# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- JavaScript (ES6+) - Both frontend and backend using ES modules (`"type": "module"`)

**Secondary:**
- None - Pure JavaScript codebase

## Runtime

**Environment:**
- Node.js >=18 (specified in `package.json` engines)
- Current detected version: v25.2.1

**Package Manager:**
- npm 11.6.2
- Lockfiles present:
  - Root: `package-lock.json`
  - Client: `client/package-lock.json`

## Frameworks

**Core:**
- React 18.2.0 - Frontend UI library (`client/package.json`)
- Express 4.18.2 - Backend HTTP server (`package.json`)
- Vite 5.2.0 - Frontend build tool and dev server (`client/package.json`)
- Mantine UI 8.3.9 - React component library for UI (`client/package.json`)

**Testing:**
- Vitest 4.0.15 - Test runner configured in `vitest.config.js`

**Build/Dev:**
- Vite 5.2.0 - Frontend bundler with React plugin
- @vitejs/plugin-react 4.2.1 - Vite React integration
- concurrently 8.2.2 - Run client and server simultaneously in development
- PostCSS 8.5.6 - CSS processing with Mantine presets

## Key Dependencies

**Critical:**
- @libsql/client 0.6.0 - Database client supporting both local SQLite and Turso cloud (seamless switching)
- cors 2.8.5 - CORS middleware for API access

**Infrastructure:**
- react-dom 18.2.0 - React rendering layer
- @mantine/core 8.3.9 - Core Mantine components
- @mantine/hooks 8.3.9 - Mantine React hooks
- @mantine/notifications 8.3.9 - Toast notifications
- @mantine/spotlight 8.3.9 - Command palette/search
- mantine-contextmenu 7.17.1 - Right-click context menus
- @tabler/icons-react 3.35.0 - Icon library

## Configuration

**Environment:**
- Development: No environment variables required (uses local SQLite file at `server/db/minijira.db`)
- Production: Optional Turso cloud database via:
  - `TURSO_DATABASE_URL` - Turso database connection URL
  - `TURSO_AUTH_TOKEN` - Turso authentication token
- `NODE_ENV=production` - Enables static file serving from `client/dist`
- `PORT` - HTTP server port (defaults to 3001)

**Build:**
- `vite.config.js` - Vite configuration with React plugin and dev proxy (`/api` → `http://localhost:3001`)
- `postcss.config.cjs` - PostCSS with Mantine preset and responsive breakpoints
- `vitest.config.js` - Test configuration (sequential execution, 30s timeout)
- `.gitignore` - Excludes `*.db` files, node_modules, build artifacts

## Platform Requirements

**Development:**
- Node.js >=18
- npm (any recent version)
- No additional tools required (SQLite embedded via @libsql/client)

**Production:**
- Node.js >=18 runtime
- Deployment target: Render.com (configured in `render.yaml`)
  - Service type: web
  - Build: `npm install && npm run build && npm run db:init`
  - Start: `npm start`
- Database: Local SQLite file or Turso cloud (libSQL)

---

*Stack analysis: 2026-01-20*
