# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- JavaScript (ES2022) - Both frontend and backend
- JSX - React component syntax in frontend

**TypeScript:**
- Not used; JavaScript with optional type hints via JSDoc in some files

## Runtime

**Environment:**
- Node.js >= 18

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Frontend:**
- React 18.2.0 - UI framework
- Vite 5.2.0 - Build tool and dev server
- Mantine 8.3.9 - Component library
- React DOM 18.2.0 - React rendering

**Backend:**
- Express.js 4.18.2 - REST API server
- Node.js built-in `http` module - SSE (Server-Sent Events)

**Testing:**
- Vitest 4.0.15 - Test runner and assertion library
- Test configuration: `vitest.config.js`

**Build/Dev:**
- Vite plugin for React - `@vitejs/plugin-react` 4.2.1
- Concurrently 8.2.2 - Run server and client concurrently during development

## Key Dependencies

**Critical:**

- `@libsql/client` 0.6.0 - Database client for SQLite (local) and Turso (cloud). Abstracts database connectivity.
- `express` 4.18.2 - REST API server framework
- `cors` 2.8.5 - Cross-Origin Resource Sharing middleware for Express
- `react` 18.2.0 - Core UI framework
- `@mantine/core` 8.3.9 - Mantine component library (buttons, modals, inputs, layout)
- `@mantine/hooks` 8.3.9 - Mantine React hooks (useDisclosure, useMediaQuery, etc.)
- `@mantine/notifications` 8.3.9 - Toast notifications
- `@mantine/spotlight` 8.3.9 - Command palette/search interface
- `sonner` 2.0.7 - Alternative toast notification system
- `mantine-contextmenu` 7.17.1 - Context menu component
- `@tabler/icons-react` 3.35.0 - Icon library

**Styling:**
- `postcss` 8.5.6 - CSS processing
- `postcss-preset-mantine` 1.18.0 - Mantine CSS preset
- `postcss-simple-vars` 7.0.1 - CSS variable support

**Types:**
- `@types/react` 18.2.66 - React TypeScript definitions
- `@types/react-dom` 18.2.22 - React DOM TypeScript definitions

## Configuration

**Environment:**
- Development: Local SQLite database at `file:server/db/minijira.db`
- Production: Turso cloud database (configured via env vars)
- Database configuration: `server/db/connection.js`

**Build Config:**
- Frontend: `client/vite.config.js` - Vite dev server on port 5173, proxies `/api` to `http://localhost:3001`
- Styling: `client/postcss.config.cjs` - PostCSS with Mantine preset and CSS variables
- Testing: `vitest.config.js` - Sequential test execution (no parallelism due to shared database)

**API:**
- Base URL: `/api` (relative)
- CORS enabled via `cors` middleware on Express server

## Platform Requirements

**Development:**
- Node.js >= 18
- npm
- Local SQLite support (via libSQL)

**Production:**
- Node.js >= 18
- Turso cloud database account (or local SQLite if using local deployment)
- Environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (optional; defaults to local SQLite)
- Environment variable: `PORT` (optional; defaults to 3001)
- Environment variable: `NODE_ENV=production` for production mode

**Deployment Target:**
- Works on any platform supporting Node.js 18+
- Can be deployed to serverless (with persistent storage) or traditional VPS

---

*Stack analysis: 2026-01-23*
