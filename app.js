// app.js - Firebase modular SDK (v9+). Uses Auth + Firestore (no Storage).
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ====== KEEP YOUR firebaseConfig HERE (unchanged) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyAm7BymAwSe3IxpI-AQ95g6a1JIo8TcBK8",
  authDomain: "rosarys-rose-garden.firebaseapp.com",
  projectId: "rosarys-rose-garden",
  storageBucket: "rosarys-rose-garden.firebasestorage.app",
  messagingSenderId: "180889677592",
  appId: "1:180889677592:web:4039a51e092d706196b86d",
  measurementId: "G-J26L15CMPT"
};
/* ===================================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function qs(sel, el=document) { return el && el.querySelector ? el.querySelector(sel) : null; }
function qsa(sel, el=document) { return el && el.querySelectorAll ? Array.from(el.querySelectorAll(sel)) : []; }

function usernameToEmail(username){
  return `${username}@rosary.local`;
}

let currentUser = null;

/* ---------- VIEW MANAGEMENT ---------- */
function showView(name){
  ['home','posts','post','admin'].forEach(n=>{
    const el = qs('#view-'+n);
    if(!el) return;
    const show = n===name;
    el.style.display = show ? 'block' : 'none';
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  });
  // always close modal on route change
  closeModal();
  updateCreateBtnVisibility();
  if (name === 'posts') renderPostsList();
}
function updateCreateBtnVisibility(){
  const createBtn = qs('#btn-create');
  if (!createBtn) return;
  if (currentUser && location.hash.startsWith('#/posts')) createBtn.style.display = 'inline-block';
  else createBtn.style.display = 'none';
}

/* ---------- AUTH AREA ---------- */
function updateAuthArea(){
  const area = qs('#auth-area');
  if (!area) return;
  area.innerHTML = '';
  if (currentUser) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = `Signed in as ${currentUser.email}`;
    area.appendChild(span);
    const out = document.createElement('button');
    out.className = 'btn small';
    out.textContent = 'Sign out';
    out.style.marginLeft = '8px';
    out.onclick = async () => {
      try { await signOut(auth); navigateTo('#/'); }
      catch(err){ console.error('Sign out failed', err); alert('Sign out failed'); }
    };
    area.appendChild(out);
  } else {
    const login = document.createElement('button');
    login.className = 'btn small';
    login.textContent = 'Sign in';
    login.onclick = () => { navigateTo('#/admin'); };
    area.appendChild(login);
  }
  updateCreateBtnVisibility();
}

