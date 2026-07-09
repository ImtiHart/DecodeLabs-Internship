# DecodeLabs — Project 4: Full Stack Integration

Connects the **P1 responsive frontend** to the **P3 SQLite backend** using
`fetch()` and async/await. No frameworks — pure HTML, CSS, and vanilla JS
talking to a Node.js/Express REST API.

---

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

Everything is served from one server: the static frontend at `/` and the REST
API at `/api/*`.

---

## Architecture

```
Browser (P1 Frontend)
    │
    │  fetch('/api/recipes')      GET  → SELECT
    │  fetch('/api/recipes', POST) → INSERT
    │  fetch('/api/recipes/3', DELETE) → DELETE
    │  fetch('/api/users', POST)  → INSERT
    │
    ▼
Node.js + Express (P2 API layer)
    │
    │  Parameterised SQL (no injection)
    │  Schema constraints (NOT NULL, UNIQUE, CHECK, FK)
    │
    ▼
SQLite via sql.js (P3 Database)
    └── hearth.sqlite  (persisted to disk)
```

---

## What the frontend does (app.js)

| User action | JS | HTTP | SQL |
|---|---|---|---|
| Page loads | `fetch('/api/recipes')` | GET | SELECT JOIN |
| Filter dropdown | `fetch('/api/recipes?category=Mains')` | GET | SELECT WHERE |
| Click a recipe card | `fetch('/api/recipes/:id')` | GET | SELECT |
| Submit "Add recipe" form | `fetch('/api/recipes', {method:'POST'})` | POST | INSERT |
| Click "Delete" | `fetch('/api/recipes/:id', {method:'DELETE'})` | DELETE | DELETE |
| Submit "Join" form | `fetch('/api/users', {method:'POST'})` | POST | INSERT |

---

## File Structure

```
project4/
├── server.js          ← Express server — API + static file serving
├── public/
│   ├── index.html     ← Responsive frontend (P1 design system)
│   ├── css/styles.css ← Full CSS with modal, skeleton, filter bar
│   └── js/app.js      ← All fetch logic, dynamic DOM, CRUD interactions
└── hearth.sqlite      ← SQLite DB (auto-created on first run)
```

---

## Key Full-Stack Concepts Demonstrated

**CORS** — `app.use(cors())` allows the frontend to call the API even from a
different origin (useful when serving them separately during development).

**Same-origin serving** — in production, Express serves both the static files
and the API, so no CORS issues. The `API` constant in `app.js` is `''`,
meaning all fetch calls are relative.

**Fetch + async/await** — every API call is wrapped in a helper that returns
`{ data, error }` so the UI always handles both success and failure states.

**Loading states** — skeleton cards animate while data loads; the grid
re-renders after every mutation (add/delete).

**Optimistic vs. server-confirmed** — this implementation waits for the server
to confirm before re-rendering (safer than optimistic updates at this stage).

**Form → JSON → API** — textarea values are split line-by-line into arrays,
validated client-side first, then POSTed as JSON. The server validates again
(never trust the client).
