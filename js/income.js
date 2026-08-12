/* ==========================================
   BUDGET APP — INCOME MODULE
   ========================================== */

const Income = {
  accountsList: [],

  openModal(record = null) {
    const isEdit = record !== null;
    const showInMainDefault = true;

    // Get sticky account type
    const stickyAccType = localStorage.getItem('budget_sticky_inc_acc_type') || 'income';

    // Initialize accounts array
    if (record && record.accounts && record.accounts.length > 0) {
      this.accountsList = JSON.parse(JSON.stringify(record.accounts));
      this.accountsList.forEach(a => { if (!a.type) a.type = 'income'; });
    } else if (record && record.accountId) {
      this.accountsList = [{ accountId: record.accountId, amount: record.amount, type: 'income' }];
    } else {
      this.accountsList = [{ accountId: '', amount: 0, type: stickyAccType }];
    }

    App.showModal(
      isEdit ? '✏️ Modify Income' : '💵 Add Income',
      `
      <form id="incomeForm" autocomplete="off" onsubmit="Income.save(event, ${isEdit ? `'${record.id}'` : 'null'})">
        <input type="hidden" name="transType" value="income">

        <!-- Accounts Container -->
        <div style="margin-bottom:12px; border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px; background:rgba(255,255,255,0.02)">
          <label class="form-label" style="margin-bottom:8px; font-size:0.8rem; font-weight:700">Accounts & Amounts</label>
          <div id="incomeAccountsContainer"></div>
        </div>

        <!-- Date & Notes -->
        <div style="display:flex; gap:12px; margin-bottom:12px">
          <div style="flex:1; max-width:130px">
            <label class="form-label" style="margin-bottom:6px; font-size:0.75rem">Date</label>
            <input type="date" class="form-input" name="date" value="${isEdit ? record.date : (localStorage.getItem('budget_sticky_date') || Utils.today())}" >
          </div>
          <div style="flex:1">
            <label class="form-label" style="margin-bottom:6px; font-size:0.75rem">Notes / Description</label>
            <input type="text" class="form-input" name="notes" placeholder="Salary, Interest, Rent, etc..." value="${isEdit ? Utils.escapeHtml(record.notes || '') : ''}" >
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border); margin-bottom:12px">
          <label class="flex items-center gap-2" style="cursor:pointer;font-size:0.8rem;margin:0">
            <input type="checkbox" name="showInMain" value="true" ${showInMainDefault ? 'checked' : ''}>
            <span>👁️ Main Transactions list me dikhayein</span>
          </label>
        </div>

        <div class="modal-footer" style="padding:12px 0 0;border-top:1px solid var(--border); margin-top:0">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-success">${isEdit ? 'Save Changes' : '💵 Save Income'}</button>
        </div>
      </form>
    `
    );

    this.renderAccountRows();
  },

  renderAccountRows() {
    const container = document.getElementById('incomeAccountsContainer');
    if (!container) return;
    const allAccounts = DB.getAll(DB.COLLECTIONS.ACCOUNTS);
    
    let html = '';
    this.accountsList.forEach((accItem, idx) => {
      html += `
        <div style="display:flex; gap:6px; margin-bottom:8px; align-items:center;">
          <div style="width:50px">
            <select class="form-select" style="font-weight:bold; color: ${accItem.type === 'income' ? 'var(--success)' : 'var(--danger)'}" onchange="Income.updateAccountRow(${idx}, 'type', this.value)">
              <option value="income" ${accItem.type === 'income' ? 'selected' : ''}>I</option>
              <option value="expense" ${accItem.type === 'expense' ? 'selected' : ''}>E</option>
            </select>
          </div>
          <div style="flex:2">
            <select class="form-select" onchange="Income.updateAccountRow(${idx}, 'accountId', this.value)">
              <option value="">-- Select Account --</option>
              ${allAccounts.map(a => `<option value="${a.id}" ${a.id === accItem.accountId ? 'selected' : ''}>${Utils.escapeHtml(a.name)}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1">
            <input type="number" step="1" min="0" class="form-input" placeholder="Amount" value="${accItem.amount || ''}" oninput="Income.updateAccountRow(${idx}, 'amount', this.value)">
          </div>
          ${this.accountsList.length > 1 ? `
            <button type="button" class="btn btn-ghost btn-icon" style="color:var(--danger); padding:0 4px" onclick="Income.removeAccountRow(${idx})">✖</button>
          ` : `<div style="width:24px"></div>`}
        </div>
      `;
    });
    
    html += `<button type="button" class="btn btn-outline btn-sm mt-1" onclick="Income.addAccountRow()">+ Add Another Account</button>`;
    container.innerHTML = html;
  },

  updateAccountRow(idx, field, value) {
    if (field === 'amount') {
      this.accountsList[idx].amount = parseFloat(value) || 0;
    } else if (field === 'type') {
      this.accountsList[idx].type = value;
      localStorage.setItem('budget_sticky_inc_acc_type', value);
      this.renderAccountRows();
    } else {
      this.accountsList[idx].accountId = value;
    }
  },

  addAccountRow() {
    const stickyType = localStorage.getItem('budget_sticky_inc_acc_type') || 'income';
    this.accountsList.push({ accountId: '', amount: 0, type: stickyType });
    this.renderAccountRows();
  },

  removeAccountRow(idx) {
    this.accountsList.splice(idx, 1);
    this.renderAccountRows();
  },

  save(e, existingId = null) {
    e.preventDefault();
    const form = new FormData(e.target);

    // Prepare valid accounts array
    const validAccounts = this.accountsList.filter(a => a.accountId && a.amount > 0).map(a => {
      const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, a.accountId);
      return { 
        accountId: a.accountId, 
        accountName: acc ? acc.name : '', 
        amount: a.amount,
        type: a.type
      };
    });

    if (validAccounts.length === 0) {
      App.toast('Please select an Account and enter Amount!', 'warning');
      return;
    }

    const totalAmount = validAccounts.reduce((sum, a) => sum + (a.type === 'income' ? a.amount : -a.amount), 0);
    const entryDate = form.get('date') || Utils.today();
    localStorage.setItem('budget_sticky_date', entryDate);

    const updatedData = {
      type: 'income',
      amount: totalAmount,
      date: entryDate,
      accounts: validAccounts,
      notes: form.get('notes') || ''
    };

    // Revert old account balances if editing
    if (existingId) {
      const oldRecord = DB.getById(DB.COLLECTIONS.INCOMES, existingId) || DB.getById(DB.COLLECTIONS.EXPENSES, existingId);
      if (oldRecord) {
        const isOldIncome = DB.getById(DB.COLLECTIONS.INCOMES, existingId) !== null;
        const oldAccounts = oldRecord.accounts || [];
        
        oldAccounts.forEach(oldAcc => {
          if (oldAcc.accountId) {
            const accObj = DB.getById(DB.COLLECTIONS.ACCOUNTS, oldAcc.accountId);
            if (accObj) {
              const revertChange = (oldAcc.type || (isOldIncome ? 'income' : 'expense')) === 'income' ? -Utils.parseNum(oldAcc.amount) : Utils.parseNum(oldAcc.amount);
              DB.update(DB.COLLECTIONS.ACCOUNTS, oldAcc.accountId, {
                balance: Utils.parseNum(accObj.balance) + revertChange
              });
            }
          }
        });
      }
    }

    // Apply new account balance updates
    validAccounts.forEach(accItem => {
      const accObj = DB.getById(DB.COLLECTIONS.ACCOUNTS, accItem.accountId);
      if (accObj) {
        const change = accItem.type === 'income' ? Utils.parseNum(accItem.amount) : -Utils.parseNum(accItem.amount);
        DB.update(DB.COLLECTIONS.ACCOUNTS, accItem.accountId, {
          balance: Utils.parseNum(accObj.balance) + change
        });
      }
    });

    if (existingId) {
      DB.update(DB.COLLECTIONS.INCOMES, existingId, updatedData);
      App.toast('Income entry updated! 💵', 'success');
    } else {
      DB.add(DB.COLLECTIONS.INCOMES, updatedData);
      App.toast('Income entry saved! 💵', 'success');
    }

    App.closeModal();
    App.refreshPage();
  }
};
