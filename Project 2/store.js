/**
 * In-memory data store.
 * Simulates a database without requiring a DB setup.
 * In Project 3 this layer would be swapped for real DB calls.
 */

let nextRecipeId = 4;
let nextUserId   = 3;

const recipes = [
  {
    id:          1,
    title:       'Slow Lentil & Smoked Paprika Soup',
    category:    'Soups & Stews',
    ingredients: ['red lentils', 'smoked paprika', 'onion', 'garlic', 'vegetable stock'],
    steps:       ['Sauté onion and garlic.', 'Add lentils and stock.', 'Simmer 30 min.', 'Blend half, season.'],
    time_mins:   45,
    serves:      4,
    level:       'Easy',
    created_at:  new Date('2026-06-01').toISOString(),
  },
  {
    id:          2,
    title:       'Coconut Chickpea Curry',
    category:    'Mains',
    ingredients: ['chickpeas', 'coconut milk', 'tomatoes', 'garam masala', 'coriander'],
    steps:       ['Fry spices.', 'Add tomatoes and chickpeas.', 'Pour coconut milk.', 'Simmer 20 min.'],
    time_mins:   35,
    serves:      4,
    level:       'Easy',
    created_at:  new Date('2026-06-10').toISOString(),
  },
  {
    id:          3,
    title:       'Olive Oil & Orange Cake',
    category:    'Desserts',
    ingredients: ['olive oil', 'orange zest', 'eggs', 'sugar', 'flour', 'baking powder'],
    steps:       ['Whisk eggs and sugar.', 'Fold in oil and zest.', 'Combine dry ingredients.', 'Bake 45 min at 180°C.'],
    time_mins:   60,
    serves:      10,
    level:       'Medium',
    created_at:  new Date('2026-06-15').toISOString(),
  },
];

const users = [
  { id: 1, name: 'Ada Lovelace',  email: 'ada@example.com',     role: 'admin',  created_at: new Date('2026-01-01').toISOString() },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com',   role: 'member', created_at: new Date('2026-02-14').toISOString() },
];

// ── Recipe helpers ────────────────────────────────────────────────────────────
const db = {
  recipes: {
    findAll:   ()      => [...recipes],
    findById:  (id)    => recipes.find(r => r.id === id),
    create:    (data)  => {
      const recipe = { id: nextRecipeId++, ...data, created_at: new Date().toISOString() };
      recipes.push(recipe);
      return recipe;
    },
    update:    (id, data) => {
      const idx = recipes.findIndex(r => r.id === id);
      if (idx === -1) return null;
      recipes[idx] = { ...recipes[idx], ...data, id, updated_at: new Date().toISOString() };
      return recipes[idx];
    },
    remove:    (id)    => {
      const idx = recipes.findIndex(r => r.id === id);
      if (idx === -1) return false;
      recipes.splice(idx, 1);
      return true;
    },
  },

  users: {
    findAll:   ()      => users.map(u => omit(u, ['password'])),
    findById:  (id)    => { const u = users.find(u => u.id === id); return u ? omit(u, ['password']) : null; },
    findByEmail: (email) => users.find(u => u.email === email),
    create:    (data)  => {
      const user = { id: nextUserId++, ...data, role: 'member', created_at: new Date().toISOString() };
      users.push(user);
      return omit(user, ['password']);
    },
  },
};

function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(k => delete result[k]);
  return result;
}

module.exports = db;
