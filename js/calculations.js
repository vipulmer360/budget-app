/* ==========================================
   BUDGET APP — CALCULATIONS MODULE
   ========================================== */

const Calculations = {

  /**
   * Determine the effective amount of a transaction.
   * If amount is specified and valid, it is used. Otherwise price is used.
   */
  getItemAmount(t) {
    if (t.amount !== undefined && t.amount !== null && t.amount !== '') {
      const a = parseFloat(t.amount);
      if (!isNaN(a)) return Math.abs(a);
    }
    const p = parseFloat(t.price);
    if (!isNaN(p) && p !== 0) return Math.abs(p);
    return 0;
  },

  /**
   * Get the specific details (amount and type) for an account in a transaction
   */
  getAccountDetails(t, accountId) {
    if (t.accounts && Array.isArray(t.accounts)) {
      const accEntry = t.accounts.find(a => String(a.accountId) === String(accountId));
      if (accEntry) return { amount: parseFloat(accEntry.amount) || 0, type: accEntry.type || t.type };
    }
    // Fallback to legacy single account
    if (t.accountId && String(t.accountId) === String(accountId)) {
      return { amount: this.getItemAmount(t), type: t.type };
    }
    return { amount: 0, type: t.type };
  },

  /**
   * Get all transactions associated with a specific account
   */
  getAccountTransactions(accountId) {
    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, accountId);
    if (!acc) return [];

    const incomes = DB.getAll(DB.COLLECTIONS.INCOMES).map(i => ({ ...i, type: 'income' }));
    const expenses = DB.getAll(DB.COLLECTIONS.EXPENSES).map(e => ({ ...e, type: 'expense' }));
    const all = [...incomes, ...expenses];

    const accNameLower = String(acc.name || '').trim().toLowerCase();

    return all.filter(t => {
      // Match by new accounts array
      if (t.accounts && Array.isArray(t.accounts)) {
        if (t.accounts.some(a => String(a.accountId) === String(accountId))) return true;
      }
      // Match by legacy accountId (exact)
      if (t.accountId && String(t.accountId) === String(accountId)) return true;
      // Match by legacy accountName (case-insensitive exact)
      if (t.accountName && String(t.accountName).trim().toLowerCase() === accNameLower) return true;
      return false;
    });
  },

  /**
   * Calculate the total balance for an account
   */
  getAccountBalance(accountId) {
    const trans = this.getAccountTransactions(accountId);
    let balance = 0;
    trans.forEach(t => {
      const details = this.getAccountDetails(t, accountId);
      if (details.type === 'income') balance += details.amount;
      else if (details.type === 'expense') balance -= details.amount;
    });
    return balance;
  },

  /**
   * Calculate day totals for a group of items
   * @param {Array} items - List of transactions for a specific day
   */
  getDayTotals(items, options = {}) {
    const accountId = options.accountId;
    
    // Exclude settlement entries entirely from day PNL
    let calcItems = items.filter(t => !t.isSettlement);

    let dayRevenue = 0;
    let dayCost = 0;

    calcItems.forEach(t => {
      let tRevenue = 0;
      let tCost = 0;

      // Net Account Values
      let accIncome = 0;
      let accExpense = 0;
      
      if (t.accounts && t.accounts.length > 0) {
        t.accounts.forEach(a => {
          // Exclude personal accounts
          const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, a.accountId);
          if (acc && acc.isPersonal) return; 

          if (accountId && String(a.accountId) !== String(accountId)) return;

          if (a.type === 'income') accIncome += (parseFloat(a.amount) || 0);
          else accExpense += (parseFloat(a.amount) || 0);
        });
      } else if (t.accountId) {
        const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, t.accountId);
        if (!(acc && acc.isPersonal)) {
          if (!accountId || String(t.accountId) === String(accountId)) {
            const amount = this.getItemAmount(t);
            if (t.type === 'income') accIncome += amount;
            else accExpense += amount;
          }
        }
      }

      tRevenue += accIncome;
      tCost += accExpense;

      dayRevenue += tRevenue;
      dayCost += tCost;
    });

    return {
      dayRevenue,
      dayCost,
      dayProfitLoss: dayRevenue - dayCost,
      dayTotalAmount: dayRevenue,
      dayTotalPrice: dayCost
    };
  },

  /**
   * Calculate overall totals for the main transactions view
   * @param {Array} allTrans - All visible transactions
   */
  getMainTransactionTotals(allTrans) {
    const totals = this.getDayTotals(allTrans);
    return {
      totalIncome: totals.dayRevenue,
      totalExpense: totals.dayCost,
      netProfit: totals.dayProfitLoss
    };
  }
};
