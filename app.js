// app.js - Firebase modular SDK (v9+). Uses Auth + Firestore (no Storage).
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ====== REPLACE THIS OBJECT with your firebaseConfig from the Firebase console ======
   Example:
   const FIREBASE_CONFIG = {
     apiKey: "xxx",
     authDomain: "yourproj.firebaseapp.com",
     projectId: "yourproj",
     storageBucket: "yourproj.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
*/
const firebaseConfig = {

  apiKey: "AIzaSyAm7BymAwSe3IxpI-AQ95g6a1JIo8TcBK8",

  authDomain: "rosarys-rose-garden.firebaseapp.com",

  projectId: "rosarys-rose-garden",

  storageBucket: "rosarys-rose-garden.firebasestorage.app",

  messagingSenderId: "180889677592",

  appId: "1:180889677592:web:4039a51e092d706196b86d",

  measurementId: "G-J26L15CMPT"

};

/* ================================================================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function qs(sel, el=document) { return el.querySelector(sel) }
function qsa(sel, el=document) { return Array.from(el.querySelectorAll(sel)) }

function usernameToEmail(username){
  return `${username}@rosary.local`;
}

let currentUser = null;

/* Views */
function showView(name){
  ['home','posts','post','admin'].forEach(n=>{
    const el = qs('#view-'+n);
    if(!el) return;
    const show = n===name;
    el.style.display = show ? 'block' : 'none';
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  });
  closeModal();
  const createBtn = qs('#btn-create');
  if (currentUser && location.hash.startsWith('#/posts')) createBtn.style.display = 'inline-block';
  else createBtn.style.display = 'none';
  if (name === 'posts') renderPostsList();
}

/* Auth UI area */
function updateAuthArea(){
  const area = qs('#auth-area');
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
    out.onclick = async () => { await signOut(auth); navigateTo('#/'); };
    area.appendChild(out);
    if (location.hash.startsWith('#/posts')) qs('#btn-create').style.display = 'inline-block';
  } else {
    const login = document.createElement('button');
    login.className = 'btn small';
    login.textContent = 'Sign in';
    login.onclick = () => { navigateTo('#/admin'); };
    area.appendChild(login);
    qs('#btn-create').style.display = 'none';
  }
}

/* Fetch posts from Firestore */
async function fetchPosts(){
  const col = collection(db, 'posts');
  const q = query(col, orderBy('created_at','desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function renderPostsList(){
  const list = qs('#post-list');
  list.innerHTML = '';
  let posts = [];
  try { posts = await fetchPosts(); } catch (e){ console.error(e); alert('Failed to load posts'); return; }
  if (!posts || posts.length === 0) {
    qs('#no-posts').style.display = 'block';
    return;
  } else qs('#no-posts').style.display = 'none';
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
    li.appendChild(a); list.appendChild(li);
  });
}

/* Show a single post */
async function renderPostDetail(postId){
  const container = qs('#post-detail'); container.innerHTML = '';
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

    if (currentUser) {
      // edit/delete buttons for admin
      const controls = document.createElement('div'); controls.style.marginTop = '1rem';
      const editBtn = document.createElement('button'); editBtn.className = 'btn small'; editBtn.textContent = 'Edit';
      editBtn.onclick = ()=> openModalForEdit(p.id, p);
      const delBtn = document.createElement('button'); delBtn.className = 'btn small'; delBtn.style.marginLeft='8px'; delBtn.textContent='Delete';
      delBtn.onclick = async ()=> {
        if (!confirm('Delete this post?')) return;
        try { await deleteDoc(doc(db,'posts',p.id)); alert('Deleted'); navigateTo('#/posts'); }
        catch(err){ console.error(err); alert('Delete failed'); }
      };
      controls.appendChild(editBtn); controls.appendChild(delBtn);
      container.appendChild(controls);
    }
  } catch (err) {
    console.error(err); container.innerHTML = '<p>Failed to load post.</p>';
  }
}

