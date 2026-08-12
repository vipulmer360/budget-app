/* ==========================================
   BUDGET APP — ACCOUNTS MODULE
   ========================================== */

const Accounts = {
  searchTerm: '',
  viewMode: 'grid', // 'grid' or 'list'

  toggleViewMode(mode) {
    this.viewMode = mode;
    App.refreshPage();
  },

  // Account type presets with icons & colors
  typePresets: {
    bank: { label: 'Bank Account', icon: '🏦', color: '#3b82f6', gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb)' },
    wallet: { label: 'Wallet', icon: '👛', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)' },
    pocket: { label: 'Pocket / Cash', icon: '💵', color: '#22c55e', gradient: 'linear-gradient(135deg, #14532d, #16a34a)' },
    upi: { label: 'UPI', icon: '📲', color: '#6366f1', gradient: 'linear-gradient(135deg, #312e81, #6366f1)' },
    credit_card: { label: 'Credit Card', icon: '💳', color: '#f59e0b', gradient: 'linear-gradient(135deg, #78350f, #d97706)' },
    savings: { label: 'Savings', icon: '🏦', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0c4a6e, #0284c7)' },
    loan: { label: 'Loan Account', icon: '📋', color: '#ef4444', gradient: 'linear-gradient(135deg, #7f1d1d, #dc2626)' },
    other: { label: 'Other', icon: '💰', color: '#64748b', gradient: 'linear-gradient(135deg, #334155, #64748b)' }
  },



  syncAccountBalances() {
    const accounts = DB.getAll(DB.COLLECTIONS.ACCOUNTS);
    const updatedAccounts = accounts.map(acc => {
      return {
        ...acc,
        balance: Calculations.getAccountBalance(acc.id)
      };
    });

    localStorage.setItem(DB.COLLECTIONS.ACCOUNTS, JSON.stringify(updatedAccounts));
    return updatedAccounts;
  },

  render() {
    this.syncAccountBalances();
    const accounts = DB.getAll(DB.COLLECTIONS.ACCOUNTS);
    const filtered = Utils.filterBySearch(accounts, this.searchTerm, ['name', 'type', 'bankName']);

    const totalBalance = accounts.reduce((sum, a) => sum + Utils.parseNum(a.balance), 0);

    return `


      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="flex:1;max-width:300px">
            ${Utils.icons.search}
            <input type="text" placeholder="Search accounts..." value="${this.searchTerm}" 
                   oninput="Accounts.search(this.value)">
          </div>
        </div>
        <div class="toolbar-right flex gap-2">
          <div class="tabs" style="border:none; margin:0; min-height:0; border-radius:var(--radius-sm)">
            <div class="tab ${this.viewMode === 'grid' ? 'active' : ''}" onclick="Accounts.toggleViewMode('grid')" title="Grid View" style="padding: 4px 12px; font-size:1.2rem;">
              ⊞
            </div>
            <div class="tab ${this.viewMode === 'list' ? 'active' : ''}" onclick="Accounts.toggleViewMode('list')" title="List View" style="padding: 4px 12px; font-size:1.2rem;">
              ☰
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.undoLastAction()" title="Undo last action" style="color:var(--text-accent);border-color:var(--border);font-weight:700">
            ↩️ Undo
          </button>
          <button class="btn btn-primary" onclick="Accounts.openAddAccount()">
            ${Utils.icons.plus} Add Account
          </button>
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state" style="padding:40px 20px;text-align:center">
          <div style="font-size:36px;margin-bottom:8px">🏦</div>
          <h3 style="font-size:1rem;margin-bottom:4px">No Accounts Added</h3>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:0">Add your Bank, Wallet, or Pocket accounts to track money flow</p>
        </div>
      ` : `
        ${this.viewMode === 'grid' ? `
          <!-- Accounts Cards Grid -->
          <div class="accounts-grid mt-3">
            ${filtered.map(acc => {
              const preset = this.typePresets[acc.type] || this.typePresets.other;
              const stats = this._getAccountStats(acc.id);
              const personBreakdown = Calculations.getAccountPersonBreakdown(acc.id);
              return `
                <div class="account-card" style="background:${preset.gradient};cursor:pointer" onclick="Transactions.viewAccountLedger('${acc.id}')">
                  <div class="account-card-header">
                    <div class="account-card-icon">${preset.icon}</div>
                    <div class="account-card-actions">
                      <button class="btn btn-ghost btn-icon" style="color:rgba(255,255,255,0.7)" onclick="event.stopPropagation(); Accounts.openEditAccount('${acc.id}')" title="Edit">${Utils.icons.edit}</button>
                      <button class="btn btn-ghost btn-icon" style="color:rgba(255,255,255,0.7)" onclick="event.stopPropagation(); Accounts.deleteAccount('${acc.id}')" title="Delete">${Utils.icons.trash}</button>
                    </div>
                  </div>
                  <div class="account-card-name">${Utils.escapeHtml(acc.name)}</div>
                  <div class="account-card-type">${preset.label}${acc.bankName ? ' • ' + Utils.escapeHtml(acc.bankName) : ''}</div>
                  <div class="account-card-balance">${Utils.formatCurrency(acc.balance)}</div>

                  ${acc.accountNumber ? `<div class="account-card-number">•••• ${acc.accountNumber.slice(-4)}</div>` : ''}

                  ${personBreakdown.length > 0 ? `
                    <div style="margin-top:10px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.2); font-size:0.75rem">
                      ${personBreakdown.map(pb => `
                        <div style="display:flex; justify-content:space-between; opacity:0.9; margin-bottom:2px">
                          <span>👤 ${Utils.escapeHtml(pb.name)}:</span>
                          <span style="font-weight:600">${Utils.formatCurrency(pb.balance)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- Accounts Table -->
          <div class="table-container mt-3">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th class="text-right">Balance</th>
                  <th class="text-right">Total Income</th>
                  <th class="text-right">Total Expense</th>
                  <th class="text-right">Net</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(acc => {
                  const preset = this.typePresets[acc.type] || this.typePresets.other;
                  const stats = this._getAccountStats(acc.id);
                  const personBreakdown = Calculations.getAccountPersonBreakdown(acc.id);
                  return `
                    <tr>
                      <td>
                        <div class="flex items-center gap-1">
                          <span style="font-size:1.3rem">${preset.icon}</span>
                          <div>
                            <div class="font-bold">
                              ${Utils.escapeHtml(acc.name)}
                              ${acc.isPersonal ? '<span title="Personal Account (Excluded from Dashboard)" style="font-size:0.8rem">🔒</span>' : ''}
                            </div>
                            ${acc.bankName ? `<div class="text-muted" style="font-size:0.75rem">${Utils.escapeHtml(acc.bankName)}</div>` : ''}
                            ${personBreakdown.length > 0 ? `
                              <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px">
                                ${personBreakdown.map(pb => `👤 ${Utils.escapeHtml(pb.name)}: <b>${Utils.formatCurrency(pb.balance)}</b>`).join(' | ')}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </td>
                      <td>${preset.label}</td>
                      <td class="text-right font-bold">${Utils.formatCurrency(acc.balance)}</td>
                      <td class="text-right"><span class="amount credit">${Utils.formatCurrency(stats.totalIncome)}</span></td>
                      <td class="text-right"><span class="amount debit">${Utils.formatCurrency(stats.totalExpense)}</span></td>
                      <td class="text-right"><span class="amount ${stats.net >= 0 ? 'credit' : 'debit'}">${Utils.formatCurrency(stats.net)}</span></td>
                      <td>
                        <div class="table-actions">
                          <button class="btn btn-ghost btn-icon" onclick="Accounts.openEditAccount('${acc.id}')" title="Edit">${Utils.icons.edit}</button>
                          <button class="btn btn-ghost btn-icon" onclick="Accounts.deleteAccount('${acc.id}')" title="Delete">${Utils.icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      `}
    `;
  },

  search(term) {
    this.searchTerm = term;
    App.refreshPage();
  },

  _getAccountStats(accountId) {
    const trans = Calculations.getAccountTransactions(accountId);
    
    let totalIncome = 0;
    let totalExpense = 0;

    trans.forEach(t => {
      const details = Calculations.getAccountDetails(t, accountId);
      if (details.type === 'income') totalIncome += details.amount;
      else if (details.type === 'expense') totalExpense += details.amount;
    });

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense
    };
  },

  openAddAccount() {
    App.showModal('➕ Add Account', this._accountForm());
  },

  openEditAccount(id) {
    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, id);
    if (!acc) return;
    App.showModal('✏️ Edit Account', this._accountForm(acc));
  },

  _accountForm(acc = null) {
    const isEdit = acc !== null;
    return `
      <form id="accountForm" autocomplete="off" onsubmit="Accounts.saveAccount(event, ${isEdit ? `'${acc.id}'` : 'null'})">
        <div class="form-group">
          <label class="form-label">Account Name *</label>
          <input type="text" class="form-input" name="name" required value="${isEdit ? Utils.escapeHtml(acc.name) : ''}" placeholder="e.g. SBI Savings, Paytm Wallet, Cash">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Account Type *</label>
            <select class="form-select" name="type" required>
              ${Object.entries(this.typePresets).map(([key, preset]) =>
                `<option value="${key}" ${isEdit && acc.type === key ? 'selected' : ''}>${preset.icon} ${preset.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Opening Balance</label>
            <input type="number" class="form-input" name="balance" step="0.01" value="${isEdit ? acc.balance || 0 : '0'}" placeholder="0.00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Bank Name</label>
            <input type="text" class="form-input" name="bankName" value="${isEdit ? Utils.escapeHtml(acc.bankName || '') : ''}" placeholder="e.g. State Bank of India">
          </div>
          <div class="form-group">
            <label class="form-label">Account Number</label>
            <input type="text" class="form-input" name="accountNumber" value="${isEdit ? Utils.escapeHtml(acc.accountNumber || '') : ''}" placeholder="Account number">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">IFSC Code</label>
          <input type="text" class="form-input" name="ifscCode" value="${isEdit ? Utils.escapeHtml(acc.ifscCode || '') : ''}" placeholder="IFSC code">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" name="notes" rows="2" placeholder="Any additional details...">${isEdit ? Utils.escapeHtml(acc.notes || '') : ''}</textarea>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;border-top:1px solid var(--border)">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Account</button>
        </div>
      </form>
    `;
  },

  saveAccount(e, id = null) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {
      name: form.get('name'),
      type: form.get('type'),
      balance: parseFloat(form.get('balance')) || 0,
      bankName: form.get('bankName'),
      accountNumber: form.get('accountNumber'),
      ifscCode: form.get('ifscCode'),
      notes: form.get('notes')
    };

    if (id) {
      DB.update(DB.COLLECTIONS.ACCOUNTS, id, data);
      App.toast('Account updated! ✅', 'success');
    } else {
      DB.add(DB.COLLECTIONS.ACCOUNTS, data);
      App.toast('Account added! 🏦', 'success');
    }
    App.closeModal();
    App.refreshPage();
  },

  deleteAccount(id) {
    if (!confirm('Delete this account? Transactions linked to it will NOT be deleted.')) return;
    DB.delete(DB.COLLECTIONS.ACCOUNTS, id);
    App.toast('Account deleted', 'warning');
    App.refreshPage();
  },

  // Render horizontal grid or list for Dashboard
  openPersonBreakdownModal(accId) {
    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, accId);
    if (!acc) return;
    const breakdown = Calculations.getAccountPersonBreakdown(accId);

    const content = `
      <div style="padding:4px 0">
        <div style="text-align:center; margin-bottom:16px; padding:12px; background:rgba(255,255,255,0.03); border-radius:var(--radius-md); border:1px solid var(--border)">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase">Total Account Balance</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--accent); margin-top:2px">${Utils.formatCurrency(acc.balance)}</div>
        </div>

        <h4 style="font-size:0.85rem; margin-bottom:8px; font-weight:700; color:var(--text-muted)">👥 PERSON-WISE BREAKDOWN</h4>
        ${breakdown.length === 0 ? `
          <p class="text-muted" style="font-size:0.85rem; text-align:center; padding:12px">Is account me koi person tagged transaction nahi hai.</p>
        ` : `
          <div style="display:flex; flex-direction:column; gap:8px">
            ${breakdown.map(pb => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.04); border-radius:var(--radius-sm); border:1px solid var(--border)">
                <div style="display:flex; align-items:center; gap:8px">
                  <span style="font-size:1.1rem">👤</span>
                  <span style="font-weight:600">${Utils.escapeHtml(pb.name)}</span>
                </div>
                <div style="font-weight:800; font-size:1rem; color:${pb.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                  ${Utils.formatCurrency(pb.balance)}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    App.showModal(`🏦 ${acc.name} — Breakdown`, content);
  },

  renderDashboardAccounts(mode = 'grid') {
    this.syncAccountBalances();
    const accounts = DB.getAll(DB.COLLECTIONS.ACCOUNTS);
    if (accounts.length === 0) {
      return `
        <div class="accounts-dashboard-empty" onclick="App.navigate('accounts')">
          <span style="font-size:32px">🏦</span>
          <p>Add your Bank, Wallet & Pocket accounts</p>
          <button class="btn btn-sm btn-outline">+ Add Account</button>
        </div>
      `;
    }

    if (mode === 'list') {
      return `
        <style>
          .account-list-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.08) !important;
            border-color: var(--accent) !important;
          }
        </style>
        <div class="accounts-list-view" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px; margin-top:12px;">
          ${accounts.map(acc => {
            const preset = this.typePresets[acc.type] || this.typePresets.other;
            return `
              <div class="account-list-item" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.03); transition:all 0.3s ease;" onclick="Transactions.viewAccountLedger('${acc.id}')">
                <div style="display:flex; align-items:center; gap:14px;">
                  <div style="width:46px; height:46px; border-radius:12px; background:${preset.gradient}; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:white; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                    ${preset.icon}
                  </div>
                  <div>
                    <div style="font-weight:700; font-size:1rem; color:var(--text-main); margin-bottom:4px; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHtml(acc.name)}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                      <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${preset.color};"></span>
                      ${preset.label}
                    </div>
                  </div>
                </div>
                <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end;">
                  <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:0.75rem; margin-bottom:4px" onclick="event.stopPropagation(); Accounts.openPersonBreakdownModal('${acc.id}')" title="View Persons Breakdown">👥 Breakdown</button>
                  <div style="font-weight:800; font-size:1.05rem; color:var(--text-main);">${Utils.formatCurrency(acc.balance)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="accounts-horizontal-scroll">
        ${accounts.map(acc => {
          const preset = this.typePresets[acc.type] || this.typePresets.other;
          return `
            <div class="account-scroll-card minimal-card" style="background:${preset.gradient};cursor:pointer;position:relative" onclick="Transactions.viewAccountLedger('${acc.id}')">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                <div class="account-scroll-name" style="margin:0">${Utils.escapeHtml(acc.name)}</div>
                <button type="button" class="btn btn-ghost btn-icon" style="padding:0; color:rgba(255,255,255,0.9); font-size:0.95rem; width:24px; height:24px" onclick="event.stopPropagation(); Accounts.openPersonBreakdownModal('${acc.id}')" title="View Persons Breakdown">👥</button>
              </div>
              <div class="account-scroll-balance">${Utils.formatCurrency(acc.balance)}</div>
            </div>
          `;
        }).join('')}
        <!-- Add Account Card -->
        <div class="account-scroll-card account-scroll-add minimal-card" onclick="App.navigate('accounts')" style="justify-content:center; align-items:center;">
          <div style="font-size:1.1rem;font-weight:600;opacity:0.9;">+ Add Account</div>
        </div>
      </div>
    `;
  },

  openClearanceModal(id, type) {
    const collection = type === 'income' ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
    const record = DB.getById(collection, id);
    if (!record) {
      App.toast('Transaction not found', 'error');
      return;
    }
    
    // Get non-pending accounts for destination selection
    const accounts = DB.getAll(DB.COLLECTIONS.ACCOUNTS).filter(a => !a.isPendingAccount);
    
    const html = `
      <div style="padding:16px;">
        <p style="margin-bottom:16px; color:var(--text-secondary);">
          Amount: <strong class="${type === 'income' ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(record.amount)}</strong>
        </p>
        
        <div class="form-group">
          <label class="form-label">Payment Date (Today by default)</label>
          <input type="date" id="clearanceDate" class="form-input" value="${Utils.today()}" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Destination Account (Bank/Wallet) *</label>
          <select id="clearanceAccount" class="form-select" required>
            <option value="">-- Select Receiving Account --</option>
            ${accounts.map(a => `<option value="${a.id}">${Utils.escapeHtml(a.name)} (${Utils.formatCurrency(a.balance)})</option>`).join('')}
          </select>
        </div>
        
        <div class="modal-footer" style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border);">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
          <button type="button" class="btn btn-success" onclick="Accounts.processClearance('${id}', '${type}')">✅ Clear Payment</button>
        </div>
      </div>
    `;
    App.showModal('Clear Payment', html);
  },

  processClearance(id, type) {
    const collection = type === 'income' ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
    const record = DB.getById(collection, id);
    if (!record) return;

    const dateInput = document.getElementById('clearanceDate').value;
    const accountId = document.getElementById('clearanceAccount').value;

    if (!accountId) {
      App.toast('Please select a destination account', 'error');
      return;
    }

    const destAccount = DB.getById(DB.COLLECTIONS.ACCOUNTS, accountId);
    if (!destAccount) {
      App.toast('Invalid destination account', 'error');
      return;
    }

    // 2. Create a new entry for the clearance on the new date
    const pendingAccountId = record.accounts && record.accounts.length > 0 ? record.accounts[0].accountId : record.accountId;
    const pendingAccountName = record.accounts && record.accounts.length > 0 ? record.accounts[0].accountName : record.accountName;

    const newEntry = {
      type: record.type,
      amount: record.amount,
      price: record.price,
      date: dateInput || Utils.today(),

      accounts: [
        {
          accountId: destAccount.id,
          accountName: destAccount.name,
          amount: record.amount,
          type: record.type // income/expense to Bank
        },
        {
          accountId: pendingAccountId,
          accountName: pendingAccountName,
          amount: record.amount,
          type: record.type === 'income' ? 'expense' : 'income', // Offset the pending account
          isPersonal: true // <--- HIDE FROM MAIN PNL CALCULATION!
        }
      ],
      notes: 'Clear Pending',
      status: 'cleared_receipt',
      isClearanceReceipt: true // To hide from Pending Account ledger UI
    };

    const addedEntry = DB.add(collection, newEntry);

    // 1. Mark original entry as cleared for pending account
    DB.update(collection, id, { pendingStatus: 'cleared', pendingClearanceId: addedEntry.id });

    // 3. Update BOTH account balances
    const change = newEntry.type === 'income' ? newEntry.amount : -newEntry.amount;
    
    // Add to bank
    DB.update(DB.COLLECTIONS.ACCOUNTS, destAccount.id, {
      balance: Utils.parseNum(destAccount.balance) + change
    });
    
    // Subtract from pending account
    const pendingAccObj = DB.getById(DB.COLLECTIONS.ACCOUNTS, pendingAccountId);
    if (pendingAccObj) {
      DB.update(DB.COLLECTIONS.ACCOUNTS, pendingAccountId, {
        balance: Utils.parseNum(pendingAccObj.balance) - change
      });
    }

    App.lastAction = {
      type: 'revert_account_clearance',
      data: {
        collection,
        originalId: id,
        newEntryId: addedEntry.id,
        destAccountId: destAccount.id,
        pendingAccountId: pendingAccountId,
        amount: record.amount,
        type: newEntry.type
      }
    };

    App.toast('Payment Cleared Successfully! ✅', 'success');
    App.closeModal();
    App.refreshPage();
  },

  revertClearance(id, type) {
    if (!confirm('Kya aap is clearance ko wapas pending me bhejna chahte hain?')) return;
    
    const collection = type === 'income' ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
    const originalEntry = DB.getById(collection, id);
    if (!originalEntry) return;

    if (originalEntry.pendingClearanceId) {
      const receipt = DB.getById(collection, originalEntry.pendingClearanceId);
      if (receipt) {
        // Find destination bank account from receipt
        const bankAcc = receipt.accounts.find(a => !a.isPersonal);
        if (bankAcc) {
           const destAccount = DB.getById(DB.COLLECTIONS.ACCOUNTS, bankAcc.accountId);
           if (destAccount) {
             const change = receipt.type === 'income' ? -receipt.amount : receipt.amount;
             DB.update(DB.COLLECTIONS.ACCOUNTS, destAccount.id, {
               balance: Utils.parseNum(destAccount.balance) + change
             });
           }
        }
        
        // Find pending account
        const pendingAccId = originalEntry.accounts && originalEntry.accounts.length > 0 ? originalEntry.accounts[0].accountId : originalEntry.accountId;
        const pendingAccObj = DB.getById(DB.COLLECTIONS.ACCOUNTS, pendingAccId);
        if (pendingAccObj) {
           const change = receipt.type === 'income' ? receipt.amount : -receipt.amount;
           DB.update(DB.COLLECTIONS.ACCOUNTS, pendingAccId, {
             balance: Utils.parseNum(pendingAccObj.balance) + change
           });
        }

        // Delete the clearance receipt
        DB.delete(collection, receipt.id);
      }
    } else {
      App.toast('Receipt not automatically deleted. Please delete it manually from Main Transactions.', 'warning');
    }

    // Move back to Pending
    DB.update(collection, id, { pendingStatus: null, pendingClearanceId: null });
    App.toast('Clearance Reverted! Wapas Pending me aa gaya.', 'success');
    App.refreshPage();
  }
};
