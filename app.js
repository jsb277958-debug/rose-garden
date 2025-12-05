// app.js - Firebase Modular SDK (v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ====== FIREBASE CONFIG - replace with your own ====== */
const firebaseConfig = {
  apiKey: "AIzaSyAm7BymAwSe3IxpI-AQ95g6a1JIo8TcBK8",
  authDomain: "rosarys-rose-garden.firebaseapp.com",
  projectId: "rosarys-rose-garden",
  storageBucket: "rosarys-rose-garden.firebasestorage.app",
  messagingSenderId: "180889677592",
  appId: "1:180889677592:web:4039a51e092d706196b86d",
  measurementId: "G-J26L15CMPT"
};
/* ==================================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

/* --------- Helpers --------- */
function qs(sel, el=document){ return el.querySelector(sel) }
function qsa(sel, el=document){ return Array.from(el.querySelectorAll(sel)) }

function usernameToEmail(username){
  return `${username}@rosary.local`;
}

/* --------- Views --------- */
function showView(name){
  ['home','posts','post','admin'].forEach(n=>{
    const el = qs('#view-' + n);
    if(!el) return;
    const show = n === name;
    el.style.display = show ? 'block' : 'none';
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  });
  updateCreateButton();
  closeModal();
}

function updateCreateButton(){
  const btn = qs('#btn-create');
  btn.style.display = (currentUser && location.hash.startsWith('#/posts')) ? 'inline-block' : 'none';
}

/* --------- Auth UI --------- */
function updateAuthArea(){
  const area = qs('#auth-area');
  area.innerHTML = '';
  if(currentUser){
    const span = document.createElement('span');
    span.textContent = `Signed in as ${currentUser.email}`;
    span.className = 'muted';
    area.appendChild(span);

    const out = document.createElement('button');
    out.textContent = 'Sign out';
    out.className = 'btn small';
    out.style.marginLeft = '8px';
    out.onclick = async ()=> {
      await signOut(auth);
      navigateTo('#/');
    };
    area.appendChild(out);
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Sign in';
    loginBtn.className = 'btn small';
    loginBtn.onclick = ()=> navigateTo('#/admin');
    area.appendChild(loginBtn);
  }
  updateCreateButton();
}

