/* ---------- Theme ---------- */
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const logoImg = document.getElementById('logo-img');

function applyTheme(theme){
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
    allPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    render(allPosts);
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    emptyEl.textContent = 'خطا در بارگذاری پست‌ها.';
  }
}

function formatDate(dateStr) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr));
  } catch { return dateStr; }
}

function render(posts) {
  listEl.innerHTML = '';
  if (!posts.length) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'پستی پیدا نشد.';
    return;
  }
  emptyEl.hidden = true;

  const frag = document.createDocumentFragment();
  posts.forEach(post => {
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = post.file;
    card.innerHTML = `
      <img class="post-banner" src="${escapeAttr(post.banner)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <h2 class="post-title">${escapeHtml(post.title)}</h2>
      <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
      <div class="post-meta">
        <img class="author-avatar" src="${escapeAttr(post.authorAvatar)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="author-name">${escapeHtml(post.authorName)}</span>
        <span class="post-date">${formatDate(post.date)}</span>
      </div>`;
    frag.appendChild(card);
  });
  listEl.appendChild(frag);
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const dateVal = dateFilter.value;
  const filtered = allPosts.filter(post => {
    const matchesQuery = !q ||
      post.title.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q);
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
