// Firebase v9+ modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAm7BymAwSe3IxpI-AQ95g6a1JIo8TcBK8",
  authDomain: "rosarys-rose-garden.firebaseapp.com",
  projectId: "rosarys-rose-garden",
  storageBucket: "rosarys-rose-garden.firebasestorage.app",
  messagingSenderId: "180889677592",
  appId: "1:180889677592:web:4039a51e092d706196b86d",
  measurementId: "G-J26L15CMPT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const views = {
  home: document.getElementById('view-home'),
  admin: document.getElementById('view-admin')
};
const authArea = document.getElementById('auth-area');

let currentUser = null;

function showView(name){
  for(const v in views){
    views[v].style.display = v === name ? 'block' : 'none';
  }
}

// --- Buttons ---
document.getElementById('home-signin').addEventListener('click', ()=> showView('admin'));
document.getElementById('login-cancel').addEventListener('click', ()=> showView('home'));

// --- Login ---
document.getElementById('login-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const email = `${username}@rosary.local`; // fake internal email
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch(err){
    alert('Sign in failed: ' + err.message);
  }
});

// --- Auth state ---
onAuthStateChanged(auth, user=>{
  currentUser = user;
  authArea.innerHTML = '';
  if(user){
    authArea.textContent = `Signed in as ${user.email} `;
    const outBtn = document.createElement('button');
    outBtn.textContent = 'Sign Out';
    outBtn.onclick = async ()=> await signOut(auth);
    authArea.appendChild(outBtn);
    showView('home');
  }
});
