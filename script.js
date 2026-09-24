/* ---------- Generate stable ID from title ---------- */
function slugify(title = '') {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 80);
}

/* ---------- Theme ---------- */
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const logoImg = document.getElementById('logo-img');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  logoImg.src = theme === 'dark' ? 'logo-dark.png' : 'logo-light.png';
  localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ---------- Search toggle ---------- */
const searchToggle = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');
searchToggle.addEventListener('click', () => {
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    document.getElementById('search-input').focus();
  }
});

/* ---------- Posts ---------- */
const listEl = document.getElementById('post-list');
const emptyEl = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('date-filter');

const PAGE_SIZE     = 25;
const EXCERPT_LEN   = 200;
const PAGER_ENABLED = true; // بذار false تا pager همیشه مخفی بمونه

let allPosts        = [];
let currentPage     = 1;
let currentFiltered = [];

const pagerEl   = document.getElementById('pager');
const prevBtn   = document.getElementById('prev-page');
const nextBtn   = document.getElementById('next-page');
const pageLabel = document.getElementById('page-label');

/* ---------- Load posts ---------- */
async function loadPosts() {
  try {
    const res = await fetch('index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('index.json not found');
    const data = await res.json();
    allPosts = data.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });
    render(allPosts);
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    emptyEl.textContent = 'Failed to load posts.';
  }
}

/* ---------- Format date ---------- */
function formatDate(dateStr) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(dateStr));
  } catch { return dateStr; }
}

/* ---------- Render ---------- */
function render(posts) {
  currentFiltered = posts;
  currentPage = 1;
  renderPage();
}

function renderPage() {
  listEl.innerHTML = '';

  if (!currentFiltered.length) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No posts found.';
    pagerEl.hidden = true;
    return;
  }
  emptyEl.hidden = true;

  const totalPages = Math.max(1, Math.ceil(currentFiltered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start     = (currentPage - 1) * PAGE_SIZE;
  const pagePosts = currentFiltered.slice(start, start + PAGE_SIZE);

  const frag = document.createDocumentFragment();
  pagePosts.forEach(post => frag.appendChild(buildCard(post)));
  listEl.appendChild(frag);

  pagerEl.hidden = !PAGER_ENABLED;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;

  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------- Build card ---------- */
function buildCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';

  const hasContent  = !!post.content;
  const excerpt     = post.excerpt || '';
  const needsClamp  = hasContent && excerpt.length > EXCERPT_LEN;
  const shortText   = excerpt.slice(0, EXCERPT_LEN);
  const excerptHtml = hasContent
    ? `${escapeHtml(shortText)}${needsClamp ? '…' : ''}`
    : escapeHtml(excerpt);
  const safeContent = hasContent
    ? (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(post.content) : escapeHtml(post.content))
    : '';

  card.innerHTML = `
    <img class="post-banner" src="${escapeAttr(post.banner || '')}" alt="" loading="lazy" onerror="this.style.display='none'">
    <h2 class="post-title">${escapeHtml(post.title || '')}</h2>
    <p class="post-excerpt">${excerptHtml}</p>
    <div class="post-body" hidden>${safeContent}</div>
    ${hasContent ? `<button class="btn-readmore">See more</button>` : ''}
    <div class="post-footer">
      <div class="post-meta">
        <img class="author-avatar" src="${escapeAttr(post.authorAvatar || '')}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="author-name">${escapeHtml(post.authorName || '')}</span>
      </div>
      <span class="post-date">${post.pinned
        ? `<svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z"/></svg> Pinned post`
        : formatDate(post.date)
      }</span>
    </div>`;

  return card;
}

/* ---------- Click delegation ---------- */
listEl.addEventListener('click', (e) => {
  const readmoreBtn = e.target.closest('.btn-readmore');
  if (!readmoreBtn) return;

  const card      = readmoreBtn.closest('.post-card');
  const bodyEl    = card.querySelector('.post-body');
  const excerptEl = card.querySelector('.post-excerpt');
  const isOpen    = !bodyEl.hidden;

  bodyEl.hidden       = isOpen;
  excerptEl.hidden    = !isOpen;
  readmoreBtn.textContent = isOpen ? 'See more' : 'See less';
});

/* ---------- Pager ---------- */
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderPage(); }
});
nextBtn.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(currentFiltered.length / PAGE_SIZE));
  if (currentPage < totalPages) { currentPage++; renderPage(); }
});

/* ---------- Filters ---------- */
function applyFilters() {
  const q       = searchInput.value.trim().toLowerCase();
  const dateVal = dateFilter.value;
  const filtered = allPosts.filter(post => {
    const matchesQuery = !q ||
      (post.title      || '').toLowerCase().includes(q) ||
      (post.excerpt    || '').toLowerCase().includes(q) ||
      (post.authorName || '').toLowerCase().includes(q);
    const matchesDate = !dateVal || (post.date && post.date.slice(0, 10) === dateVal);
    return matchesQuery && matchesDate;
  });
  render(filtered);
}

/* ---------- Helpers ---------- */
function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str = '') {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

searchInput.addEventListener('input', applyFilters);
dateFilter.addEventListener('change', applyFilters);

loadPosts();
