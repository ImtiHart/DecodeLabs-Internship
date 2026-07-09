# DecodeLabs — Project 3: Database Integration

Builds on Project 2 by replacing the in-memory store with **SQLite** via `sql.js`
(pure JavaScript — no native build required, works anywhere Node runs).

---

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
# Database file: db/hearth.sqlite  (auto-created and persisted)
```

---

## Architecture — The Four Pillars

```
Pillar 1 — Blueprint:     Schema design (tables, types, constraints)
Pillar 2 — Bridge:        sql.js connection layer (parameterised statements)
Pillar 3 — Action:        CRUD ↔ HTTP ↔ SQL mapping
Pillar 4 — Shield:        NOT NULL, UNIQUE, CHECK, FK constraints + parameterisation
```

---

## Schema Design

```
┌─────────────┐          ┌──────────────────┐          ┌───────────────┐
│   users     │  1 ── M  │    recipes       │  M ── M  │     tags      │
│─────────────│          │──────────────────│          │───────────────│
│ id  PK      │          │ id  PK           │   via    │ id  PK        │
│ name  NN    │◄─────────│ user_id  FK      │──────────│ name  UNIQUE  │
│ email UNIQ  │          │ title  NN        │          └───────────────┘
│ password NN │          │ category  CHECK  │
│ role  CHECK │          │ ingredients TEXT │  ← JSON array
│ created_at  │          │ steps  TEXT      │  ← JSON array
└─────────────┘          │ time_mins CHECK  │
                         │ serves  CHECK    │
                         │ level  CHECK     │
                         │ created_at       │
                         │ updated_at       │
                         └──────────────────┘

                         ┌──────────────────┐
                         │  recipe_tags     │  ← Junction (M:M)
                         │──────────────────│
                         │ recipe_id  FK    │
                         │ tag_id     FK    │
                         │ PK (recipe_id, tag_id)
                         └──────────────────┘
```

### Relationships
- `users` **1:M** `recipes` — one user authors many recipes (FK + CASCADE DELETE)
- `recipes` **M:M** `tags` — via `recipe_tags` junction table

### Constraints (Pillar 4 — The Shield)
| Constraint | Where used |
|------------|-----------|
| `NOT NULL` | All required columns |
| `UNIQUE`   | users.email, tags.name |
| `CHECK`    | category, level, role (enum-like), time_mins/serves > 0 |
| `FOREIGN KEY` | recipes.user_id → users.id, recipe_tags both FKs |
| `CASCADE DELETE` | Deleting a user removes their recipes; deleting a recipe removes its tags links |

---

## CRUD ↔ HTTP ↔ SQL Mapping

| CRUD   | HTTP Method | SQL Verb | Example endpoint      |
|--------|-------------|----------|-----------------------|
| Create | POST        | INSERT   | POST /api/recipes     |
| Read   | GET         | SELECT   | GET  /api/recipes/:id |
| Update | PUT         | UPDATE   | PUT  /api/recipes/:id |
| Delete | DELETE      | DELETE   | DELETE /api/recipes/:id |

---

## Endpoints

```
GET    /api/health
GET    /api/schema                   ← live DB introspection

GET    /api/recipes                  ?category= ?level= ?user_id=
POST   /api/recipes
GET    /api/recipes/:id              (includes tags via M:M JOIN)
PUT    /api/recipes/:id
DELETE /api/recipes/:id
POST   /api/recipes/:id/tags         { tag_id }
DELETE /api/recipes/:id/tags/:tag_id

GET    /api/users
POST   /api/users
GET    /api/users/:id
GET    /api/users/:id/recipes        ← 1:M relationship demo

GET    /api/tags
POST   /api/tags
```

---

## curl Test Suite

```bash
# Health + DB stats
curl http://localhost:3000/api/health

# Live schema introspection
curl http://localhost:3000/api/schema

# ── Recipes ──────────────────────────────────────────────────────────────────
# List all (includes author name from JOIN)
curl http://localhost:3000/api/recipes

# Filter
curl "http://localhost:3000/api/recipes?category=Mains"

# Get one (includes tags from M:M JOIN)
curl http://localhost:3000/api/recipes/1

# Create
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Garlic Noodles","category":"Mains","ingredients":["noodles","garlic"],"steps":["Boil.","Toss."],"time_mins":15,"serves":2,"level":"Easy"}'

# Update (partial)
curl -X PUT http://localhost:3000/api/recipes/1 \
  -H "Content-Type: application/json" \
  -d '{"serves":8}'

# Add a tag (M:M)
curl -X POST http://localhost:3000/api/recipes/1/tags \
  -H "Content-Type: application/json" \
  -d '{"tag_id":2}'

# Delete a tag link
curl -X DELETE http://localhost:3000/api/recipes/1/tags/2

# Delete a recipe (CASCADE removes recipe_tags rows)
curl -X DELETE http://localhost:3000/api/recipes/3

# ── Users ─────────────────────────────────────────────────────────────────────
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl http://localhost:3000/api/users/1/recipes    # 1:M relationship

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alan Turing","email":"alan@example.com","password":"turingtest"}'

# Duplicate email → 409
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Dupe","email":"ada@example.com","password":"password123"}'

# ── Tags ──────────────────────────────────────────────────────────────────────
curl http://localhost:3000/api/tags
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -d '{"name":"spicy"}'

# ── Security: SQL Injection attempt (safe — parameterised queries) ─────────────
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker","email":"'\''OR 1=1 --","password":"password123"}'
# → 400 Bad Request (email validation catches it first, but even if it reached
#   the DB, the parameterised INSERT would treat it as a literal string value)
```

---

## Security: Parameterised Queries

Every DB call uses `db.prepare(sql).bind(params)` — user input is **never**
concatenated into SQL strings.

```js
// ❌ Vulnerable — never do this
db.run(`SELECT * FROM users WHERE email = '${userInput}'`);

// ✅ Safe — what this project uses
db.prepare('SELECT * FROM users WHERE email = ?').bind([userInput]);
```