/* Modal controls (create/edit) */
function openModal(){
  if (!currentUser) { alert('You must sign in to create a post.'); navigateTo('#/admin'); return; }
  qs('#modal-title').textContent = 'New Post';
  qs('#modal-save').textContent = 'Create Post';
  qs('#new-post-form').dataset.editId = '';
  qs('#post-title').value = '';
  qs('#post-body').innerHTML = '';
  qs('#modal').setAttribute('aria-hidden','false');
}
function openModalForEdit(postId, postObj){
  qs('#modal-title').textContent = 'Edit Post';
  qs('#modal-save').textContent = 'Save Changes';
  qs('#new-post-form').dataset.editId = postId;
  qs('#post-title').value = postObj.title || '';
  qs('#post-body').innerHTML = postObj.body || '';
  qs('#modal').setAttribute('aria-hidden','false');
}
function closeModal(){
  qs('#modal').setAttribute('aria-hidden','true');
  const form = qs('#new-post-form'); if (form) form.reset();
  qs('#post-body').innerHTML = '';
}

/* Editor toolbar (execCommand used for simple rich text) */
function setupEditorToolbar(){
  qsa('#editor-toolbar [data-cmd]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const cmd = btn.getAttribute('data-cmd');
      document.execCommand(cmd, false, null);
      qs('#post-body').focus();
    });
  });
  qs('#insert-link').addEventListener('click', ()=>{
    const url = prompt('Enter URL (https://...)');
    if (!url) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      alert('Select text to turn into a link.');
      return;
    }
    const range = sel.getRangeAt(0);
    document.execCommand('createLink', false, url);
  });
  qs('#insert-image').addEventListener('click', ()=>{
    const url = prompt('Enter image URL (https://...)');
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      qs('#post-body').appendChild(img);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
    }
  });
}

/* Create or update post */
async function createOrUpdatePost(ev){
  ev.preventDefault();
  if (!currentUser) { alert('Sign in first'); navigateTo('#/admin'); return; }
  const title = qs('#post-title').value.trim();
  const body = qs('#post-body').innerHTML || '';
  if (!title) { alert('Title required'); return; }
  const editId = qs('#new-post-form').dataset.editId || '';
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
  } catch (err) { console.error(err); alert('Save failed: ' + err.message); }
}

/* Export / Import (JSON). Import writes each item as a new document. */
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

/* Login */
async function attemptLogin(ev){
  ev.preventDefault();
  const username = qs('#login-username').value.trim();
  const pw = qs('#login-password').value || '';
  if (!username) return alert('Enter a username');
  const email = usernameToEmail(username);
  try {
    await signInWithEmailAndPassword(auth, email, pw);
    // onAuthStateChanged will handle UI
  } catch (err) {
    console.error(err);
    alert('Sign in failed: ' + (err.message || err));
  }
}

/* Routing */
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

/* init wiring */
function init(){
  qs('#nav-home').addEventListener('click',(e)=>{ e.preventDefault(); navigateTo('#/'); });
  qs('#nav-posts').addEventListener('click',(e)=>{ e.preventDefault(); navigateTo('#/posts'); });
  qs('#home-signin').addEventListener('click', ()=> navigateTo('#/admin'));

  qs('#btn-create').addEventListener('click', ()=> openModal());
  qs('#modal-close').addEventListener('click', ()=> closeModal());
  qs('#modal-cancel').addEventListener('click', ()=> closeModal());
  qs('#new-post-form').addEventListener('submit', createOrUpdatePost);

  qs('#btn-export').addEventListener('click', handleExport);
  qs('#importFile').addEventListener('change', (e)=> { const f = e.target.files[0]; if (f) handleImportFile(f); e.target.value = ''; });

  qs('#login-form').addEventListener('submit', attemptLogin);
  qs('#login-cancel').addEventListener('click', ()=> { navigateTo('#/'); });

  qs('#back-to-posts').addEventListener('click', (e)=> { e.preventDefault(); navigateTo('#/posts'); });

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
