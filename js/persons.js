/* ==========================================
   BUDGET APP — PERSONS MODULE
   ========================================== */

const Persons = {
  searchTerm: '',
  selectedPersonId: null,

  getAll() {
    if (typeof DB === 'undefined') return [];
    return DB.getAll(DB.COLLECTIONS.PERSONS) || [];
  },

  selectPerson(id) {
    this.selectedPersonId = id;
    App.refreshPage();
  },

  clearSelectedPerson() {
    this.selectedPersonId = null;
    App.refreshPage();
  },

  render() {
    const persons = this.getAll();

    // If a specific person is selected, render their Detailed Person Ledger view
    if (this.selectedPersonId) {
      return this.renderPersonDetails(this.selectedPersonId);
    }

    const filtered = Utils.filterBySearch(persons, this.searchTerm, ['name', 'note']);

    // Calculate total money across all persons
    let totalAllPersons = 0;
    const personsWithStats = filtered.map(p => {
      const { breakdown, grandTotal } = Calculations.getPersonBankBreakdown(p.id);
      totalAllPersons += grandTotal;
      return { ...p, breakdown, grandTotal };
    });

    return `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="flex:1;max-width:300px">
            ${Utils.icons.search}
            <input type="text" placeholder="Search persons..." value="${this.searchTerm}" 
                   oninput="Persons.search(this.value)">
          </div>
        </div>
        <div class="toolbar-right flex gap-2">
          <button class="btn btn-primary" onclick="Persons.openAddModal()">
            ${Utils.icons.plus} Add Person
          </button>
        </div>
      </div>

      <!-- Overall Summary Banner -->
      <div class="card p-3 mb-3" style="background:var(--bg-card); border-radius:var(--radius-md); text-align:center;">
        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Total Money Across All Persons</div>
        <div style="font-size:1.6rem; font-weight:800; color:var(--accent); margin-top:2px">${Utils.formatCurrency(totalAllPersons)}</div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state" style="padding:40px 20px;text-align:center">
          <div style="font-size:36px;margin-bottom:8px">👥</div>
          <h3 style="font-size:1rem;margin-bottom:4px">No Persons Found</h3>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:0">Add persons/family members to track their money breakdown across accounts</p>
        </div>
      ` : `
        <div class="table-container mt-3" style="max-width:550px">
          <table class="data-table">
            <thead>
              <tr>
                <th>Person Name</th>
                <th class="text-right" style="width:140px">Total Balance</th>
                <th class="text-right" style="width:90px">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${personsWithStats.map(p => `
                <tr style="cursor:pointer" onclick="Persons.selectPerson('${p.id}')" title="Click to view ledger">
                  <td>
                    <div class="font-bold flex items-center gap-2">
                      <span style="font-size:1.2rem">👤</span>
                      <div>
                        <div>${Utils.escapeHtml(p.name)}</div>
                        ${p.note ? `<div class="text-muted" style="font-size:0.75rem">${Utils.escapeHtml(p.note)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td class="text-right font-bold" style="font-size:1.05rem; color:${p.grandTotal >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    ${Utils.formatCurrency(p.grandTotal)}
                  </td>
                  <td class="text-right" onclick="event.stopPropagation()">
                    <div class="table-actions" style="justify-content:flex-end">
                      <button class="btn btn-ghost btn-icon" onclick="Persons.openEditModal('${p.id}')" title="Edit">${Utils.icons.edit}</button>
                      <button class="btn btn-ghost btn-icon text-danger" onclick="Persons.deletePerson('${p.id}')" title="Delete">${Utils.icons.trash}</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  renderPersonDetails(personId) {
    const person = DB.getById(DB.COLLECTIONS.PERSONS, personId);
    if (!person) {
      this.selectedPersonId = null;
      return this.render();
    }

    const { breakdown, grandTotal } = Calculations.getPersonBankBreakdown(personId);
    const transactions = Calculations.getPersonTransactions(personId);

    return `
      <div class="toolbar mb-3">
        <div class="toolbar-left">
          <button class="btn btn-outline btn-sm" onclick="Persons.clearSelectedPerson()">
            ⬅️ Back to All Persons
          </button>
        </div>
        <div class="toolbar-right flex gap-2">
          <button class="btn btn-ghost btn-icon" onclick="Persons.openEditModal('${person.id}')" title="Edit">${Utils.icons.edit}</button>
          <button class="btn btn-ghost btn-icon text-danger" onclick="Persons.deletePerson('${person.id}')" title="Delete">${Utils.icons.trash}</button>
        </div>
      </div>

      <!-- Person Total Summary Card -->
      <div class="card p-3 mb-3" style="background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border)">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
              <span style="font-size:1.6rem">👤</span>
              <h2 style="font-size:1.4rem; font-weight:800; margin:0">${Utils.escapeHtml(person.name)}</h2>
            </div>
            ${person.note ? `<p class="text-muted" style="margin:0; font-size:0.85rem">${Utils.escapeHtml(person.note)}</p>` : ''}
          </div>

          <div style="text-align:right">
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Total Money Across All Banks</div>
            <div style="font-size:1.8rem; font-weight:800; color:${grandTotal >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-top:2px">
              ${Utils.formatCurrency(grandTotal)}
            </div>
          </div>
        </div>

        <!-- Bank-wise breakdown pills -->
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border)">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:8px">🏦 Bank-wise Breakdown</div>
          ${breakdown.length === 0 ? `
            <span class="text-muted" style="font-size:0.85rem">Is person ka kisi bank me balance nahi hai.</span>
          ` : `
            <div style="display:flex; flex-wrap:wrap; gap:8px">
              ${breakdown.map(b => `
                <div style="padding:6px 12px; background:rgba(255,255,255,0.05); border-radius:var(--radius-sm); border:1px solid var(--border); display:flex; gap:8px; align-items:center">
                  <span style="font-size:0.85rem">🏦 <b>${Utils.escapeHtml(b.accountName)}:</b></span>
                  <span style="font-weight:700; font-size:0.9rem; color:${b.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(b.balance)}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Person Transactions History -->
      <div class="card p-3">
        <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px">🧾 Transactions History for ${Utils.escapeHtml(person.name)}</h3>
        ${transactions.length === 0 ? `
          <div class="empty-state" style="padding:30px 20px;text-align:center">
            <div style="font-size:32px;margin-bottom:8px">🧾</div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0">No transactions recorded for this person yet.</p>
          </div>
        ` : `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="text-center">Date</th>
                  <th class="text-center">Account</th>
                  <th class="text-center">Type</th>
                  <th class="text-center">Amount</th>
                  <th class="text-center">Notes</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => {
                  let accDisplay = '-';
                  let amt = 0;
                  let isInc = t.type === 'income';

                  if (t.accounts && Array.isArray(t.accounts)) {
                    const accEntry = t.accounts.find(a => String(a.personId) === String(personId));
                    if (accEntry) {
                      const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, accEntry.accountId);
                      accDisplay = acc ? acc.name : (accEntry.accountName || '-');
                      amt = parseFloat(accEntry.amount) || 0;
                      isInc = (accEntry.type || t.type) === 'income';
                    }
                  } else {
                    const acc = DB.getById(DB.COLLECTIONS.ACCOUNTS, t.accountId);
                    accDisplay = acc ? acc.name : (t.accountName || '-');
                    amt = Calculations.getItemAmount(t);
                  }

                  return `
                    <tr>
                      <td class="text-center">${Utils.formatDate(t.date)}</td>
                      <td class="text-center"><b>${Utils.escapeHtml(accDisplay)}</b></td>
                      <td class="text-center">
                        <span class="badge ${isInc ? 'badge-success' : 'badge-danger'}">
                          ${isInc ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td class="text-center">
                        <span class="amount ${isInc ? 'credit' : 'debit'}">
                          ${isInc ? '+' : '-'}${Utils.formatCurrency(amt)}
                        </span>
                      </td>
                      <td class="text-center">${t.notes ? Utils.escapeHtml(t.notes) : '-'}</td>
                      <td class="text-center">
                        <div class="table-actions" style="justify-content:center">
                          <button class="btn btn-ghost btn-icon" onclick="Transactions.openEditModal('${t.type}', '${t.id}')" title="Edit">${Utils.icons.edit}</button>
                          <button class="btn btn-ghost btn-icon text-danger" onclick="Transactions.deleteTransaction('${t.type}', '${t.id}')" title="Delete">${Utils.icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  search(term) {
    this.searchTerm = term;
    App.refreshPage();
  },

  openAddModal() {
    App.showModal('👤 Add Person', this._form());
  },

  openEditModal(id) {
    const person = DB.getById(DB.COLLECTIONS.PERSONS, id);
    if (!person) return;
    App.showModal('✏️ Edit Person', this._form(person));
  },

  _form(person = null) {
    const isEdit = person !== null;
    return `
      <form autocomplete="off" onsubmit="Persons.save(event, ${isEdit ? `'${person.id}'` : 'null'})">
        <div class="form-group mb-3">
          <label class="form-label">Person Name <span class="text-danger">*</span></label>
          <input type="text" class="form-input" name="name" placeholder="e.g. Ramesh, Suresh, Partner, etc." value="${isEdit ? Utils.escapeHtml(person.name) : ''}" required>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Note / Description (Optional)</label>
          <input type="text" class="form-input" name="note" placeholder="Family member, Business Partner, etc." value="${isEdit ? Utils.escapeHtml(person.note || '') : ''}">
        </div>
        <div class="modal-footer" style="padding-top:12px; border-top:1px solid var(--border)">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : '👤 Save Person'}</button>
        </div>
      </form>
    `;
  },

  save(e, id) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const note = form.note.value.trim();

    if (!name) {
      App.toast('Please enter a person name', 'warning');
      return;
    }

    if (id) {
      DB.update(DB.COLLECTIONS.PERSONS, id, { name, note });
      App.toast('Person updated successfully', 'success');
    } else {
      DB.add(DB.COLLECTIONS.PERSONS, { name, note });
      App.toast('Person added successfully', 'success');
    }

    App.closeModal();
    App.refreshPage();
  },

  deletePerson(id) {
    const person = DB.getById(DB.COLLECTIONS.PERSONS, id);
    if (!person) return;
    if (confirm(`Are you sure you want to delete person "${person.name}"?`)) {
      DB.delete(DB.COLLECTIONS.PERSONS, id);
      if (this.selectedPersonId === id) this.selectedPersonId = null;
      App.toast('Person deleted', 'info');
      App.refreshPage();
    }
  }
};
