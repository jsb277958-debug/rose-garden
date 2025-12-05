// Minimal static "blog" for GitHub Pages — stores posts in localStorage (data URLs for attachments).
// IMPORTANT: This is client-side only. Change CONFIG.ADMIN_PASS before publishing if you want a custom password.
const CONFIG = {
  STORAGE_KEY: 'rosary_posts_v1',
  SESSION_KEY: 'rosary_admin_logged_in',
  ADMIN_PASS: 'verysecret' // change this in the repo before publishing if you want a different password
};

function qs(sel, el=document) { return el.querySelector(sel) }
function qsa(sel, el=document) { return Array.from(el.querySelectorAll(sel)) }

function loadPosts() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse posts', e);
    return [];
  }
}
function savePosts(posts) {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(posts));
}

function generateId() { return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }

function isLoggedIn() { return sessionStorage.getItem(CONFIG.SESSION_KEY) === '1'; }
function setLoggedIn(v) { if (v) sessionStorage.setItem(CONFIG.SESSION_KEY, '1'); else sessionStorage.removeItem(CONFIG.SESSION_KEY); updateAuthArea(); }

function updateAuthArea() {
  const area = qs('#auth-area');
  area.innerHTML = '';
  if (isLoggedIn()) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'Signed in';
    area.appendChild(span);
    const out = document.createElement('button');
    out.className = 'btn small';
    out.textContent = 'Sign out';
    out.style.marginLeft = '8px';
    out.onclick = () => { setLoggedIn(false); };
    area.appendChild(out);
    qs('#btn-create').style.display = 'inline-block';
  } else {
    const login = document.createElement('button');
    login.className = 'btn small';
    login.textContent = 'Sign in';
    login.onclick = () => { openLogin(); };
    area.appendChild(login);
    qs('#btn-create').style.display = 'none';
  }
}

function showView(name) {
  ['view-home','view-posts','view-post'].forEach(id => {
    const el = qs('#'+id);
    if (!el) return;
    const show = id === ('view-' + name);
    el.style.display = show ? 'block' : 'none';
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  });
  if (name === 'posts') renderPostsList();
}

function renderPostsList() {
  const posts = loadPosts();
  const list = qs('#post-list');
  list.innerHTML = '';
  if (!posts || posts.length === 0) {
    qs('#no-posts').style.display = 'block';
    return;
  } else {
    qs('#no-posts').style.display = 'none';
  }
  posts.slice().sort((a,b)=> (b.created_at - a.created_at)).forEach(p => {
    const li = document.createElement('li');
    li.className = 'post-item';
    const a = document.createElement('a');
    a.className = 'post-link';
    a.href = '#/post/' + encodeURIComponent(p.id);
    a.onclick = (e) => { e.preventDefault(); navigateTo('#/post/' + encodeURIComponent(p.id)); };
    const title = document.createElement('div');
    title.className = 'post-title';
    title.textContent = p.title;
    const meta = document.createElement('div');
    meta.className = 'post-meta';
    meta.textContent = new Date(p.created_at).toLocaleString();
    const excerpt = document.createElement('div');
    excerpt.className = 'post-excerpt';
    const body = (p.body || '');
    excerpt.textContent = body.length > 160 ? body.slice(0,160) + '…' : body;
    a.appendChild(title);
    a.appendChild(meta);
    a.appendChild(excerpt);
    li.appendChild(a);
    list.appendChild(li);
  });
}

