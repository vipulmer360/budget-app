/* ==========================================
   BUDGET APP — SETTINGS MODULE
   ========================================== */

const Settings = {
  render() {
    const settings = DB.getSettings();
    const accounts = DB.getAll(DB.COLLECTIONS.ACCOUNTS);
    const persons = DB.getAll(DB.COLLECTIONS.PERSONS);
    const savedPrefs = settings.dashboardPreferences || {};
    
    // Default widget order & visibility
    const defaultWidgets = ['total_card', 'accounts', 'persons', 'transactions'];
    const currentWidgets = savedPrefs.widgetOrder || defaultWidgets;
    const includedAccounts = savedPrefs.includedAccounts || accounts.map(a => a.id);
    const includedPersons = savedPrefs.includedPersons || persons.map(p => p.id);

    const widgetLabels = {
      'total_card': { title: '💰 Total Balance Card', desc: 'Displays total balance summary across selected accounts' },
      'accounts': { title: '🏦 My Accounts Section', desc: 'Displays accounts grid / list view' },
      'persons': { title: '👥 Persons Section', desc: 'Displays family/persons balance breakdown' },
      'transactions': { title: '🧾 Recent Transactions', desc: 'Displays latest transactions feed' }
    };

    // Ensure all widgets are present in the list (for toggling/sorting)
    const allWidgetIds = [...new Set([...currentWidgets, ...defaultWidgets])];

    return `
      <div style="max-width:600px">
        <!-- Dashboard Customization -->
        <div class="card mb-3" style="border: 1px solid var(--accent)">
          <div class="card-header">
            <h3 class="card-title">📊 Dashboard Customization & Variable Layout</h3>
          </div>
          <form id="dashboardSettingsForm" autocomplete="off" onsubmit="Settings.saveDashboard(event)">
            
            <!-- Variable Widget Ordering System -->
            <div class="form-group mb-3">
              <label class="form-label" style="font-weight:700">🧩 Dashboard Widget Layout & Display Order</label>
              <p class="text-muted" style="font-size:0.8rem; margin-top:-4px; margin-bottom:10px">Enable/disable widgets and set display order (1 = Top position)</p>
              
              <div style="display:flex; flex-direction:column; gap:8px">
                ${allWidgetIds.map((wId, idx) => {
                  const widgetInfo = widgetLabels[wId] || { title: wId, desc: '' };
                  const isChecked = currentWidgets.includes(wId);
                  return `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:var(--bg-glass); border:1px solid var(--border); border-radius:var(--radius-sm)">
                      <div style="display:flex; align-items:center; gap:10px">
                        <input type="checkbox" name="activeWidgets" value="${wId}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--accent)">
                        <div>
                          <div style="font-weight:700; font-size:0.9rem">${widgetInfo.title}</div>
                          <div class="text-muted" style="font-size:0.75rem">${widgetInfo.desc}</div>
                        </div>
                      </div>
                      <div style="display:flex; align-items:center; gap:4px">
                        <span style="font-size:0.75rem; color:var(--text-muted); margin-right:4px">Order:</span>
                        <select class="form-select" name="order_${wId}" style="width:65px; padding:4px 6px; font-size:0.8rem">
                          ${allWidgetIds.map((_, i) => `
                            <option value="${i + 1}" ${currentWidgets.indexOf(wId) === i ? 'selected' : ''}>#${i + 1}</option>
                          `).join('')}
                        </select>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Account Selection Sub-Setting -->
            <div class="form-group mb-3">
              <label class="form-label" style="font-weight:700">🏦 Accounts Selection for Dashboard</label>
              <p class="text-muted" style="font-size:0.8rem; margin-top:-4px; margin-bottom:8px">Select which accounts to display on dashboard & calculate in Total Balance</p>
              <div style="background:var(--bg-glass); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px; max-height: 180px; overflow-y: auto;">
                ${accounts.map(acc => `
                  <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:4px 0;">
                    <input type="checkbox" name="includedAccounts" value="${acc.id}" 
                      ${includedAccounts.includes(acc.id) ? 'checked' : ''} 
                      style="width:16px; height:16px; accent-color:var(--accent);">
                    <span style="font-weight:600; font-size:0.85rem">${Utils.escapeHtml(acc.name)}</span>
                    <span style="opacity:0.6; font-size:0.8rem; margin-left:auto;">${Utils.formatCurrency(acc.balance)}</span>
                  </label>
                `).join('')}
                ${accounts.length === 0 ? '<div style="opacity:0.6;font-size:0.85rem">No accounts found.</div>' : ''}
              </div>
            </div>

            <!-- Person Selection Sub-Setting -->
            <div class="form-group mb-3">
              <label class="form-label" style="font-weight:700">👥 Persons Selection for Dashboard</label>
              <p class="text-muted" style="font-size:0.8rem; margin-top:-4px; margin-bottom:8px">Select which persons/family members to display on dashboard</p>
              <div style="background:var(--bg-glass); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px; max-height: 180px; overflow-y: auto;">
                ${persons.map(p => `
                  <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:4px 0;">
                    <input type="checkbox" name="includedPersons" value="${p.id}" 
                      ${includedPersons.includes(p.id) ? 'checked' : ''} 
                      style="width:16px; height:16px; accent-color:var(--accent);">
                    <span style="font-weight:600; font-size:0.85rem">👤 ${Utils.escapeHtml(p.name)}</span>
                  </label>
                `).join('')}
                ${persons.length === 0 ? '<div style="opacity:0.6;font-size:0.85rem">No persons found.</div>' : ''}
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block mt-2">💾 Save Custom Dashboard Layout</button>
          </form>
        </div>

        <!-- Business Profile -->
        <div class="card mb-3">
          <div class="card-header">
            <h3 class="card-title">🏢 Business Profile</h3>
          </div>
          <form id="settingsForm" autocomplete="off" onsubmit="Settings.save(event)">
            <div class="form-group">
              <label class="form-label">Business Name</label>
              <input type="text" class="form-input" name="businessName" value="${Utils.escapeHtml(settings.businessName)}" placeholder="Your Business Name">
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <textarea class="form-textarea" name="businessAddress" rows="2" placeholder="Full business address">${Utils.escapeHtml(settings.businessAddress || '')}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="form-input" name="businessPhone" value="${Utils.escapeHtml(settings.businessPhone || '')}" placeholder="Phone number">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" name="businessEmail" value="${Utils.escapeHtml(settings.businessEmail || '')}" placeholder="Email address">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">GSTIN</label>
                <input type="text" class="form-input" name="gstin" value="${Utils.escapeHtml(settings.gstin || '')}" placeholder="e.g. 27AADCB2230M1ZX" maxlength="15">
              </div>
              <div class="form-group">
                <label class="form-label">State</label>
                <input type="text" class="form-input" name="state" value="${Utils.escapeHtml(settings.state || '')}" placeholder="e.g. Maharashtra">
              </div>
            </div>

            <div class="divider"></div>
            <h3 class="card-title mb-2">🏦 Bank Details (for Invoice)</h3>
            <div class="form-group">
              <label class="form-label">Bank Name</label>
              <input type="text" class="form-input" name="bankName" value="${Utils.escapeHtml(settings.bankName || '')}" placeholder="Bank name">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Account Number</label>
                <input type="text" class="form-input" name="accountNumber" value="${Utils.escapeHtml(settings.accountNumber || '')}" placeholder="Account number">
              </div>
              <div class="form-group">
                <label class="form-label">IFSC Code</label>
                <input type="text" class="form-input" name="ifscCode" value="${Utils.escapeHtml(settings.ifscCode || '')}" placeholder="IFSC code">
              </div>
            </div>

            <div class="divider"></div>

            <button type="submit" class="btn btn-primary btn-block mt-2">💾 Save Settings</button>
          </form>
        </div>

        <!-- Cloud Sync & Account Status -->
        <div class="card mb-3">
          <div class="card-header">
            <h3 class="card-title">☁️ Cloud Account & Sync</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">👤 Account: ${Auth.getUserInfo() ? Utils.escapeHtml(Auth.getUserInfo().name) : 'Not Logged In'}</div>
                <div class="text-muted" style="font-size:0.8rem">${Auth.getUserInfo() ? Utils.escapeHtml(Auth.getUserInfo().email) : ''}</div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="App.handleLogout()">
                🚪 Logout
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">⚡ Cloud Auto Sync</div>
                <div class="text-muted" style="font-size:0.8rem">Turn OFF if you don't want cloud data auto-restoring</div>
              </div>
              <button class="btn ${Settings.isCloudSyncDisabled() ? 'btn-danger' : 'btn-success'} btn-sm" onclick="Settings.toggleCloudSync()" style="font-weight:700">
                ${Settings.isCloudSyncDisabled() ? '🔴 Cloud Sync: OFF' : '🟢 Cloud Sync: ON'}
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">📥 Pull Cloud Data (Restore)</div>
                <div class="text-muted" style="font-size:0.8rem">Download data saved in your Google Account to this device</div>
              </div>
              <button class="btn btn-success btn-sm" onclick="Sync.pullAll()">
                📥 Restore Cloud Data
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">📤 Push Local Data</div>
                <div class="text-muted" style="font-size:0.8rem">Upload data from this device to your Google Account</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="Sync.pushAll()">
                📤 Push to Cloud
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">🔄 Two-Way Smart Sync</div>
                <div class="text-muted" style="font-size:0.8rem">Merge local device data and cloud data</div>
              </div>
              <button class="btn btn-accent btn-sm" onclick="Sync.syncNow()">
                🔄 Smart Sync
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold text-danger">⚠️ Delete Cloud Data</div>
                <div class="text-muted" style="font-size:0.8rem">Permanently wipe all data from your Google Account (Keeps local device data)</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="Settings.handleDeleteCloudDataOnly()">
                🗑️ Delete Cloud Data
              </button>
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="card mb-3">
          <div class="card-header">
            <h3 class="card-title">💾 Data Management</h3>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">📥 Export Backup</div>
                <div class="text-muted" style="font-size:0.8rem">Download all data as JSON file</div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="Settings.exportData()">
                ${Utils.icons.download} Export
              </button>
            </div>
            
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">📤 Import Backup</div>
                <div class="text-muted" style="font-size:0.8rem">Restore data from JSON file</div>
              </div>
              <label class="btn btn-outline btn-sm" style="cursor:pointer">
                ${Utils.icons.upload} Import
                <input type="file" accept=".json" onchange="Settings.importData(event)" style="display:none">
              </label>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div class="font-bold">📊 Load Demo Data</div>
                <div class="text-muted" style="font-size:0.8rem">Add sample parties, items for testing</div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="Settings.loadDemo()">
                Load Demo
              </button>
            </div>

            <div class="divider"></div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--danger-bg);border-radius:var(--radius-sm);border:1px solid rgba(239,68,68,0.2)">
              <div>
                <div class="font-bold text-danger">🗑️ Clear All Data</div>
                <div class="text-muted" style="font-size:0.8rem">Delete everything permanently</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="Settings.clearData()">
                Clear All
              </button>
            </div>
          </div>
        </div>

        <!-- App Info -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">ℹ️ App Info</h3>
          </div>
          <div style="font-size:0.85rem;color:var(--text-muted)">
            <p><strong>App:</strong> Budget App</p>
            <p><strong>Version:</strong> 1.0.0 (PWA)</p>
            <p><strong>Storage:</strong> Local + Cloud Sync</p>
            <button class="btn btn-outline btn-sm mt-2" onclick="App.forceUpdateApp()" style="width:100%; border-color:var(--accent); color:var(--accent)">🔄 Check & Install Latest App Update</button>
          </div>
        </div>
      </div>
    `;
  },

  save(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const existing = DB.getSettings();
    const newSettings = {
      ...existing,
      businessName: form.get('businessName'),
      businessAddress: form.get('businessAddress'),
      businessPhone: form.get('businessPhone'),
      businessEmail: form.get('businessEmail'),
      gstin: form.get('gstin'),
      state: form.get('state'),
      bankName: form.get('bankName'),
      accountNumber: form.get('accountNumber'),
      ifscCode: form.get('ifscCode')
    };
    DB.saveSettings(newSettings);
    App.toast('Settings saved! ⚙️', 'success');
    // Update sidebar business name
    const brandEl = document.querySelector('.sidebar-brand h1');
    if (brandEl) brandEl.textContent = newSettings.businessName;
  },

  saveDashboard(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const existing = DB.getSettings();
    
    const activeWidgets = form.getAll('activeWidgets');
    const widgetOrderWithScores = activeWidgets.map(wId => {
      const orderVal = parseInt(form.get(`order_${wId}`), 10) || 1;
      return { id: wId, order: orderVal };
    });

    widgetOrderWithScores.sort((a, b) => a.order - b.order);
    const sortedWidgetOrder = widgetOrderWithScores.map(w => w.id);

    const dashPrefs = {
      widgetOrder: sortedWidgetOrder,
      includedAccounts: form.getAll('includedAccounts'),
      includedPersons: form.getAll('includedPersons')
    };
    
    DB.saveSettings({ ...existing, dashboardPreferences: dashPrefs });
    if (typeof Sync !== 'undefined' && Sync.isOnline) {
      Sync.pushCollection(DB.COLLECTIONS.SETTINGS);
      App.toast('Dashboard Layout Saved & Synced to Cloud! ☁️📊', 'success');
    } else {
      App.toast('Dashboard Layout Saved Locally! 📊', 'success');
    }
    App.refreshPage();
  },

  exportData() {
    const data = DB.exportAll();
    Utils.downloadFile(data, `budget_backup_${Utils.today()}.json`);
    App.toast('Backup downloaded! 📥', 'success');
  },

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('This will MERGE with existing data. Continue?')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const success = DB.importAll(event.target.result);
      if (success) {
        App.toast('Data imported successfully! 📤', 'success');
        App.refreshPage();
      } else {
        App.toast('Import failed. Invalid file.', 'error');
      }
    };
    reader.readAsText(file);
  },

  loadDemo() {
    DB.seedDemoData();
    App.toast('Demo data loaded! 📊', 'success');
    App.refreshPage();
  },

  isCloudSyncDisabled() {
    return localStorage.getItem('budget_cloud_sync_disabled') === 'true';
  },

  toggleCloudSync() {
    const current = this.isCloudSyncDisabled();
    if (current) {
      localStorage.removeItem('budget_cloud_sync_disabled');
      App.toast('Cloud Sync turned ON 🟢', 'success');
    } else {
      localStorage.setItem('budget_cloud_sync_disabled', 'true');
      App.toast('Cloud Sync turned OFF 🔴', 'warning');
    }
    App.refreshPage();
  },

  async handleDeleteCloudDataOnly() {
    if (!confirm('⚠️ Are you sure you want to PERMANENTLY DELETE all cloud data from your Google Account? (Your local data on this phone will NOT be deleted)')) return;
    await Sync.deleteCloudDataOnly();
  },

  async clearData() {
    if (!confirm('⚠️ DELETE ALL DATA (Local & Cloud)? This cannot be undone!')) return;
    if (!confirm('Are you REALLY sure? All cloud backups will also be permanently deleted.')) return;
    
    App.toast('Wiping all local and cloud data... ⏳', 'info');
    
    try {
      if (window.Sync && Sync.wipeAllData) {
        await Sync.wipeAllData();
      } else {
        DB.clearAll();
      }
      App.toast('All local & cloud data cleared permanently! 🗑️', 'success');
    } catch (err) {
      console.error('Clear data error:', err);
      DB.clearAll();
      App.toast('Local data cleared! 🗑️', 'warning');
    }

    App.refreshPage();
  }
};