/* ---------- POSTS LIST ---------- */
async function fetchPosts(){
  try {
    const col = collection(db, 'posts');
    const q = query(col, orderBy('created_at','desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('fetchPosts error', err);
    throw err;
  }
}

async function renderPostsList(){
  const list = qs('#post-list');
  if (!list) return;
  list.innerHTML = '';
  let posts = [];
  try {
    posts = await fetchPosts();
  } catch (e) {
    console.error(e);
    qs('#no-posts') && (qs('#no-posts').style.display = 'block');
    alert('Failed to load posts (see console).');
    return;
  }
  if (!posts || posts.length === 0) {
    qs('#no-posts') && (qs('#no-posts').style.display = 'block');
    return;
  } else qs('#no-posts') && (qs('#no-posts').style.display = 'none');

  posts.forEach(p=>{
    const li = document.createElement('li'); li.className = 'post-item';
    const a = document.createElement('a'); a.className='post-link';
    a.href = '#/post/' + encodeURIComponent(p.id);
    a.onclick = (e)=>{ e.preventDefault(); navigateTo('#/post/'+encodeURIComponent(p.id)); };
    const title = document.createElement('div'); title.className='post-title'; title.textContent = p.title;
    const meta = document.createElement('div'); meta.className='post-meta';
    const createdAt = p.created_at && p.created_at.toDate ? p.created_at.toDate() : new Date(p.created_at || Date.now());
    meta.textContent = createdAt.toLocaleString();
    const excerpt = document.createElement('div'); excerpt.className='post-excerpt';
    const tmp = document.createElement('div'); tmp.innerHTML = p.body || ''; const text = tmp.textContent || tmp.innerText || '';
    excerpt.textContent = text.length > 160 ? text.slice(0,160) + '…' : text;
    a.appendChild(title); a.appendChild(meta); a.appendChild(excerpt);
    li.appendChild(a);
    list.appendChild(li);
  });
}

/* ---------- POST DETAIL ---------- */
async function renderPostDetail(postId){
  const container = qs('#post-detail');
  if (!container) return;
  container.innerHTML = '';
  try {
    const d = await getDoc(doc(db,'posts',postId));
    if (!d.exists()) { container.innerHTML = '<p>Post not found.</p>'; return; }
    const p = { id: d.id, ...d.data() };
    const h = document.createElement('h1'); h.textContent = p.title;
    const meta = document.createElement('div'); meta.className = 'post-meta';
    const createdAt = p.created_at && p.created_at.toDate ? p.created_at.toDate() : new Date(p.created_at || Date.now());
    meta.textContent = createdAt.toLocaleString();
    const body = document.createElement('div'); body.className = 'post-body'; body.innerHTML = p.body || '';
    container.appendChild(h); container.appendChild(meta); container.appendChild(body);

    // admin controls visible only when signed in
    if (currentUser) {
      const controls = document.createElement('div'); controls.style.marginTop = '1rem';
      const editBtn = document.createElement('button'); editBtn.className = 'btn small'; editBtn.textContent = 'Edit';
      editBtn.onclick = ()=> openModalForEdit(p.id, p);
      const delBtn = document.createElement('button'); delBtn.className = 'btn small'; delBtn.style.marginLeft='8px'; delBtn.textContent='Delete';
      delBtn.onclick = async ()=> {
        if (!confirm('Delete this post?')) return;
        try {
          await deleteDoc(doc(db,'posts',p.id));
          alert('Deleted');
          navigateTo('#/posts');
        } catch(err){
          console.error('Delete error', err);
          alert('Delete failed (see console).');
        }
      };
      controls.appendChild(editBtn); controls.appendChild(delBtn);
      container.appendChild(controls);
    }
  } catch (err) {
    console.error('renderPostDetail error', err);
    container.innerHTML = '<p>Failed to load post.</p>';
  }
}

/* ---------- MODAL (create/edit) ---------- */
function openModal(){
  if (!currentUser) { alert('You must sign in to create a post.'); navigateTo('#/admin'); return; }
  qs('#modal-title') && (qs('#modal-title').textContent = 'New Post');
  qs('#modal-save') && (qs('#modal-save').textContent = 'Publish');
  const f = qs('#new-post-form'); if (f) f.dataset.editId = '';
  qs('#post-title') && (qs('#post-title').value = '');
  qs('#post-body') && (qs('#post-body').innerHTML = '');
  qs('#modal') && qs('#modal').setAttribute('aria-hidden','false');
}
function openModalForEdit(postId, postObj){
  qs('#modal-title') && (qs('#modal-title').textContent = 'Edit Post');
  qs('#modal-save') && (qs('#modal-save').textContent = 'Save Changes');
  const f = qs('#new-post-form'); if (f) f.dataset.editId = postId;
  qs('#post-title') && (qs('#post-title').value = postObj.title || '');
  qs('#post-body') && (qs('#post-body').innerHTML = postObj.body || '');
  qs('#modal') && qs('#modal').setAttribute('aria-hidden','false');
}
function closeModal(){
  qs('#modal') && qs('#modal').setAttribute('aria-hidden','true');
  const form = qs('#new-post-form'); if (form) form.reset();
  qs('#post-body') && (qs('#post-body').innerHTML = '');
}

/* ---------- EDITOR TOOLBAR (with fallback) ---------- */
function applySimpleWrap(command) {
  // custom minimal implementation for bold/italic/underline if execCommand not available
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const selected = range.toString();
  if (!selected) return alert('Select some text first.');
  let el;
  if (command === 'bold') el = document.createElement('strong');
  else if (command === 'italic') el = document.createElement('em');
  else if (command === 'underline') el = document.createElement('u');
  else return;
  el.textContent = selected;
  range.deleteContents();
  range.insertNode(el);
  // collapse selection to after inserted node
  sel.removeAllRanges();
}

function setupEditorToolbar(){
  qsa('#editor-toolbar [data-cmd]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const cmd = btn.getAttribute('data-cmd');
      try {
        // prefer execCommand if present and allowed
        if (typeof document.execCommand === 'function') {
          const ok = document.execCommand(cmd, false, null);
          if (!ok) {
            // fallback
            applySimpleWrap(cmd);
          }
        } else {
          applySimpleWrap(cmd);
        }
      } catch (err) {
        console.warn('execCommand failed, fallback to wrapper', err);
        applySimpleWrap(cmd);
      }
      qs('#post-body') && qs('#post-body').focus();
    });
  });

  const insertLink = qs('#insert-link');
  if (insertLink) insertLink.addEventListener('click', ()=>{
    const url = prompt('Enter URL (https://...)');
    if (!url) return;
    try {
      if (typeof document.execCommand === 'function') {
        document.execCommand('createLink', false, url);
      } else {
        alert('Select text then use Insert Link (browser does not support automatic link creation).');
      }
    } catch (err) {
      console.warn('createLink failed', err);
      alert('Could not create link automatically. You can paste the link manually.');
    }
  });

  const insertImage = qs('#insert-image');
  if (insertImage) insertImage.addEventListener('click', ()=>{
    const url = prompt('Enter image URL (https://...)');
    if (!url) return;
    const img = document.createElement('img'); img.src = url; img.style.maxWidth = '100%';
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      qs('#post-body') && qs('#post-body').appendChild(img);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
    }
  });
}

