/**
 * DecodeLabs — Project 4: Frontend JS
 *
 * This file bridges the P1 frontend with the P3 backend API using:
 *  - fetch() with async/await
 *  - Dynamic DOM rendering (no frameworks)
 *  - Loading/error states
 *  - Full CRUD: Read (GET), Create (POST), Delete (DELETE)
 */

'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
const API = '';  // same-origin; change to 'http://localhost:3000' if serving separately

// ── State ─────────────────────────────────────────────────────────────────────
let allRecipes = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const recipeGrid     = document.getElementById('recipeGrid');
const emptyState     = document.getElementById('emptyState');
const filterCategory = document.getElementById('filterCategory');
const filterLevel    = document.getElementById('filterLevel');
const recipeCount    = document.getElementById('recipeCount');
const statusBanner   = document.getElementById('statusBanner');
const statusMsg      = document.getElementById('statusMsg');
const statusClose    = document.getElementById('statusClose');
const modalOverlay   = document.getElementById('modalOverlay');
const modalBody      = document.getElementById('modalBody');
const modalClose     = document.getElementById('modalClose');
const addRecipeForm  = document.getElementById('addRecipeForm');
const registerForm   = document.getElementById('registerForm');
const apiDot         = document.getElementById('apiDot');
const apiStatusText  = document.getElementById('apiStatusText');
const heroCardTitle  = document.getElementById('heroCardTitle');
const heroCardMeta   = document.getElementById('heroCardMeta');

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Fetch wrapper — returns { data, error } */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json.message || json.errors?.join(', ') || `HTTP ${res.status}`, status: res.status, data: null };
    return { data: json, error: null, status: res.status };
  } catch (e) {
    return { error: 'Network error — is the server running?', data: null, status: 0 };
  }
}

/** Show a status banner for 3 s */
function showStatus(msg, type = 'success') {
  statusMsg.textContent = msg;
  statusBanner.className = `status-banner status-banner--${type}`;
  statusBanner.hidden = false;
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => { statusBanner.hidden = true; }, 3500);
}

statusClose.addEventListener('click', () => { statusBanner.hidden = true; });

/** Show field-level errors in a form errors div */
function showFormErrors(el, errors) {
  el.hidden = false;
  const list = Array.isArray(errors) ? errors : [errors];
  el.innerHTML = `<ul>${list.map(e => `<li>${e}</li>`).join('')}</ul>`;
}
function clearFormErrors(el) { el.hidden = true; el.innerHTML = ''; }

/** Category → CSS class slug */
function categoryClass(cat) {
  if (!cat) return '';
  const map = { 'Soups & Stews': 'Soups', Baking: 'Baking',
    Salads: 'Salads', Mains: 'Mains', Desserts: 'Desserts' };
  return map[cat] || '';
}

// ── API Health Check ──────────────────────────────────────────────────────────
async function checkHealth() {
  const { data, error } = await apiFetch('/api/health');
  if (error) {
    apiDot.className = 'api-dot api-dot--offline';
    apiStatusText.textContent = `API offline — ${error}`;
  } else {
    apiDot.className = 'api-dot api-dot--online';
    apiStatusText.textContent = `API live · ${data.stats.recipes} recipes · ${data.stats.users} users`;
  }
}

