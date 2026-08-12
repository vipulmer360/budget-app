/* ==========================================
   BUDGET APP — FIREBASE CONFIGURATION
   ========================================== */

// ⚠️ IMPORTANT: Replace these values with YOUR Firebase project config!
// Go to https://console.firebase.google.com → Create Project → Web App → Copy Config
const firebaseConfig = {
  apiKey: "AIzaSyAQYTe_FtLw4h8LLiaNLtLTOR7zWjSc3XM",
  authDomain: "budget-app-fdbbe.firebaseapp.com",
  projectId: "budget-app-fdbbe",
  storageBucket: "budget-app-fdbbe.firebasestorage.app",
  messagingSenderId: "319248156979",
  appId: "1:319248156979:web:c1727983ff0edcd2635646",
  measurementId: "G-B690JS9C16"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const firebaseAuth = firebase.auth();
const firebaseDB = firebase.firestore();

// Enable offline persistence for Firestore
firebaseDB.enablePersistence({ synchronizeTabs: true }).catch(err => {
  console.log('Firestore persistence error:', err.code);
});

console.log('🔥 Firebase initialized');
