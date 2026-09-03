# ZameenAI

ZameenAI is a land acquisition and land-record digitization platform. It has a React frontend for the user interface and a FastAPI backend that currently provides the file-upload API.

## Tech stack

### Frontend (`frontend/`)

- **React 19** and **TypeScript** for the UI
- **Vite 8** for the development server and production builds
- **TanStack Router** for type-safe, file-based client-side routing
- **TanStack Query** for server-state and asynchronous API requests
- **Tailwind CSS 4** with PostCSS for styling
- **Axios** for HTTP requests and upload progress reporting
- **Lucide React** for icons

### Backend (`backend/`)

- **Python** and **FastAPI** for the HTTP API
- **Uvicorn** as the ASGI development server
- Upload support through `python-multipart`
- Dependencies for PostgreSQL/PostGIS (`SQLAlchemy`, `psycopg2-binary`, and `GeoAlchemy2`), Redis, and Celery are included for future data and background-processing work

## Repository layout

```text
ZameenAI/
├── frontend/                 # React + Vite client application
│   ├── src/
│   │   ├── routes/           # TanStack file routes
│   │   ├── components/       # Reusable UI components
│   │   ├── main.tsx          # React, Query, and Router providers
│   │   └── routeTree.gen.ts  # Generated route tree (do not edit)
│   ├── vite.config.ts        # Vite, Router plugin, and API proxy config
│   └── package.json
├── backend/
│   ├── app/main.py           # FastAPI app and /api/upload endpoint
│   └── requirements.txt
├── data/uploads/             # Locally stored uploaded files
└── docs/                     # Product and technical documentation
```

## Prerequisites

- Node.js 20 or later, including npm
- Python 3.10 or later

## Run the application locally

Run the backend and frontend in separate terminals.

### 1. Start the backend

From the repository root:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Set-Location backend
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`. Its interactive API documentation is at `http://localhost:8000/docs`.

### 2. Start the frontend

From the repository root, in a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:3005` in the browser.

The Vite configuration proxies frontend requests beginning with `/api` to `http://localhost:8000`. For example, the upload screen posts files to `/api/upload`, which Vite forwards to the FastAPI service during development.

> If PowerShell reports that `npm.ps1` cannot run because script execution is disabled, use `npm.cmd run dev` (and `npm.cmd install`) instead.

## Frontend commands

Run these from `frontend/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts Vite at `http://localhost:3005`. |
| `npm run build` | Creates a production bundle in `frontend/dist/`. |
| `npx tsc --noEmit` | Runs TypeScript type checking without creating output files. |

## TanStack Router: how routing works

TanStack Router is configured as a **file-based router**. A route file inside `frontend/src/routes/` becomes a browser route.

```text
src/routes/__root.tsx  → shared root layout and <Outlet />
src/routes/index.tsx   → /
src/routes/uploads.tsx → /uploads
```

The process is:

1. The `tanstackRouter()` Vite plugin in `frontend/vite.config.ts` scans `src/routes/` whenever the dev server or build runs.
2. It generates `src/routeTree.gen.ts`, which collects every file route and its type information. This file is generated—never edit it manually.
3. `src/main.tsx` imports that generated `routeTree`, creates the router with `createRouter({ routeTree })`, and renders it through `<RouterProvider />`.
4. Each route file exports a `Route` created with `createFileRoute(path)`. The root route renders `<Outlet />`, where the active child page appears.
5. Navigate between pages with `Link` or `useNavigate`. For example, the home-page “Start Uploading” action calls `navigate({ to: '/uploads' })`.

### Adding a route

To add a page at `/reports`, create `frontend/src/routes/reports.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  return <h1>Reports</h1>
}
```

With the Vite dev server running, the Router plugin generates the new route definition automatically. Then navigate to it with:

```tsx
import { Link } from '@tanstack/react-router'

<Link to="/reports">Reports</Link>
```

The generated types ensure invalid route paths are caught by TypeScript.

## Upload flow

1. The user opens `/uploads` from the home page.
2. `uploads.tsx` submits the selected file using Axios to `/api/upload` and displays upload progress.
3. Vite proxies that request to FastAPI on port 8000.
4. FastAPI stores the file under `data/uploads/` with a UUID-based filename and returns a JSON success response.

## Production build

Build the frontend from `frontend/`:

```powershell
npm run build
```

The deployable static assets are written to `frontend/dist/`.