function renderPostDetail(postId) {
  const posts = loadPosts();
  const p = posts.find(x => x.id === postId);
  const container = qs('#post-detail');
  container.innerHTML = '';
  if (!p) {
    container.innerHTML = '<p>Post not found.</p>';
    return;
  }
  const h = document.createElement('h1'); h.textContent = p.title;
  const meta = document.createElement('div'); meta.className = 'post-meta'; meta.textContent = new Date(p.created_at).toLocaleString();
  const body = document.createElement('div'); body.className = 'post-body'; const pre = document.createElement('pre'); pre.textContent = p.body || ''; body.appendChild(pre);
  container.appendChild(h); container.appendChild(meta); container.appendChild(body);

  if (p.attachments && p.attachments.length) {
    const h3 = document.createElement('h3'); h3.textContent = 'Attachments';
    container.appendChild(h3);
    const ul = document.createElement('ul'); ul.className = 'attachments';
    p.attachments.forEach(a => {
      const li = document.createElement('li');
      if (a.type && a.type.startsWith('image/')) {
        const link = document.createElement('a'); link.href = a.data; link.target = '_blank';
        const img = document.createElement('img'); img.src = a.data; img.alt = a.name; img.className = 'post-image';
        link.appendChild(img); li.appendChild(link);
        const cap = document.createElement('div'); cap.textContent = a.name; li.appendChild(cap);
      } else if (a.type && a.type.startsWith('audio/')) {
        const cap = document.createElement('div'); cap.textContent = a.name; li.appendChild(cap);
        const audio = document.createElement('audio'); audio.controls = true; audio.src = a.data; li.appendChild(audio);
      } else {
        const link = document.createElement('a'); link.href = a.data; link.download = a.name; link.textContent = a.name; li.appendChild(link);
      }
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }
}

function openModal() {
  const m = qs('#modal'); m.setAttribute('aria-hidden','false');
}
function closeModal() {
  const m = qs('#modal'); m.setAttribute('aria-hidden','true');
  qs('#new-post-form').reset();
  qs('#post-files').value = '';
}
function openLogin() {
  const m = qs('#login-prompt'); m.setAttribute('aria-hidden','false');
  qs('#login-password').value = '';
}
function closeLogin() {
  qs('#login-prompt').setAttribute('aria-hidden','true');
  qs('#login-form').reset();
}

function createPostFromForm(ev) {
  ev.preventDefault();
  const title = qs('#post-title').value.trim();
  const body = qs('#post-body').value || '';
  if (!title) { alert('Title is required'); return; }
  const files = Array.from(qs('#post-files').files || []);
  const attachments = [];
  if (files.length === 0) {
    saveNewPost(title, body, attachments);
  } else {
    // read files as data URLs
    let readCount = 0;
    files.forEach(f => {
      const r = new FileReader();
      r.onload = (e) => {
        attachments.push({ name: f.name, type: f.type, size: f.size, data: e.target.result });
        readCount++;
        if (readCount === files.length) {
          saveNewPost(title, body, attachments);
        }
      };
      r.onerror = () => { readCount++; if (readCount === files.length) saveNewPost(title, body, attachments); };
      r.readAsDataURL(f);
    });
  }
}

function saveNewPost(title, body, attachments) {
  const posts = loadPosts();
  const post = {
    id: generateId(),
    title,
    body,
    created_at: Date.now(),
    attachments: attachments || []
  };
  posts.push(post);
  savePosts(posts);
  closeModal();
  navigateTo('#/post/' + encodeURIComponent(post.id));
}

function handleExport() {
  const posts = loadPosts();
  const blob = new Blob([JSON.stringify(posts, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rosary_posts_export.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function handleImportFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      if (!confirm('This will replace your current posts with the imported data. Continue?')) return;
      savePosts(imported);
      alert('Import complete.');
      renderPostsList();
      navigateTo('#/posts');
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };
  r.readAsText(file);
}

function attemptLogin(ev) {
  ev.preventDefault();
  const pw = qs('#login-password').value || '';
  if (pw === CONFIG.ADMIN_PASS) {
    setLoggedIn(true);
    closeLogin();
    alert('Signed in.');
  } else {
    alert('Invalid password.');
  }
}

function navigateTo(hash) {
  location.hash = hash;
  handleRouting();
}
function handleRouting() {
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '') {
    showView('home');
  } else if (hash.startsWith('#/posts')) {
    showView('posts');
  } else if (hash.startsWith('#/post/')) {
    const id = decodeURIComponent(hash.split('/')[2] || '');
    showView('post');
    renderPostDetail(id);
  } else {
    showView('home');
  }
}

// Init
function init() {
  // wire nav
  qs('#nav-home').addEventListener('click', (e)=>{ e.preventDefault(); navigateTo('#/'); });
  qs('#nav-posts').addEventListener('click', (e)=>{ e.preventDefault(); navigateTo('#/posts'); });

  qs('#btn-create').addEventListener('click', ()=>{ openModal(); });
  qs('#modal-close').addEventListener('click', ()=> closeModal());
  qs('#modal-cancel').addEventListener('click', ()=> closeModal());
  qs('#new-post-form').addEventListener('submit', createPostFromForm);

  qs('#btn-export').addEventListener('click', handleExport);
  qs('#importFile').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) handleImportFile(f); e.target.value = ''; });

  // login modal
  qs('#login-form').addEventListener('submit', attemptLogin);
  qs('#login-cancel').addEventListener('click', ()=> closeLogin());

  // route on hash change
  window.addEventListener('hashchange', handleRouting);

  // back to posts button
  qs('#back-to-posts').addEventListener('click', (e)=> { e.preventDefault(); navigateTo('#/posts'); });

  updateAuthArea();
  handleRouting();
}

document.addEventListener('DOMContentLoaded', init);