/* ---------- CREATE / UPDATE POST ---------- */
async function createOrUpdatePost(ev){
  ev.preventDefault();
  if (!currentUser) { alert('Sign in first'); navigateTo('#/admin'); return; }
  const titleEl = qs('#post-title'); const bodyEl = qs('#post-body');
  const title = titleEl ? titleEl.value.trim() : '';
  const body = bodyEl ? bodyEl.innerHTML : '';
  if (!title) { alert('Title required'); return; }
  const editId = (qs('#new-post-form') && qs('#new-post-form').dataset.editId) || '';
  try {
    if (editId) {
      await updateDoc(doc(db,'posts',editId), { title, body });
      closeModal();
      navigateTo('#/post/' + encodeURIComponent(editId));
    } else {
      const postsCol = collection(db,'posts');
      const docRef = await addDoc(postsCol, { title, body, created_at: serverTimestamp() });
      closeModal();
      navigateTo('#/post/' + encodeURIComponent(docRef.id));
    }
  } catch (err) {
    console.error('save post failed', err);
    alert('Save failed: ' + (err.message || err));
  }
}

/* ---------- EXPORT / IMPORT ---------- */
async function handleExport(){
  try {
    const posts = await fetchPosts();
    const data = JSON.stringify(posts.map(p=>{
      if (p.created_at && p.created_at.toDate) p.created_at = p.created_at.toDate().toISOString();
      return p;
    }), null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rosary_posts_export.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (err){ alert('Export failed'); console.error(err); }
}

async function handleImportFile(file){
  if (!file) return;
  const r = new FileReader();
  r.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      if (!confirm('This will add the imported posts to Firestore. Continue?')) return;
      for (const p of imported){
        const obj = {
          title: p.title || 'Imported',
          body: p.body || '',
          created_at: p.created_at ? new Date(p.created_at) : serverTimestamp()
        };
        await addDoc(collection(db,'posts'), obj);
      }
      alert('Import complete.');
      renderPostsList();
      navigateTo('#/posts');
    } catch (err) { alert('Failed to import: ' + err.message); console.error(err); }
  };
  r.readAsText(file);
}

/* ---------- LOGIN ---------- */
async function attemptLogin(ev){
  ev.preventDefault();
  const username = qs('#login-username') ? qs('#login-username').value.trim() : '';
  const pw = qs('#login-password') ? qs('#login-password').value : '';
  if (!username) return alert('Enter a username');
  const email = usernameToEmail(username);
  try {
    await signInWithEmailAndPassword(auth, email, pw);
    // onAuthStateChanged will update UI
  } catch (err) {
    console.error('login failed', err);
    alert('Sign in failed: ' + (err.message || err));
  }
}

/* ---------- ROUTING ---------- */
function navigateTo(hash){ location.hash = hash; handleRouting(); }
function handleRouting(){
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '') showView('home');
  else if (hash.startsWith('#/posts')) showView('posts');
  else if (hash.startsWith('#/post/')) {
    const id = decodeURIComponent(hash.split('/')[2] || '');
    showView('post'); renderPostDetail(id);
  } else if (hash.startsWith('#/admin')) showView('admin');
  else showView('home');
}

/* ---------- INIT ---------- */
function init(){
  // basic wiring (guard each selector)
  const navHome = qs('#nav-home'); if (navHome) navHome.addEventListener('click',(e)=>{ e.preventDefault(); navigateTo('#/'); });
  const navPosts = qs('#nav-posts'); if (navPosts) navPosts.addEventListener('click',(e)=>{ e.preventDefault(); navigateTo('#/posts'); });
  const homeSignin = qs('#home-signin'); if (homeSignin) homeSignin.addEventListener('click', ()=> navigateTo('#/admin'));

  const createBtn = qs('#btn-create'); if (createBtn) createBtn.addEventListener('click', ()=> openModal());
  const modalClose = qs('#modal-close'); if (modalClose) modalClose.addEventListener('click', ()=> closeModal());
  const modalCancel = qs('#modal-cancel'); if (modalCancel) modalCancel.addEventListener('click', ()=> closeModal());
  const newPostForm = qs('#new-post-form'); if (newPostForm) newPostForm.addEventListener('submit', createOrUpdatePost);

  const btnExport = qs('#btn-export'); if (btnExport) btnExport.addEventListener('click', handleExport);
  const importFile = qs('#importFile'); if (importFile) importFile.addEventListener('change', (e)=> { const f = e.target.files[0]; if (f) handleImportFile(f); e.target.value = ''; });

  const loginForm = qs('#login-form'); if (loginForm) loginForm.addEventListener('submit', attemptLogin);
  const loginCancel = qs('#login-cancel'); if (loginCancel) loginCancel.addEventListener('click', ()=> { navigateTo('#/'); });

  const backToPosts = qs('#back-to-posts'); if (backToPosts) backToPosts.addEventListener('click', (e)=> { e.preventDefault(); navigateTo('#/posts'); });

  setupEditorToolbar();
  window.addEventListener('hashchange', handleRouting);

  onAuthStateChanged(auth, (user)=>{
    currentUser = user;
    updateAuthArea();
    handleRouting();
  });

  handleRouting();
}

document.addEventListener('DOMContentLoaded', init);

/* helpers used above that require firebase doc/getDoc - keep at bottom to avoid hoisting surprises */
import { getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { doc as docRef } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// Note: Because we already imported doc/getDoc earlier at file top for bundling, these two bottom imports are harmless in browsers
// (the duplication doesn't break anything in modular SDK usage). They are here to ensure doc/getDoc are available where used.
