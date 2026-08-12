/* ==========================================
   BUDGET APP — MAIN APP CONTROLLER
   ========================================== */

const App = {
  currentPage: 'dashboard',
  deferredPrompt: null,

  // Page config
  pages: {
    dashboard: { title: '📊 Dashboard', icon: 'dashboard', module: Dashboard },
    transactions: { title: '🧾 Transactions', icon: 'reports', render: () => Transactions.renderAll() },
    // parties page removed
    income: { title: '💵 Income', icon: 'sales', render: () => Transactions.render('income') },
    expense: { title: '💸 Expense', icon: 'purchase', render: () => Transactions.render('expense') },
    accounts: { title: '🏦 Accounts', icon: 'payments', module: Accounts },
    persons: { title: '👥 Persons', icon: 'parties', module: Persons },
    reports: { title: '📈 Reports', icon: 'reports', module: Reports },
    settings: { title: '⚙️ Settings', icon: 'settings', module: Settings }
  },

  // Apply saved UI scale / density ratio
  applyUIScale() {
    try {
      const settings = DB.getSettings();
      const savedPrefs = settings.dashboardPreferences || {};
      const scale = parseInt(savedPrefs.uiScale, 10) || 88;
      const ratio = (scale / 100).toString();
      document.documentElement.style.setProperty('--ui-scale-ratio', ratio);
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.style.zoom = ratio;
    } catch (e) {
      document.documentElement.style.setProperty('--ui-scale-ratio', '0.88');
    }
  },

  // Initialize app
  init() {
    this.registerServiceWorker();
    this.handleInstallPrompt();

    // Initialize theme
    const savedTheme = localStorage.getItem('budget_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.applyUIScale();

    // Initialize sync module
    if (typeof Sync !== 'undefined') Sync.init();

    // Listen for auth state changes
    Auth.onAuthStateChanged(user => {
      if (user) {
        // Detect user switch: if different user logged in, clear local data first
        const lastUid = localStorage.getItem('budget_lastUid');
        if (lastUid && lastUid !== user.uid) {
          console.log('🔄 Different user detected — clearing old local data...');
          // Clear all collection data (not settings needed for app shell)
          Object.values(DB.COLLECTIONS).forEach(col => {
            localStorage.removeItem(col);
          });
        }
        localStorage.setItem('budget_lastUid', user.uid);

        // User is logged in — show main app
        this.renderShell();
        this.handleRouting();

        // Always default to dashboard on launch
        this.currentPage = 'dashboard';
        window.location.hash = 'dashboard';
        this.renderPage();

        // Handle back/forward
        window.addEventListener('hashchange', () => {
          const hash = window.location.hash.replace('#', '');
          if (hash && this.pages[hash]) {
            this.currentPage = hash;
            this.renderPage();
          }
        });

        // Start smart sync (pulls cloud data for this user)
        if (typeof Sync !== 'undefined') {
          Sync.smartSync();
        }
      } else {
        // Reset body zoom if any was stray
        document.body.style.zoom = '1';
        // Not logged in — show login screen
        this.renderLoginScreen();
      }
    });
  },

  // Register service worker
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('SW registered:', reg.scope);
          reg.update(); // Force check for new SW

          // Reload page if a new SW takes control
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });
        })
        .catch(err => console.log('SW failed:', err));
    }
  },

  // Handle PWA install prompt
  handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const banner = document.getElementById('installBanner');
      if (banner) banner.classList.add('show');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      const banner = document.getElementById('installBanner');
      if (banner) banner.classList.remove('show');
      this.toast('App installed! 🎉', 'success');
    });
  },

  forceUpdateApp() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
        if ('caches' in window) {
           caches.keys().then(keys => {
             Promise.all(keys.map(key => caches.delete(key))).then(() => {
               window.location.reload(true);
             });
           });
        } else {
           window.location.reload(true);
        }
      });
    } else {
      window.location.reload(true);
    }
  },

  installApp() {
    if (!this.deferredPrompt) {
      this.toast('Open in Chrome & use "Add to Home Screen"', 'info');
      return;
    }
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        this.toast('Installing... 📱', 'success');
      }
      this.deferredPrompt = null;
    });
  },

  // Auth state
  authMode: 'login', // 'login' or 'signup'

  switchAuthMode(mode) {
    this.authMode = mode;
    this.renderLoginScreen();
  },

  showLoginAlert(msg, isSuccess = false) {
    const box = document.getElementById('loginAlertBox');
    if (box) {
      box.style.display = 'block';
      box.style.background = isSuccess ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)';
      box.style.color = isSuccess ? '#4ade80' : '#f87171';
      box.style.border = `1px solid ${isSuccess ? '#4ade8055' : '#f8717155'}`;
      box.innerHTML = msg;
    }
  },

  async handleEmailAuth(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email || !password) {
      const msg = '⚠️ Please enter both Email and Password';
      this.toast(msg, 'warning');
      this.showLoginAlert(msg, false);
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Processing...';
    }

    try {
      if (this.authMode === 'login') {
        const user = await Auth.signInWithEmail(email, password);
        if (!user) {
          this.showLoginAlert('❌ Login failed. Verify Email & Password or Register a new account.', false);
        }
      } else {
        const name = form.displayName ? form.displayName.value.trim() : '';
        if (password.length < 6) {
          const msg = '⚠️ Password must be at least 6 characters long';
          this.toast(msg, 'warning');
          this.showLoginAlert(msg, false);
          return;
        }
        const user = await Auth.signUpWithEmail(email, password, name);
        if (user) {
          this.showLoginAlert('✅ Account created successfully! Logging you in...', true);
        } else {
          this.showLoginAlert('⚠️ Registration failed. Make sure Email/Password is enabled in Firebase Console.', false);
        }
      }
    } catch (err) {
      console.error('EmailAuth error:', err);
      this.showLoginAlert('❌ Error: ' + (err.message || err), false);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = this.authMode === 'login' ? '📧 Sign In with Email' : '✨ Create New Account';
      }
    }
  },

  async handleForgotPassword() {
    const email = prompt('Enter your registered Email address to receive a Password Reset link:');
    if (email && email.trim()) {
      await Auth.sendPasswordReset(email.trim());
    }
  },

  // ========== LOGIN SCREEN ==========
  renderLoginScreen() {
    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="login-screen" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:16px; background:var(--bg-primary)">
        <div class="login-card" style="max-width:400px; width:100%; border-radius:16px; border:1px solid var(--border); background:var(--bg-card); box-shadow:0 8px 30px rgba(0,0,0,0.3)">
          <div class="login-header text-center p-3 pb-0">
            <img src="assets/icons/icon-192.png" alt="Budget" class="login-logo" style="width:48px; height:48px; margin-bottom:8px">
            <h1 class="login-title" style="font-size:1.4rem; font-weight:800; margin:0">Budget</h1>
            <p class="login-subtitle text-muted" style="font-size:0.85rem; margin-top:2px">Business Accounting App</p>
          </div>

          <!-- Auth Mode Switcher Tabs -->
          <div style="display:flex; border-bottom:1px solid var(--border); margin-top:16px">
            <button type="button" style="flex:1; padding:10px; font-weight:700; font-size:0.9rem; background:transparent; border:none; border-bottom:${this.authMode === 'login' ? '2px solid var(--accent)' : 'none'}; color:${this.authMode === 'login' ? 'var(--accent)' : 'var(--text-muted)'}; cursor:pointer" onclick="App.switchAuthMode('login')">
              🔑 Login
            </button>
            <button type="button" style="flex:1; padding:10px; font-weight:700; font-size:0.9rem; background:transparent; border:none; border-bottom:${this.authMode === 'signup' ? '2px solid var(--accent)' : 'none'}; color:${this.authMode === 'signup' ? 'var(--accent)' : 'var(--text-muted)'}; cursor:pointer" onclick="App.switchAuthMode('signup')">
              📝 Register
            </button>
          </div>

          <div class="login-body p-3" style="padding:20px">
            <!-- Inline Alert Box for instant user feedback -->
            <div id="loginAlertBox" style="display:none; padding:10px 12px; border-radius:8px; font-size:0.8rem; font-weight:600; margin-bottom:12px; text-align:center"></div>

            <!-- Email / Password Form -->
            <form autocomplete="off" onsubmit="App.handleEmailAuth(event)" style="display:flex; flex-direction:column; gap:12px">
              ${this.authMode === 'signup' ? `
                <div class="form-group" style="margin:0">
                  <label class="form-label" style="font-size:0.8rem; font-weight:600">Full Name</label>
                  <input type="text" name="displayName" class="form-input" placeholder="Your Name" style="padding:10px 12px; font-size:0.9rem" required>
                </div>
              ` : ''}

              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:0.8rem; font-weight:600">Email Address</label>
                <input type="email" name="email" class="form-input" placeholder="name@gmail.com" style="padding:10px 12px; font-size:0.9rem" required>
              </div>

              <div class="form-group" style="margin:0">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                  <label class="form-label" style="font-size:0.8rem; font-weight:600; margin:0">Password</label>
                  ${this.authMode === 'login' ? `<a href="javascript:void(0)" onclick="App.handleForgotPassword()" style="font-size:0.75rem; color:var(--accent); font-weight:600">Forgot?</a>` : ''}
                </div>
                <input type="password" name="password" class="form-input" placeholder="••••••••" style="padding:10px 12px; font-size:0.9rem" required minlength="6">
              </div>

              <button type="submit" class="btn btn-primary btn-block" style="padding:12px; font-weight:700; font-size:0.95rem; margin-top:4px">
                ${this.authMode === 'login' ? '📧 Sign In with Email' : '✨ Create New Account'}
              </button>
            </form>

            <!-- Divider -->
            <div style="display:flex; align-items:center; gap:10px; margin:16px 0; color:var(--text-muted); font-size:0.75rem">
              <div style="flex:1; height:1px; background:var(--border)"></div>
              <span>OR</span>
              <div style="flex:1; height:1px; background:var(--border)"></div>
            </div>

            <!-- Google Sign-In Button -->
            <button class="google-login-btn" onclick="Auth.signInWithGoogle()" id="googleLoginBtn" style="width:100%; justify-content:center; padding:10px; border-radius:8px">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span style="margin-left:8px; font-weight:600">Continue with Google</span>
            </button>
          </div>

          <div class="login-footer text-center p-2" style="border-top:1px solid var(--border); font-size:0.75rem; color:var(--text-muted)">
            🔒 Encrypted • ☁️ Firebase Auth & Sync
          </div>
        </div>
      </div>
    `;
  },

  // Handle routing
  handleRouting() {
    // Close sidebar & FAB when clicking outside
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('.hamburger') && !e.target.closest('.bottom-nav-item')) {
        sidebar.classList.remove('open');
      }
      
      const fab = document.getElementById('fabContainer');
      if (fab && fab.classList.contains('open') && !fab.contains(e.target)) {
        fab.classList.remove('open');
      }
    });
  },

  // Render app shell
  renderShell() {
    const settings = DB.getSettings();
    const userInfo = Auth.getUserInfo();
    const container = document.getElementById('app');
    
    container.innerHTML = `
      <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <img src="assets/icons/icon-192.png" alt="Logo" class="sidebar-logo">
            <div class="sidebar-brand">
              <h1>${Utils.escapeHtml(settings.businessName)}</h1>
              <p>Business App</p>
            </div>
          </div>
          <nav class="sidebar-nav" id="sidebarNav">
            ${Object.entries(this.pages).map(([key, page]) => `
              <div class="nav-item ${key === this.currentPage ? 'active' : ''}" 
                   onclick="App.navigate('${key}')" data-page="${key}">
                ${Utils.icon(page.icon)}
                <span>${page.title}</span>
              </div>
            `).join('')}
          </nav>
          <div class="sidebar-footer">
            <!-- User Profile in Sidebar -->
            <div class="sidebar-user">
              ${userInfo && userInfo.photo ? `<img src="${userInfo.photo}" alt="avatar" class="sidebar-user-avatar">` : '<span class="sidebar-user-avatar-placeholder">👤</span>'}
              <div class="sidebar-user-info">
                <span class="sidebar-user-name">${userInfo ? Utils.escapeHtml(userInfo.name) : 'Guest'}</span>
                <span class="sidebar-user-email">${userInfo ? Utils.escapeHtml(userInfo.email) : ''}</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm sidebar-logout-btn" onclick="App.forceUpdateApp()" style="margin-bottom:8px; border-color:var(--accent); color:var(--accent)">🔄 Update App</button>
            <button class="btn btn-outline btn-sm sidebar-logout-btn" onclick="App.handleLogout()">🚪 Logout</button>
            <div class="business-info">v1.0.0 • PWA • Cloud Sync</div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <header class="top-header">
            <div style="display:flex;align-items:center;gap:12px">
              <button class="hamburger" onclick="App.toggleSidebar()">
                ${Utils.icons.menu}
              </button>
              <h2 class="page-title" id="pageTitle">${this.pages[this.currentPage].title}</h2>
            </div>
            <div class="header-actions" style="display:flex;align-items:center;gap:8px">
              <div class="sync-indicator" id="syncIndicator">☁️ <span>Synced</span></div>
              <button class="btn btn-ghost btn-icon" onclick="App.toggleTheme()" title="Toggle Theme">
                <span id="themeIcon">${document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️'}</span>
              </button>
              <button class="btn btn-ghost btn-icon" onclick="Sync.syncNow()" title="Force Sync (Pull & Push)">🔄</button>
              ${userInfo && userInfo.photo ? `<img src="${userInfo.photo}" alt="user" class="header-user-avatar" onclick="App.handleLogout()" title="Logout">` : ''}
            </div>
          </header>
          <div class="page-content" id="pageContent">
            <!-- Dynamic content -->
          </div>
        </main>
      </div>

      <!-- Bottom Nav (Mobile) -->
      <nav class="bottom-nav" id="bottomNav">
        ${['dashboard', 'transactions', 'income', 'accounts', 'persons'].map(key => `
          <div class="bottom-nav-item ${key === this.currentPage ? 'active' : ''}" 
               onclick="App.navigate('${key}')" data-page="${key}">
            ${Utils.icons[this.pages[key].icon] || Utils.icons.list}
            <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
          </div>
        `).join('')}
        <div class="bottom-nav-item" onclick="App.toggleSidebar()">
          ${Utils.icons.menu}
          <span>Menu</span>
        </div>
      </nav>

      <!-- Floating Action Button (FAB) -->
      <div class="fab-container" id="fabContainer">
        <div class="fab-menu" id="fabMenu">
          <div class="fab-item" onclick="App.toggleFab(); Transactions.openAddModal('income')">
            <span class="fab-label">Add Income</span>
            <div class="fab-btn-small" style="background:var(--success)">💵</div>
          </div>
          <div class="fab-item" onclick="App.toggleFab(); Transactions.openAddModal('expense')">
            <span class="fab-label">Add Expense</span>
            <div class="fab-btn-small" style="background:var(--danger)">💸</div>
          </div>
        </div>
        <button class="fab-btn" id="fabBtnMain">
          ${Utils.icons.plus}
        </button>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)App.closeModal()">
        <div class="modal" id="modalContainer">
          <div class="modal-header">
            <h3 class="modal-title" id="modalTitle"></h3>
            <button class="modal-close" onclick="App.closeModal()">${Utils.icons.close}</button>
          </div>
          <div class="modal-body" id="modalBody"></div>
        </div>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toastContainer"></div>

      <!-- Print Invoice Area -->
      <div class="print-invoice" id="printInvoice"></div>
    `;
    
    // Initialize drag logic for the FAB after it's added to DOM
    setTimeout(() => this.initFabDrag(), 0);
  },

  // Initialize FAB Dragging logic
  initFabDrag() {
    const fab = document.getElementById('fabContainer');
    const fabBtn = document.getElementById('fabBtnMain');
    if (!fab || !fabBtn) return;

    let isDragging = false;
    let hasMoved = false;
    let startX, startY;
    let initialRight, initialBottom;

    const dragStart = (e) => {
      if (!e.target.closest('.fab-btn')) return;
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      
      isDragging = true;
      hasMoved = false;
      startX = clientX;
      startY = clientY;
      
      const rect = fab.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;

      fab.style.transition = 'none';
    };

    const dragMove = (e) => {
      if (!isDragging) return;
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      
      const deltaX = startX - clientX;
      const deltaY = startY - clientY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }
      
      if (hasMoved) {
        if (e.cancelable) e.preventDefault();
        
        let newRight = initialRight + deltaX;
        let newBottom = initialBottom + deltaY;

        newRight = Math.max(16, Math.min(newRight, window.innerWidth - fab.offsetWidth - 16));
        newBottom = Math.max(16, Math.min(newBottom, window.innerHeight - fab.offsetHeight - 80));

        fab.style.right = `${newRight}px`;
        fab.style.bottom = `${newBottom}px`;
      }
    };

    const dragEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;
      fab.style.transition = '';
    };

    fabBtn.addEventListener('click', (e) => {
      if (!hasMoved) {
        App.toggleFab();
      }
    });

    fab.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove, { passive: false });
    document.addEventListener('mouseup', dragEnd);

    fab.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
  },

  // Toggle Dark/Light Theme
  toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('budget_theme', newTheme);
    
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = newTheme === 'light' ? '🌙' : '☀️';
    }
  },

  // Handle Logout
  handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      if (typeof Sync !== 'undefined') {
        Sync._stopRealtimeListeners();
      }
      Auth.signOut();
    }
  },

  // Navigate to page
  navigate(page) {
    if (!this.pages[page]) return;
    this.currentPage = page;
    window.location.hash = page;
    this.renderPage();
    this.updateNav();
    // Close sidebar on mobile
    document.getElementById('sidebar')?.classList.remove('open');
  },

  // Render current page
  renderPage() {
    if (typeof Accounts !== 'undefined' && Accounts.syncAccountBalances) {
      Accounts.syncAccountBalances();
    }
    const page = this.pages[this.currentPage];
    const content = document.getElementById('pageContent');
    const title = document.getElementById('pageTitle');

    if (content) {
      if (page.render) {
        content.innerHTML = page.render();
      } else if (page.module && page.module.render) {
        content.innerHTML = page.module.render();
      }
      // Initialize drag & drop reorder on transaction rows
      if (typeof Transactions !== 'undefined' && Transactions.initDragReorder) {
        setTimeout(() => Transactions.initDragReorder(), 50);
      }
    }
    if (title) title.textContent = page.title;
  },

  // Refresh current page
  refreshPage() {
    this.renderPage();
    this.updateNav();
  },

  // Update navigation active states
  updateNav() {
    // Sidebar
    document.querySelectorAll('#sidebarNav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === this.currentPage);
    });
    // Bottom nav
    document.querySelectorAll('#bottomNav .bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === this.currentPage);
    });
  },

  // Toggle sidebar (mobile)
  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
  },

  // Toggle FAB Menu
  toggleFab() {
    const fabContainer = document.getElementById('fabContainer');
    if (fabContainer) {
      fabContainer.classList.toggle('open');
    }
  },

  // Show modal
  showModal(title, content, extraClass = '') {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const container = document.getElementById('modalContainer');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = content;
    if (container) container.className = 'modal ' + extraClass;
    if (overlay) overlay.classList.add('show');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },

  // Close modal
  closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  },

  // Toast notification
  toast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);

    // Auto remove after specified duration
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Global Undo System for actions (delete, revert, etc.)
  lastAction: null,

  undoLastAction() {
    if (!this.lastAction) {
      this.toast('Nothing to undo!', 'info');
      return;
    }
    const action = this.lastAction;
    this.lastAction = null;

    try {
      if (action.type === 'delete_transaction') {
        const { collection, record } = action.data;
        DB.add(collection, record);

        // Restore account balances (supports both multi-account and legacy)
        const isInc = collection === DB.COLLECTIONS.INCOMES;
        if (record.accounts && record.accounts.length > 0) {
          record.accounts.forEach(accEntry => {
            if (accEntry.accountId) {
              const account = DB.getById(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId);
              if (account) {
                const change = (accEntry.type || (isInc ? 'income' : 'expense')) === 'income' ? Utils.parseNum(accEntry.amount) : -Utils.parseNum(accEntry.amount);
                DB.update(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId, {
                  balance: Utils.parseNum(account.balance) + change
                });
              }
            }
          });
        } else if (record.accountId) {
          const account = DB.getById(DB.COLLECTIONS.ACCOUNTS, record.accountId);
          if (account) {
            const change = isInc ? Utils.parseNum(record.amount) : -Utils.parseNum(record.amount);
            DB.update(DB.COLLECTIONS.ACCOUNTS, record.accountId, {
              balance: Utils.parseNum(account.balance) + change
            });
          }
        }
        this.toast('Deleted entry restored successfully! ↩️', 'success');
      } else if (action.type === 'revert_clearance') {
        const { billCollection, billId, settlementCollection, settlementId, settlementRecord, paymentAccountId, itemAmount, isIncome } = action.data;
        
        if (settlementId) {
          const existingSet = DB.getById(settlementCollection, settlementId);
          if (existingSet) {
            const newAmount = Utils.parseNum(existingSet.amount) + itemAmount;
            DB.update(settlementCollection, settlementId, { amount: newAmount, price: 0 });
          } else if (settlementRecord) {
            DB.add(settlementCollection, settlementRecord);
          }
        }

        DB.update(billCollection, billId, { status: 'cleared', clearanceId: settlementId, clearedAt: new Date().toISOString() });

        if (paymentAccountId) {
          const account = DB.getById(DB.COLLECTIONS.ACCOUNTS, paymentAccountId);
          if (account) {
            const change = isIncome ? itemAmount : -itemAmount;
            DB.update(DB.COLLECTIONS.ACCOUNTS, paymentAccountId, {
              balance: Utils.parseNum(account.balance) + change
            });
          }
        }
        this.toast('Clearance action restored! ↩️', 'success');
      } else if (action.type === 'revert_account_clearance') {
        const { collection, originalId, newEntryId, destAccountId, pendingAccountId, amount, type } = action.data;

        // 1. Delete the newly created receipt entry
        DB.delete(collection, newEntryId);

        // 2. Revert the original entry's status
        const originalEntry = DB.getById(collection, originalId);
        if (originalEntry) {
          // Remove pendingStatus property entirely
          DB.update(collection, originalId, { pendingStatus: null });
        }

        // 3. Revert account balances
        const destAccount = DB.getById(DB.COLLECTIONS.ACCOUNTS, destAccountId);
        if (destAccount) {
          const change = type === 'income' ? -amount : amount;
          DB.update(DB.COLLECTIONS.ACCOUNTS, destAccountId, {
            balance: Utils.parseNum(destAccount.balance) + change
          });
        }

        const pendingAccount = DB.getById(DB.COLLECTIONS.ACCOUNTS, pendingAccountId);
        if (pendingAccount) {
          const change = type === 'income' ? amount : -amount;
          DB.update(DB.COLLECTIONS.ACCOUNTS, pendingAccountId, {
            balance: Utils.parseNum(pendingAccount.balance) + change
          });
        }

        this.toast('Payment Clearance Reversed! ↩️', 'success');
      }
    } catch (err) {
      console.error('Undo error:', err);
      this.toast('Failed to undo action', 'error');
    }

    this.refreshPage();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