/* --------- Posts --------- */
async function fetchPosts(){
  const q = query(collection(db,'posts'), orderBy('created_at','desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id: d.id, ...d.data() }));
}

async function renderPostsList(){
  const list = qs('#post-list');
  const noPosts = qs('#no-posts');
  list.innerHTML = '';
  let posts = [];
  try { posts = await fetchPosts(); } catch(e){ console.error(e); alert('Failed to load posts'); return; }
  if(posts.length === 0){ noPosts.style.display='block'; return; } 
  else noPosts.style.display='none';
  
  posts.forEach(p=>{
    const li = document.createElement('li'); li.className='post-item';
    const a = document.createElement('a'); a.href='#/post/'+encodeURIComponent(p.id);
    a.className='post-link';
    a.onclick = e=>{ e.preventDefault(); navigateTo('#/post/'+encodeURIComponent(p.id)); };
    
    const title = document.createElement('div'); title.className='post-title'; title.textContent=p.title;
    const meta = document.createElement('div'); meta.className='post-meta';
    const createdAt = p.created_at && p.created_at.toDate ? p.created_at.toDate() : new Date(p.created_at || Date.now());
    meta.textContent = createdAt.toLocaleString();
    
    const excerpt = document.createElement('div'); excerpt.className='post-excerpt';
    const tmp = document.createElement('div'); tmp.innerHTML=p.body||''; excerpt.textContent = (tmp.textContent||'').slice(0,160)+'…';
    
    a.append(title,meta,excerpt);
    li.appendChild(a);
    list.appendChild(li);
  });
}

async function renderPostDetail(postId){
  const container = qs('#post-detail');
  container.innerHTML = '';
  try{
    const d = await getDoc(doc(db,'posts',postId));
    if(!d.exists()){ container.innerHTML='<p>Post not found.</p>'; return; }
    const p = { id:d.id, ...d.data() };
    const h = document.createElement('h1'); h.textContent=p.title;
    const meta = document.createElement('div'); meta.className='post-meta';
    const createdAt = p.created_at && p.created_at.toDate ? p.created_at.toDate() : new Date(p.created_at||Date.now());
    meta.textContent=createdAt.toLocaleString();
    const body = document.createElement('div'); body.className='post-body'; body.innerHTML=p.body||'';
    container.append(h,meta,body);

    if(currentUser){
      const controls = document.createElement('div'); controls.style.marginTop='1rem';
      const editBtn = document.createElement('button'); editBtn.className='btn small'; editBtn.textContent='Edit';
      editBtn.onclick = ()=> openModalForEdit(p.id,p);
      const delBtn = document.createElement('button'); delBtn.className='btn small'; delBtn.style.marginLeft='8px'; delBtn.textContent='Delete';
      delBtn.onclick = async ()=>{
        if(!confirm('Delete this post?')) return;
        try { await deleteDoc(doc(db,'posts',p.id)); alert('Deleted'); navigateTo('#/posts'); }
        catch(err){ console.error(err); alert('Delete failed'); }
      };
      controls.append(editBtn,delBtn);
      container.appendChild(controls);
    }
  }catch(err){ console.error(err); container.innerHTML='<p>Failed to load post.</p>'; }
}

/* --------- Modal --------- */
function openModal(){
  if(!currentUser){ alert('Sign in first'); navigateTo('#/admin'); return; }
  qs('#modal-title').textContent='New Post';
  qs('#modal-save').textContent='Publish';
  qs('#new-post-form').dataset.editId='';
  qs('#post-title').value='';
  qs('#post-body').innerHTML='';
  qs('#modal').setAttribute('aria-hidden','false');
}

function openModalForEdit(postId, post){
  qs('#modal-title').textContent='Edit Post';
  qs('#modal-save').textContent='Save Changes';
  qs('#new-post-form').dataset.editId=postId;
  qs('#post-title').value=post.title||'';
  qs('#post-body').innerHTML=post.body||'';
  qs('#modal').setAttribute('aria-hidden','false');
}

function closeModal(){
  qs('#modal').setAttribute('aria-hidden','true');
  qs('#post-body').innerHTML='';
  qs('#new-post-form').reset();
}

/* --------- Editor toolbar --------- */
function setupEditorToolbar(){
  qsa('#editor-toolbar [data-cmd]').forEach(btn=>{
    btn.addEventListener('click',()=> {
      document.execCommand(btn.dataset.cmd,false,null);
      qs('#post-body').focus();
    });
  });

  qs('#insert-link').addEventListener('click',()=>{
    const url = prompt('Enter URL (https://...)'); if(!url) return;
    document.execCommand('createLink',false,url);
  });

  qs('#insert-image').addEventListener('click',()=>{
    const url = prompt('Enter image URL (https://...)'); if(!url) return;
    const img = document.createElement('img'); img.src=url; img.style.maxWidth='100%';
    const sel = window.getSelection();
    if(!sel || sel.rangeCount===0) qs('#post-body').appendChild(img);
    else sel.getRangeAt(0).insertNode(img);
  });
}

/* --------- Create / Update Post --------- */
async function createOrUpdatePost(ev){
  ev.preventDefault();
  if(!currentUser){ alert('Sign in first'); navigateTo('#/admin'); return; }
  const title = qs('#post-title').value.trim();
  const body = qs('#post-body').innerHTML || '';
  if(!title){ alert('Title required'); return; }

  const editId = qs('#new-post-form').dataset.editId || '';
  try{
    if(editId){
      await updateDoc(doc(db,'posts',editId),{title,body});
      closeModal();
      navigateTo('#/post/'+encodeURIComponent(editId));
    } else{
      const docRef = await addDoc(collection(db,'posts'),{title,body,created_at:serverTimestamp()});
      closeModal();
      navigateTo('#/post/'+encodeURIComponent(docRef.id));
    }
  }catch(err){ console.error(err); alert('Save failed: '+err.message); }
}

/* --------- Login --------- */
async function attemptLogin(ev){
  ev.preventDefault();
  const username = qs('#login-username').value.trim();
  const password = qs('#login-password').value;
  if(!username || !password) return alert('Enter username and password');
  const email = usernameToEmail(username);

  try { await signInWithEmailAndPassword(auth,email,password); }
  catch(err){ console.error(err); alert('Sign in failed: '+err.message); }
}

/* --------- Routing --------- */
function navigateTo(hash){ location.hash = hash; handleRouting(); }
function handleRouting(){
  const hash = location.hash||'#/';
  if(hash==='#/'||hash==='') showView('home');
  else if(hash.startsWith('#/posts')) { showView('posts'); renderPostsList(); }
  else if(hash.startsWith('#/post/')) { showView('post'); renderPostDetail(decodeURIComponent(hash.split('/')[2]||'')); }
  else if(hash.startsWith('#/admin')) showView('admin');
  else showView('home');
}

/* --------- Init --------- */
function init(){
  qs('#nav-home').addEventListener('click',e=>{ e.preventDefault(); navigateTo('#/'); });
  qs('#nav-posts').addEventListener('click',e=>{ e.preventDefault(); navigateTo('#/posts'); });
  qs('#home-signin').addEventListener('click',()=>navigateTo('#/admin'));

  qs('#btn-create').addEventListener('click',openModal);
  qs('#modal-close').addEventListener('click',closeModal);
  qs('#modal-cancel').addEventListener('click',closeModal);
  qs('#new-post-form').addEventListener('submit',createOrUpdatePost);

  qs('#login-form').addEventListener('submit',attemptLogin);
  qs('#login-cancel').addEventListener('click',()=>navigateTo('#/'));

  qs('#back-to-posts').addEventListener('click',e=>{ e.preventDefault(); navigateTo('#/posts'); });

  setupEditorToolbar();

  onAuthStateChanged(auth,(user)=>{
    currentUser = user;
    updateAuthArea();
    handleRouting();
  });

  handleRouting();
}

document.addEventListener('DOMContentLoaded', init);
