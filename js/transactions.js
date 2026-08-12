/* ==========================================
   BUDGET APP — TRANSACTIONS (INCOME & EXPENSE)
   ========================================== */

const Transactions = {
  currentType: 'all', // 'all', 'income', or 'expense'
  searchTerm: '',
  accountFilter: '', // Filter by account
  sortOrder: localStorage.getItem('budget_sort_order') || 'desc', // 'desc' (Newest First) or 'asc' (Oldest First)
  accountLedgerTab: 'pending',

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    localStorage.setItem('budget_sort_order', this.sortOrder);
    App.toast(`Sorted by ${this.sortOrder === 'asc' ? 'Oldest First ⬆️' : 'Newest First ⬇️'}`, 'info');
    App.refreshPage();
  },

  viewAccountLedger(accountId) {
    this.accountFilter = accountId;
    this.currentType = 'all'; // Reset to all
    this.searchTerm = ''; // Reset search
    this.accountLedgerTab = 'pending'; // Reset to pending by default
    App.navigate('transactions');
  },
  
  switchAccountLedgerTab(tab) {
    this.accountLedgerTab = tab;
    App.refreshPage();
  },

  getAllTransactions() {
    const incomes = DB.getAll(DB.COLLECTIONS.INCOMES).map(i => ({ ...i, type: 'income' }));
    const expenses = DB.getAll(DB.COLLECTIONS.EXPENSES).map(e => ({ ...e, type: 'expense' }));
    return [...incomes, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '') || 0);
  },

  renderTransactionsTable(transactions, options = {}) {
    if (transactions.length === 0) {
      return `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:12px">🧾</div>
          <h3>No Transactions Found</h3>
          <p>Add your first income or expense transaction</p>
        </div>
      `;
    }

    // Sort items by sortOrder
    const isAsc = this.sortOrder === 'asc';
    transactions.sort((a, b) => {
      // First by date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return isAsc ? dateA - dateB : dateB - dateA;
      }
      // Then by custom drag sortOrder
      const orderA = a.sortOrder !== undefined ? a.sortOrder : -1;
      const orderB = b.sortOrder !== undefined ? b.sortOrder : -1;
      if (orderA === orderB) {
         return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return orderA - orderB;
    });

    return `
      <div class="date-group-card">
        <div class="table-container" style="border:none;border-radius:0;box-shadow:none">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:30px"></th>
                <th class="text-center">Date</th>
                <th class="text-center">Account</th>
                <th class="text-center">Amount</th>
                <th class="text-center">Notes</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map((t, idx) => {
                let html = '';
                let renderRow = (accDisplay, displayAmount, isInc) => {
                  if (displayAmount < 0) {
                    isInc = !isInc;
                    displayAmount = Math.abs(displayAmount);
                  }
                  let notesHtml = t.notes ? Utils.escapeHtml(t.notes) : '-';
                  return `
                    <tr data-id="${t.id}" data-type="${t.type}" data-idx="${idx}">
                      <td class="text-center" style="width:30px;padding:4px">
                        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                      </td>
                      <td class="text-center">${Utils.formatDate(t.date)}</td>
                      <td class="text-center">${Utils.escapeHtml(accDisplay)}</td>
                      <td class="text-center">
                        ${displayAmount ? `<span class="amount ${isInc ? 'credit' : 'debit'}">${isInc ? '+' : '-'}${Utils.formatCurrency(displayAmount)}</span>` : '<span class="text-muted">-</span>'}
                      </td>
                      <td class="text-center">${notesHtml}</td>
                      <td class="text-center">
                        <div class="table-actions" style="justify-content:center">
                          ${options.isPendingAccount && t.pendingStatus !== 'cleared' ? `
                            <button class="btn btn-ghost btn-icon text-success" onclick="Accounts.openClearanceModal('${t.id}', '${t.type}')" title="Clear Payment">✅</button>
                          ` : ''}
                          ${options.isPendingAccount && t.pendingStatus === 'cleared' ? `
                            <button class="btn btn-ghost btn-icon text-warning" onclick="Accounts.revertClearance('${t.id}', '${t.type}')" title="Revert Clearance">↩️</button>
                          ` : ''}
                          <button class="btn btn-ghost btn-icon" onclick="Transactions.openEditModal('${t.type}', '${t.id}')" title="Edit">${Utils.icons.edit}</button>
                          <button class="btn btn-ghost btn-icon text-danger" onclick="Transactions.deleteTransaction('${t.type}', '${t.id}')" title="Delete">${Utils.icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  `;
                };

                // If accountFilter is set, we ONLY render rows matching the selected account
                if (Transactions.accountFilter) {
                  const targetAccId = String(Transactions.accountFilter);
                  if (t.accounts && Array.isArray(t.accounts)) {
                    t.accounts.filter(a => String(a.accountId) === targetAccId).forEach(accEntry => {
                      const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId);
                      const accDisplay = acc ? acc.name : (accEntry.accountName || '-');
                      const displayAmount = parseFloat(accEntry.amount) || 0;
                      const isInc = (accEntry.type || t.type) === 'income';
                      html += renderRow(accDisplay, displayAmount, isInc);
                    });
                  } else if (String(t.accountId) === targetAccId) {
                    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, targetAccId);
                    const accDisplay = acc ? acc.name : (t.accountName || '-');
                    const displayAmount = parseFloat(t.amount) || parseFloat(t.price) || 0;
                    const isInc = t.type === 'income';
                    html += renderRow(accDisplay, displayAmount, isInc);
                  }
                } 
                // In All Transactions view (no account filter), show 1 single row per transaction with joined account names & first account amount
                else if (t.accounts && t.accounts.length > 0) {
                  const accNames = t.accounts.map(accEntry => {
                    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId);
                    return acc ? acc.name : (accEntry.accountName || '');
                  }).filter(n => n.trim() !== '');
                  const accDisplay = accNames.length > 0 ? accNames.join(', ') : '-';
                  const firstAccAmount = parseFloat(t.accounts[0].amount) || 0;
                  const isInc = (t.accounts[0].type || t.type) === 'income';
                  html += renderRow(accDisplay, firstAccAmount, isInc);
                } 
                // Legacy fallback for single accountId
                else {
                  let accDisplay = '-';
                  if (t.accountId) {
                    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, t.accountId);
                    accDisplay = acc ? acc.name : (t.accountName || '-');
                  }
                  let displayAmount = parseFloat(t.amount) || parseFloat(t.price) || 0;
                  let isInc = t.type === 'income';
                  html += renderRow(accDisplay, displayAmount, isInc);
                }
                
                return html;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderAll() {
    let filtered = Utils.filterBySearch(this.getAllTransactions(), this.searchTerm, ['notes', 'accountName']);
    
    if (this.currentType === 'income' || this.currentType === 'expense') {
      filtered = filtered.filter(t => t.type === this.currentType);
    }
    if (this.accountFilter && typeof window.Calculations !== 'undefined') {
      filtered = Calculations.getAccountTransactions(this.accountFilter);
    }

    let isPendingAccount = false;
    if (this.accountFilter) {
      const accountObj = DB.getById(DB.COLLECTIONS.ACCOUNTS, this.accountFilter);
      if (accountObj && accountObj.isPendingAccount) {
        isPendingAccount = true;
        filtered = filtered.filter(t => !t.isClearanceReceipt);
        if (this.accountLedgerTab === 'cleared') {
          filtered = filtered.filter(t => t.pendingStatus === 'cleared');
        } else {
          filtered = filtered.filter(t => t.pendingStatus !== 'cleared');
        }
      }
    }

    return `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="tabs" style="border:none;margin:0">
            <div class="tab ${this.currentType === 'all' ? 'active' : ''}" onclick="Transactions.switchAllTab('all')">
              All
            </div>
            <div class="tab ${this.currentType === 'income' ? 'active' : ''}" onclick="Transactions.switchAllTab('income')">
              💵 Income
            </div>
            <div class="tab ${this.currentType === 'expense' ? 'active' : ''}" onclick="Transactions.switchAllTab('expense')">
              💸 Expense
            </div>
          </div>
        </div>
        <div class="toolbar-right flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="${this.accountFilter ? `Accounts.openPersonBreakdownModal('${this.accountFilter}')` : `App.navigate('reports'); setTimeout(() => Reports.switchReport('persons'), 50)`}" style="font-weight:600; color:var(--text-main)" title="View Persons Breakdown">
            👥 Breakdown
          </button>
          <button class="btn btn-outline btn-sm" onclick="App.undoLastAction()" title="Undo last action" style="color:var(--text-accent);border-color:var(--border);font-weight:700">
            ↩️ Undo
          </button>
          <button class="btn btn-success btn-sm" onclick="Transactions.openAddModal('income')">
            + Income
          </button>
          <button class="btn btn-danger btn-sm" onclick="Transactions.openAddModal('expense')">
            + Expense
          </button>
        </div>
      </div>

      <div class="toolbar mb-2">
        <div class="toolbar-left">
          <div class="search-bar" style="flex:1;max-width:260px">
            ${Utils.icons.search}
            <input type="text" placeholder="Search item, notes..." value="${this.searchTerm}" 
                   oninput="Transactions.search(this.value)">
          </div>
          ${this.accountFilter ? `
            <button class="btn btn-outline btn-sm" onclick="Transactions.clearAccountFilter()" style="margin-left:8px">
              Clear Account Filter ✖
            </button>
          ` : ''}
        </div>
      </div>

      ${isPendingAccount ? `
        <div class="tabs mb-2" style="border:none;margin-bottom:16px">
          <div class="tab ${this.accountLedgerTab !== 'cleared' ? 'active' : ''}" onclick="Transactions.switchAccountLedgerTab('pending')">
            ⏳ Pending Dues
          </div>
          <div class="tab ${this.accountLedgerTab === 'cleared' ? 'active' : ''}" onclick="Transactions.switchAccountLedgerTab('cleared')">
            ✅ Cleared Payments
          </div>
        </div>
      ` : ''}

      ${this.renderTransactionsTable(filtered, { isPendingAccount })}
    `;
  },

  switchAllTab(type) {
    this.currentType = type;
    App.refreshPage();
  },

  clearAccountFilter() {
    this.accountFilter = '';
    App.refreshPage();
  },

  renderRecentDashboardRows(count = 4, startDate, endDate) {
    let allTrans = this.getAllTransactions();
    if (startDate && endDate) {
      allTrans = allTrans.filter(t => t.date >= startDate && t.date <= endDate);
    } else if (!startDate && !endDate) {
      const range = Utils.getDateRange('month');
      allTrans = allTrans.filter(t => t.date >= range.start && t.date < range.end);
    }
    if (count > 0) {
      allTrans = allTrans.slice(0, count);
    }
    return this.renderTransactionsTable(allTrans);
  },

  render(type = 'income') {
    this.currentType = type;
    const isIncome = type === 'income';
    const collection = isIncome ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
    const transactions = DB.getAll(collection);

    let filtered = Utils.filterBySearch(transactions, this.searchTerm, ['notes', 'accountName']);
    if (this.accountFilter) {
      const targetId = String(this.accountFilter);
      filtered = filtered.filter(t => {
        if (t.accounts && Array.isArray(t.accounts)) {
          return t.accounts.some(a => String(a.accountId) === targetId);
        }
        return String(t.accountId) === targetId;
      });
    }
    filtered.reverse();

    return `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="flex:1;max-width:260px">
            ${Utils.icons.search}
            <input type="text" placeholder="Search ${type}..." value="${this.searchTerm}" 
                   oninput="Transactions.search(this.value)">
          </div>
        </div>
        <div class="toolbar-right">
          <button class="btn ${isIncome ? 'btn-success' : 'btn-danger'}" onclick="Transactions.openAddModal('${type}')">
            ${Utils.icons.plus} Add ${isIncome ? 'Income' : 'Expense'}
          </button>
        </div>
      </div>

      ${this.renderTransactionsTable(filtered)}
    `;
  },

  search(term) {
    this.searchTerm = term;
    App.refreshPage();
  },

  getParties() {
    const incomes = DB.getAll(DB.COLLECTIONS.INCOMES);
    const expenses = DB.getAll(DB.COLLECTIONS.EXPENSES);
    const set = new Set();
    [...incomes, ...expenses].forEach(t => {
      if (t.party && t.party !== 'General') set.add(t.party);
      if (t.parties && Array.isArray(t.parties)) {
        t.parties.forEach(p => {
          if (p.partyName) set.add(p.partyName);
        });
      }
    });
    return Array.from(set);
  },

  openAddModal(type = 'income') {
    if (type === 'income') {
      Income.openModal();
    } else {
      Expense.openModal();
    }
  },

  openEditModal(type, id) {
    let collection = type === 'income' ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
    let record = DB.getById(collection, id);

    if (!record) {
      const altCollection = type === 'income' ? DB.COLLECTIONS.EXPENSES : DB.COLLECTIONS.INCOMES;
      record = DB.getById(altCollection, id);
      if (record) {
        type = type === 'income' ? 'expense' : 'income';
      }
    }

    if (!record) {
      App.toast('Entry not found', 'error');
      return;
    }
    
    if (type === 'income') {
      Income.openModal(record);
    } else {
      Expense.openModal(record);
    }
  },

  deleteTransaction(type, id) {
    if (!confirm('Delete this entry?')) return;
    
    let collection = type === 'income' ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
    let record = DB.getById(collection, id);
    
    if (!record) {
      const altCollection = type === 'income' ? DB.COLLECTIONS.EXPENSES : DB.COLLECTIONS.INCOMES;
      record = DB.getById(altCollection, id);
      if (record) {
        collection = altCollection;
      }
    }

    if (!record) {
      App.toast('Entry not found', 'error');
      return;
    }

    const isIncome = collection === DB.COLLECTIONS.INCOMES;

    App.lastAction = {
      type: 'delete_transaction',
      data: {
        collection,
        record: JSON.parse(JSON.stringify(record))
      }
    };

    if (record.accounts && record.accounts.length > 0) {
      record.accounts.forEach(accEntry => {
        if (accEntry.accountId) {
          const account = DB.getById(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId);
          if (account) {
            const revertChange = (accEntry.type || (isIncome ? 'income' : 'expense')) === 'income' ? -Utils.parseNum(accEntry.amount) : Utils.parseNum(accEntry.amount);
            DB.update(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId, {
              balance: Utils.parseNum(account.balance) + revertChange
            });
          }
        }
      });
    } else if (record.accountId) {
      const account = DB.getById(DB.COLLECTIONS.ACCOUNTS, record.accountId);
      if (account) {
        const revertChange = isIncome ? -Utils.parseNum(record.amount) : Utils.parseNum(record.amount);
        DB.update(DB.COLLECTIONS.ACCOUNTS, record.accountId, {
          balance: Utils.parseNum(account.balance) + revertChange
        });
      }
    }

    DB.delete(collection, id);
    App.toast('Entry deleted. <button class="btn btn-sm btn-outline" onclick="App.undoLastAction()" style="margin-left:8px;padding:2px 8px;font-size:0.75rem;color:var(--accent-light)">↩️ Undo</button>', 'warning', 6500);
    App.refreshPage();
  },

  // ========== DRAG & DROP REORDER ==========
  _dragState: null,

  initDragReorder() {
    const handles = document.querySelectorAll('.drag-handle');
    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => this._startDrag(e, handle));
      handle.addEventListener('touchstart', (e) => this._startDrag(e, handle), { passive: false });
    });
  },

  _startDrag(e, handle) {
    e.preventDefault();
    e.stopPropagation();

    const row = handle.closest('tr');
    const tbody = row.closest('tbody');
    if (!row || !tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr[data-id]'));
    const startIdx = rows.indexOf(row);
    if (startIdx === -1) return;

    const touch = e.touches ? e.touches[0] : e;
    const rect = row.getBoundingClientRect();

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = row.querySelector('td:nth-child(4)')?.textContent?.trim() || 'Row';
    ghost.style.left = (touch.clientX + 10) + 'px';
    ghost.style.top = (touch.clientY - 15) + 'px';
    document.body.appendChild(ghost);

    row.classList.add('dragging');

    this._dragState = {
      row,
      tbody,
      rows,
      startIdx,
      ghost,
      currentOverRow: null,
      offsetY: touch.clientY - rect.top
    };

    const moveHandler = (ev) => this._onDragMove(ev);
    const endHandler = (ev) => {
      this._onDragEnd(ev);
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  },

  _onDragMove(e) {
    if (!this._dragState) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const { ghost, rows, row } = this._dragState;

    ghost.style.left = (touch.clientX + 10) + 'px';
    ghost.style.top = (touch.clientY - 15) + 'px';

    rows.forEach(r => {
      r.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    for (const r of rows) {
      if (r === row) continue;
      const rect = r.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const mid = rect.top + rect.height / 2;
        if (touch.clientY < mid) {
          r.classList.add('drag-over-top');
        } else {
          r.classList.add('drag-over-bottom');
        }
        this._dragState.currentOverRow = r;
        this._dragState.insertBefore = touch.clientY < mid;
        break;
      }
    }
  },

  _onDragEnd(e) {
    if (!this._dragState) return;

    const { row, tbody, rows, ghost, currentOverRow, insertBefore } = this._dragState;

    row.classList.remove('dragging');
    rows.forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);

    if (currentOverRow && currentOverRow !== row) {
      if (insertBefore) {
        tbody.insertBefore(row, currentOverRow);
      } else {
        tbody.insertBefore(row, currentOverRow.nextSibling);
      }

      const reorderedRows = Array.from(tbody.querySelectorAll('tr[data-id]'));
      reorderedRows.forEach((r, idx) => {
        const id = r.getAttribute('data-id');
        const type = r.getAttribute('data-type');
        const collection = type === 'income' ? DB.COLLECTIONS.INCOMES : DB.COLLECTIONS.EXPENSES;
        DB.update(collection, id, { sortOrder: idx });
      });
    }

    this._dragState = null;
  }
};