// ── Fetch + Render Recipes ────────────────────────────────────────────────────
async function loadRecipes() {
  // Build query string from active filters
  const params = new URLSearchParams();
  if (filterCategory.value) params.set('category', filterCategory.value);
  if (filterLevel.value)    params.set('level',    filterLevel.value);
  const qs = params.toString() ? `?${params}` : '';

  // Show skeletons while loading
  recipeGrid.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>`;
  emptyState.hidden = true;

  const { data, error } = await apiFetch(`/api/recipes${qs}`);
  if (error) {
    recipeGrid.innerHTML = `<p style="color:var(--color-error);padding:1rem">Failed to load recipes: ${error}</p>`;
    return;
  }

  allRecipes = data.data;
  renderGrid(allRecipes);

  // Update hero card with latest recipe
  if (allRecipes.length) {
    const r = allRecipes[0];
    heroCardTitle.textContent = r.title;
    heroCardMeta.textContent  = `${r.time_mins ? r.time_mins + ' min · ' : ''}Serves ${r.serves ?? '?'} · ${r.level}`;
  }
}

function renderGrid(recipes) {
  recipeCount.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;

  if (!recipes.length) {
    recipeGrid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  recipeGrid.innerHTML = recipes.map(r => `
    <article class="recipe-card" data-id="${r.id}"
      tabindex="0" role="button" aria-label="View ${r.title}">
      <div class="recipe-card__media recipe-card__media--${categoryClass(r.category)}"
        aria-hidden="true"></div>
      <div class="recipe-card__body">
        <p class="recipe-card__category">${r.category}</p>
        <h3>${r.title}</h3>
        <p>${Array.isArray(r.ingredients) ? r.ingredients.slice(0,3).join(', ') + (r.ingredients.length > 3 ? '…' : '') : ''}</p>
        <dl class="recipe-card__meta">
          ${r.time_mins ? `<div><dt>Time</dt><dd>${r.time_mins} min</dd></div>` : ''}
          ${r.serves    ? `<div><dt>Serves</dt><dd>${r.serves}</dd></div>` : ''}
          <div><dt>Level</dt><dd>${r.level}</dd></div>
        </dl>
      </div>
      <div class="recipe-card__actions">
        <button class="btn btn--ghost btn--sm" data-action="view" data-id="${r.id}">View</button>
        <button class="btn btn--danger btn--sm" data-action="delete" data-id="${r.id}">Delete</button>
      </div>
    </article>`).join('');

  // Event delegation on the grid
  recipeGrid.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) { openModal(parseInt(card.dataset.id)); return; }
      if (btn.dataset.action === 'view')   openModal(parseInt(btn.dataset.id));
      if (btn.dataset.action === 'delete') deleteRecipe(parseInt(btn.dataset.id));
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(parseInt(card.dataset.id)); }
    });
  });
}

// ── Filters ───────────────────────────────────────────────────────────────────
filterCategory.addEventListener('change', loadRecipes);
filterLevel.addEventListener('change', loadRecipes);

function clearFilters() { filterCategory.value = ''; filterLevel.value = ''; loadRecipes(); }
document.getElementById('clearFilters').addEventListener('click', clearFilters);
document.getElementById('clearFilters2').addEventListener('click', clearFilters);

// ── Modal ─────────────────────────────────────────────────────────────────────
async function openModal(id) {
  modalBody.innerHTML = '<p style="padding:2rem;text-align:center">Loading…</p>';
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  modalClose.focus();

  const { data, error } = await apiFetch(`/api/recipes/${id}`);
  if (error) { modalBody.innerHTML = `<p style="color:red;padding:2rem">${error}</p>`; return; }

  const r = data.data;
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  const steps       = Array.isArray(r.steps)       ? r.steps       : [];

  modalBody.innerHTML = `
    <span class="recipe-card__category">${r.category}</span>
    <h2>${r.title}</h2>
    <p style="color:var(--color-ink-soft);font-size:.9rem">By ${r.author}</p>
    <div class="modal-meta">
      <dl class="recipe-card__meta">
        ${r.time_mins ? `<div><dt>Time</dt><dd>${r.time_mins} min</dd></div>` : ''}
        ${r.serves    ? `<div><dt>Serves</dt><dd>${r.serves}</dd></div>` : ''}
        <div><dt>Level</dt><dd>${r.level}</dd></div>
      </dl>
    </div>
    <div class="modal-section">
      <h3>Ingredients</h3>
      <ul>${ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>
    <div class="modal-section">
      <h3>Method</h3>
      <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>
    <div class="modal-actions">
      <button class="btn btn--danger btn--sm" id="modalDelete" data-id="${r.id}">Delete recipe</button>
      <button class="btn btn--ghost btn--sm" id="modalCloseBtn">Close</button>
    </div>`;

  document.getElementById('modalDelete').addEventListener('click', () => {
    closeModal(); deleteRecipe(r.id);
  });
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Delete Recipe ─────────────────────────────────────────────────────────────
async function deleteRecipe(id) {
  if (!confirm('Delete this recipe? This cannot be undone.')) return;

  const { error, status } = await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
  if (error && status !== 204) {
    showStatus(`Delete failed: ${error}`, 'error');
    return;
  }
  showStatus('Recipe deleted.', 'success');
  loadRecipes();
  checkHealth();
}

// ── Add Recipe Form (POST /api/recipes) ───────────────────────────────────────
addRecipeForm.addEventListener('submit', async e => {
  e.preventDefault();
  const errEl  = document.getElementById('formErrors');
  const submitBtn = document.getElementById('submitBtn');
  clearFormErrors(errEl);

  const fd   = new FormData(addRecipeForm);
  const body = {
    title:       fd.get('title'),
    category:    fd.get('category'),
    level:       fd.get('level'),
    time_mins:   fd.get('time_mins') ? parseInt(fd.get('time_mins')) : null,
    serves:      fd.get('serves')    ? parseInt(fd.get('serves'))    : null,
    ingredients: fd.get('ingredients').split('\n').map(s => s.trim()).filter(Boolean),
    steps:       fd.get('steps').split('\n').map(s => s.trim()).filter(Boolean),
  };

  // Client-side quick check
  const errs = [];
  if (!body.title || body.title.length < 3) errs.push('Recipe name must be at least 3 characters.');
  if (!body.category) errs.push('Please choose a category.');
  if (!body.ingredients.length) errs.push('Add at least one ingredient.');
  if (!body.steps.length) errs.push('Add at least one step.');
  if (errs.length) { showFormErrors(errEl, errs); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  const { data, error } = await apiFetch('/api/recipes', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save recipe';

  if (error) { showFormErrors(errEl, [error]); return; }

  showStatus(`"${data.data.title}" added to the box!`, 'success');
  addRecipeForm.reset();
  loadRecipes();
  checkHealth();
  // Scroll to grid
  document.getElementById('recipes').scrollIntoView({ behavior: 'smooth' });
});

// ── Register Form (POST /api/users) ───────────────────────────────────────────
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const errEl  = document.getElementById('regErrors');
  const regBtn = document.getElementById('regBtn');
  clearFormErrors(errEl);

  const fd   = new FormData(registerForm);
  const body = { name: fd.get('name'), email: fd.get('email'), password: fd.get('password') };

  // Quick client check
  const errs = [];
  if (!body.name || body.name.length < 2)                  errs.push('Name must be at least 2 characters.');
  if (!body.email || !/^[^\s@]+@[^\s@]+/.test(body.email)) errs.push('Valid email required.');
  if (!body.password || body.password.length < 8)           errs.push('Password must be at least 8 characters.');
  if (errs.length) { showFormErrors(errEl, errs); return; }

  regBtn.disabled = true;
  regBtn.textContent = 'Creating…';

  const { data, error, status } = await apiFetch('/api/users', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

  regBtn.disabled = false;
  regBtn.textContent = 'Create account';

  if (error) {
    showFormErrors(errEl, [status === 409 ? 'That email is already registered.' : error]);
    return;
  }

  showStatus(`Welcome, ${data.data.name}! Account created.`, 'success');
  registerForm.reset();
  checkHealth();
});

// ── Mobile nav ────────────────────────────────────────────────────────────────
const navToggle  = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');
navToggle.addEventListener('click', () => {
  const open = primaryNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(open));
});
primaryNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  primaryNav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

// ── Boot ──────────────────────────────────────────────────────────────────────
checkHealth();
loadRecipes();
