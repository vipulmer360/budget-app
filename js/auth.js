/* ==========================================
   BUDGET APP — AUTHENTICATION MODULE
   ========================================== */

const Auth = {
  currentUser: null,

  // Google Sign-In
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebaseAuth.signInWithPopup(provider);
      this.currentUser = result.user;
      App.toast(`Welcome, ${result.user.displayName}! 🎉`, 'success');
      return result.user;
    } catch (err) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        App.toast('Login cancelled', 'warning');
      } else {
        App.toast('Login failed: ' + err.message, 'error');
      }
      return null;
    }
  },

  // Email & Password Sign-In
  async signInWithEmail(email, password) {
    try {
      const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
      this.currentUser = result.user;
      App.toast(`Welcome back, ${result.user.displayName || result.user.email}! 🎉`, 'success');
      return result.user;
    } catch (err) {
      console.error('Email sign-in error:', err);
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = '⚠️ Email/Password login is disabled in Firebase Console! Please enable Email/Password under Firebase Console -> Authentication -> Sign-in method.';
      } else if (err.code === 'auth/user-not-found') {
        msg = '❌ User not found. Please click "Register" tab to create your account first!';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = '❌ Incorrect Email or Password.';
      }
      App.toast(msg, 'error', 7000);
      return null;
    }
  },

  // Email & Password Sign-Up (New Account)
  async signUpWithEmail(email, password, displayName) {
    try {
      const result = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      if (displayName) {
        await result.user.updateProfile({ displayName: displayName });
      }
      this.currentUser = result.user;
      App.toast('Account created successfully! 🎉', 'success');
      return result.user;
    } catch (err) {
      console.error('Sign-up error:', err);
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = '⚠️ Email/Password provider is disabled in Firebase Console! Please enable Email/Password in Firebase Console -> Authentication -> Sign-in method.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = '⚠️ This Email is already registered! Please click "Login" tab to sign in.';
      }
      App.toast(msg, 'error', 7000);
      return null;
    }
  },

  // Password Reset Email
  async sendPasswordReset(email) {
    try {
      await firebaseAuth.sendPasswordResetEmail(email);
      App.toast('Password reset link sent to your email! 📧', 'success');
      return true;
    } catch (err) {
      console.error('Password reset error:', err);
      App.toast('Reset failed: ' + err.message, 'error');
      return false;
    }
  },

  // Sign Out
  async signOut() {
    try {
      await firebaseAuth.signOut();
      this.currentUser = null;
      App.toast('Logged out successfully', 'info');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  },

  // Listen for auth state changes
  onAuthStateChanged(callback) {
    firebaseAuth.onAuthStateChanged(user => {
      this.currentUser = user;
      callback(user);
    });
  },

  // Get current user
  getCurrentUser() {
    return this.currentUser || firebaseAuth.currentUser;
  },

  // Check if logged in
  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  // Get user display info
  getUserInfo() {
    const user = this.getCurrentUser();
    if (!user) return null;
    return {
      uid: user.uid,
      name: user.displayName || 'User',
      email: user.email || '',
      photo: user.photoURL || ''
    };
  }
};
