/* ==========================================
   BUDGET APP — DATABASE LAYER (localStorage)
   ========================================== */

const DB = {
  // Collection names
  COLLECTIONS: {
    INCOMES: 'budget_incomes',
    EXPENSES: 'budget_expenses',
    CATEGORIES: 'budget_categories',
    ACCOUNTS: 'budget_accounts',
    PERSONS: 'budget_persons',
    SETTINGS: 'budget_settings',
    COUNTERS: 'budget_counters'
  },

  // ========== GENERIC CRUD ==========

  // Get all items from a collection
  getAll(collection) {
    try {
      const data = localStorage.getItem(collection);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`DB.getAll error for ${collection}:`, e);
      return [];
    }
  },

  // Get single item by ID
  getById(collection, id) {
    if (!id) return null;
    const targetId = typeof id === 'object' ? (id.id || id) : id;
    const items = this.getAll(collection);
    return items.find(item => String(item.id) === String(targetId)) || null;
  },

  // Add new item
  add(collection, item) {
    const items = this.getAll(collection);
    const newItem = {
      ...item,
      id: item.id || Utils.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newItem);
    this._save(collection, items);
    return newItem;
  },

  // Update existing item
  update(collection, id, updates) {
    if (!id) return null;
    const targetId = typeof id === 'object' ? (id.id || id) : id;
    const items = this.getAll(collection);
    const index = items.findIndex(item => String(item.id) === String(targetId));
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      ...updates,
      id: items[index].id,
      createdAt: items[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    this._save(collection, items);
    return items[index];
  },

  // Delete item by ID
  delete(collection, id) {
    if (!id) return false;
    const targetId = typeof id === 'object' ? (id.id || id) : id;
    let items = this.getAll(collection);
    items = items.filter(item => String(item.id) !== String(targetId));
    this._save(collection, items);
    return true;
  },

  // Save to localStorage
  _save(collection, data) {
    try {
      localStorage.setItem(collection, JSON.stringify(data));
      // Auto-sync to cloud if logged in
      if (typeof Sync !== 'undefined') {
        Sync.onDataChange(collection);
      }
    } catch (e) {
      console.error(`DB save error for ${collection}:`, e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage full! Please export your data and clear some old records.');
      }
    }
  },

  // ========== SETTINGS ==========

  getSettings() {
    try {
      const data = localStorage.getItem(this.COLLECTIONS.SETTINGS);
      return data ? JSON.parse(data) : this.defaultSettings();
    } catch (e) {
      return this.defaultSettings();
    }
  },

  saveSettings(settings) {
    localStorage.setItem(this.COLLECTIONS.SETTINGS, JSON.stringify(settings));
    if (typeof Sync !== 'undefined') {
      Sync.onDataChange(this.COLLECTIONS.SETTINGS);
    }
  },

  defaultSettings() {
    return {
      businessName: 'My Business',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      gstin: '',
      state: '',
      bankName: '',
      accountNumber: '',
      ifscCode: ''
    };
  },

  // ========== COUNTERS ==========

  getCounter(type) {
    try {
      const counters = JSON.parse(localStorage.getItem(this.COLLECTIONS.COUNTERS) || '{}');
      return counters[type] || 0;
    } catch (e) {
      return 0;
    }
  },

  incrementCounter(type) {
    try {
      const counters = JSON.parse(localStorage.getItem(this.COLLECTIONS.COUNTERS) || '{}');
      counters[type] = (counters[type] || 0) + 1;
      localStorage.setItem(this.COLLECTIONS.COUNTERS, JSON.stringify(counters));
      return counters[type];
    } catch (e) {
      return 1;
    }
  },

  // ========== INVENTORY HELPERS ==========

  updateStock(itemId, quantityChange) {
    const item = this.getById(this.COLLECTIONS.ITEMS, itemId);
    if (!item) return;
    const newQty = Utils.parseNum(item.quantity) + quantityChange;
    this.update(this.COLLECTIONS.ITEMS, itemId, { quantity: Math.max(0, newQty) });
  },

  getLowStockItems(threshold = 10) {
    return this.getAll(this.COLLECTIONS.ITEMS).filter(item =>
      Utils.parseNum(item.quantity) <= threshold && Utils.parseNum(item.quantity) >= 0
    );
  },

  // ========== DASHBOARD HELPERS ==========

  getDashboardStats(startDate, endDate) {
    if (!startDate || !endDate) {
      const range = Utils.getDateRange('month');
      startDate = range.start;
      endDate = range.end;
    }
    
    const incomes = this.getAll(this.COLLECTIONS.INCOMES).map(i => ({...i, type: 'income'}));
    const expenses = this.getAll(this.COLLECTIONS.EXPENSES).map(e => ({...e, type: 'expense'}));

    const allTrans = [...incomes, ...expenses].filter(t => 
      t.date >= startDate && 
      t.date <= endDate
    );

    let totals = { totalIncome: 0, totalExpense: 0, netProfit: 0 };
    if (typeof Calculations !== 'undefined') {
      totals = Calculations.getMainTransactionTotals(allTrans);
    }

    return {
      totalIncome: totals.totalIncome,
      totalExpense: totals.totalExpense,
      totalBalance: totals.totalIncome - totals.totalExpense,
      incomeCount: allTrans.filter(t => t.type === 'income').length,
      expenseCount: allTrans.filter(t => t.type === 'expense').length
    };
  },

  // ========== EXPORT / IMPORT ==========

  exportAll() {
    const data = {};
    Object.values(this.COLLECTIONS).forEach(col => {
      data[col] = localStorage.getItem(col);
    });
    return JSON.stringify(data, null, 2);
  },

  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.keys(data).forEach(key => {
        if (data[key]) {
          localStorage.setItem(key, data[key]);
        }
      });
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  },

  clearAll() {
    Object.values(this.COLLECTIONS).forEach(col => {
      localStorage.removeItem(col);
    });
  },

  // ========== SEED DEMO DATA ==========

  seedDemoData() {
    if (this.getAll(this.COLLECTIONS.ACCOUNTS).length > 0) return;

    // Sample Accounts
    const sbi = this.add(this.COLLECTIONS.ACCOUNTS, { name: 'SBI Current Account', type: 'bank', balance: 125000, bankName: 'State Bank of India', accountNumber: '30982347123' });
    const paytm = this.add(this.COLLECTIONS.ACCOUNTS, { name: 'Paytm Business Wallet', type: 'wallet', balance: 18500, bankName: 'Paytm Payments Bank', accountNumber: '9876543210' });
    const cash = this.add(this.COLLECTIONS.ACCOUNTS, { name: 'Cash Pocket', type: 'pocket', balance: 5400, bankName: 'Cash', accountNumber: '' });
    const hdfc = this.add(this.COLLECTIONS.ACCOUNTS, { name: 'HDFC Savings', type: 'savings', balance: 45000, bankName: 'HDFC Bank', accountNumber: '5010023912' });

    // Sample Incomes
    const incomes = [
      { amount: 45000, date: Utils.today(), accountId: sbi.id, accountName: sbi.name, notes: 'Client project payment' },
      { amount: 15000, date: Utils.today(), accountId: paytm.id, accountName: paytm.name, notes: 'Design work' },
      { amount: 2000, date: Utils.today(), accountId: cash.id, accountName: cash.name, notes: 'Cash sale' }
    ];
    incomes.forEach(inc => this.add(this.COLLECTIONS.INCOMES, inc));

    // Sample Expenses
    const expenses = [
      { amount: 12000, date: Utils.today(), accountId: sbi.id, accountName: sbi.name, notes: 'Office rent' },
      { amount: 2500, date: Utils.today(), accountId: paytm.id, accountName: paytm.name, notes: 'Electricity bill' },
      { amount: 800, date: Utils.today(), accountId: cash.id, accountName: cash.name, notes: 'Tea & Snacks' }
    ];
    expenses.forEach(exp => this.add(this.COLLECTIONS.EXPENSES, exp));
  }
};
