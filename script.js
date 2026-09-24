/* ---------- Upstash Config ---------- */
// مقادیر زیر رو از console.upstash.com → database → REST API بگیر
const UPSTASH_URL   = 'https://working-mammoth-296353.upstash.io';
const UPSTASH_TOKEN = 'ggAAAAAABIWhAAIgcDEd33eDCPcKKM_b8YwRRQnIh81RKIVF1Fa3M-DpNfXNQw';

/* ---------- Upstash helpers ---------- */
async function upstashCmd(...args) {
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    const json = await res.json();
    return json.result;
  } catch (e) {
    console.error('Upstash error:', e);
    return null;
  }
}

async function upstashPipeline(commands) {
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });
    return await res.json();
  } catch (e) {
    console.error('Upstash pipeline error:', e);
    return [];
  }
}

/* ---------- User likes (localStorage) ---------- */
function getUserLikes() {
  try { return JSON.parse(localStorage.getItem('maborai:likes') || '{}'); }
  catch { return {}; }
}
function setUserLike(postId, liked) {
  const likes = getUserLikes();
  if (liked) likes[postId] = true;
  else delete likes[postId];
  localStorage.setItem('maborai:likes', JSON.stringify(likes));
}
function hasUserLiked(postId) {
  return !!getUserLikes()[postId];
}

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

let allPosts = [];

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

function formatDate(dateStr) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(dateStr));
  } catch { return dateStr; }
}

const PAGE_SIZE  = 30;
const EXCERPT_LEN = 200;
let currentPage     = 1;
let currentFiltered = [];

const pagerEl   = document.getElementById('pager');
const prevBtn   = document.getElementById('prev-page');
const nextBtn   = document.getElementById('next-page');
const pageLabel = document.getElementById('page-label');

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
  pagePosts.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card';

    const postId     = slugify(post.title);
    const hasContent = !!post.content;
    const excerpt    = post.excerpt || '';
    const needsClamp = hasContent && excerpt.length > EXCERPT_LEN;
    const shortText  = excerpt.slice(0, EXCERPT_LEN);
    const excerptHtml = hasContent
      ? `${escapeHtml(shortText)}${needsClamp ? '…' : ''}`
      : escapeHtml(excerpt);
    const safeContent = hasContent
      ? (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(post.content) : escapeHtml(post.content))
      : '';

    const liked = hasUserLiked(postId);

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
          <span class="post-date">${post.pinned
            ? `<svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z"/></svg> Pinned post`
            : formatDate(post.date)
          }</span>
        </div>
        <button class="btn-like${liked ? ' liked' : ''}" data-id="${escapeAttr(postId)}" aria-label="Like">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="like-count"></span>
        </button>
      </div>`;
    frag.appendChild(card);
  });
  listEl.appendChild(frag);

  pagerEl.hidden = totalPages <= 1;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;

  window.scrollTo({ top: 0, behavior: 'instant' });

  // load counts after DOM is ready
  loadLikeCounts();
}

/* ---------- Load like counts ---------- */
async function loadLikeCounts() {
  const buttons = listEl.querySelectorAll('.btn-like');
  if (!buttons.length) return;

  const ids      = Array.from(buttons).map(b => b.dataset.id);
  const commands = ids.map(id => ['HGET', 'post:likes', id]);
  const results  = await upstashPipeline(commands);

  buttons.forEach((btn, i) => {
    const count = Math.max(0, parseInt(results[i]?.result || '0', 10));
    btn.querySelector('.like-count').textContent = count > 0 ? count : '';
  });
}

/* ---------- Handle like click ---------- */
async function handleLike(btn) {
  const postId  = btn.dataset.id;
  const wasLiked = btn.classList.contains('liked');

  // optimistic update
  btn.classList.toggle('liked');
  btn.disabled = true;

  const delta    = wasLiked ? -1 : 1;
  const newCount = await upstashCmd('HINCRBY', 'post:likes', postId, delta);

  btn.disabled = false;

  if (newCount !== null) {
    setUserLike(postId, !wasLiked);
    const count = Math.max(0, parseInt(newCount, 10));
    btn.querySelector('.like-count').textContent = count > 0 ? count : '';
  } else {
    // revert on error
    btn.classList.toggle('liked');
  }
}

/* ---------- Click delegation ---------- */
listEl.addEventListener('click', async (e) => {
  const likeBtn = e.target.closest('.btn-like');
  if (likeBtn) {
    await handleLike(likeBtn);
    return;
  }

  const readmoreBtn = e.target.closest('.btn-readmore');
  if (!readmoreBtn) return;

  const card      = readmoreBtn.closest('.post-card');
  const bodyEl    = card.querySelector('.post-body');
  const excerptEl = card.querySelector('.post-excerpt');
  const isOpen    = !bodyEl.hidden;

  bodyEl.hidden    = isOpen;
  excerptEl.hidden = !isOpen;
  readmoreBtn.textContent = isOpen ? 'See more' : 'See less';
});

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

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str = '') {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

searchInput.addEventListener('input', applyFilters);
dateFilter.addEventListener('change', applyFilters);

loadPosts();
