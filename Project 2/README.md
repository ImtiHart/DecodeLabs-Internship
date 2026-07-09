# DecodeLabs — Project 2: Backend API

A RESTful JSON API built with **Node.js + Express**.  
No database required — data lives in memory so the server starts instantly.

---

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

---

## Architecture

```
project2/
├── server.js              # Entry point — boots Express, mounts routes
├── routes/
│   ├── health.js          # GET /api/health
│   ├── recipes.js         # /api/recipes  (full CRUD)
│   └── users.js           # /api/users    (list, create, get)
├── middleware/
│   └── errorHandler.js    # 404 catcher + global error handler
├── data/
│   └── store.js           # In-memory DB (swap for real DB in Project 3)
└── utils/
    └── validate.js        # Syntactic + semantic validation
```

---

## Response Envelope

Every response shares this shape:

```json
{
  "success": true,
  "status":  200,
  "data":    { ... }
}
```

Errors:

```json
{
  "success": false,
  "status":  400,
  "message": "Validation failed.",
  "errors":  ["title is required", "..."]
}
```

---

## Endpoints

### Health

| Method | Path          | Description       |
|--------|---------------|-------------------|
| GET    | /api/health   | Liveness probe    |

```bash
curl http://localhost:3000/api/health
```

---

### Recipes

| Method | Path               | Status | Description         |
|--------|--------------------|--------|---------------------|
| GET    | /api/recipes       | 200    | List all            |
| GET    | /api/recipes?category=Mains | 200 | Filter by category |
| GET    | /api/recipes/:id   | 200    | Get one             |
| POST   | /api/recipes       | 201    | Create one          |
| PUT    | /api/recipes/:id   | 200    | Update one          |
| DELETE | /api/recipes/:id   | 204    | Delete one          |

**POST /api/recipes** — request body:

```json
{
  "title":       "Garlic Chilli Noodles",
  "category":    "Mains",
  "ingredients": ["noodles", "garlic", "chilli oil", "soy sauce"],
  "steps":       ["Boil noodles.", "Fry garlic.", "Toss with sauce."],
  "time_mins":   15,
  "serves":      2,
  "level":       "Easy"
}
```

Allowed `category` values: `Soups & Stews`, `Baking`, `Salads`, `Mains`, `Desserts`  
Allowed `level` values: `Easy`, `Medium`, `Hard`

---

### Users

| Method | Path            | Status | Description    |
|--------|-----------------|--------|----------------|
| GET    | /api/users      | 200    | List all       |
| GET    | /api/users/:id  | 200    | Get one        |
| POST   | /api/users      | 201    | Register       |

**POST /api/users** — request body:

```json
{
  "name":     "Alan Turing",
  "email":    "alan@example.com",
  "password": "securepassword"
}
```

Passwords are **never** returned in any response.  
Duplicate emails return **409 Conflict**.

---

## HTTP Status Codes Used

| Code | Meaning          | When used                        |
|------|------------------|----------------------------------|
| 200  | OK               | Successful GET / PUT             |
| 201  | Created          | Successful POST                  |
| 204  | No Content       | Successful DELETE                |
| 400  | Bad Request      | Validation failure / bad id      |
| 404  | Not Found        | Resource doesn't exist           |
| 409  | Conflict         | Duplicate email on user creation |
| 500  | Internal Error   | Unexpected server error          |

---

## curl Test Suite

```bash
# Health check
curl http://localhost:3000/api/health

# List all recipes
curl http://localhost:3000/api/recipes

# Filter by category
curl "http://localhost:3000/api/recipes?category=Mains"

# Get a single recipe
curl http://localhost:3000/api/recipes/1

# Create a recipe
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Garlic Noodles","category":"Mains","ingredients":["noodles","garlic"],"steps":["Boil","Toss"],"time_mins":15,"serves":2,"level":"Easy"}'

# Update a recipe (partial)
curl -X PUT http://localhost:3000/api/recipes/1 \
  -H "Content-Type: application/json" \
  -d '{"serves":6}'

# Delete a recipe
curl -X DELETE http://localhost:3000/api/recipes/1

# Register a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alan Turing","email":"alan@example.com","password":"securepass"}'

# Trigger a 400 (missing required field)
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"No Category"}'

# Trigger a 404
curl http://localhost:3000/api/recipes/999
```
