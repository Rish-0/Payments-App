// ============================================================
// transactionForm.js — Transaction Form UI
// ============================================================

import { USERS, MERCHANTS, SCENARIOS } from '../data/mockData.js';
import { VALID_CURRENCIES, VALID_PAYMENT_METHODS } from '../utils/validators.js';

/**
 * Render the transaction form.
 * @param {Function} onSubmit - Callback with form data
 */
export function renderTransactionForm(onSubmit) {
    const container = document.getElementById('transaction-form');
    if (!container) return;

    const allRecipients = [
        ...Object.values(USERS).map(u => ({ id: u.id, name: `${u.name} (${u.id})`, group: 'Users' })),
        ...Object.values(MERCHANTS).map(m => ({ id: m.id, name: `${m.name} (${m.id})`, group: 'Merchants' }))
    ];

    const paymentLabels = {
        'UPI': 'UPI',
        'WALLET_TRANSFER': 'Wallet Transfer',
        'BANK_TRANSFER': 'Bank Transfer',
        'CREDIT_CARD': 'Credit Card',
        'DEBIT_CARD': 'Debit Card',
        'MERCHANT_PAYMENT': 'Merchant Payment',
        'SUBSCRIPTION_PAYMENT': 'Subscription Payment'
    };

    container.innerHTML = `
        <div class="section-header">
            <h3 class="section-title">
                <span class="section-title-icon cyan"></span>
                New Transaction
            </h3>
        </div>

        <form id="txn-form" autocomplete="off">
            <div class="form-group">
                <label for="txn-sender">Sender</label>
                <select id="txn-sender" class="input" required>
                    <option value="">Select sender...</option>
                    ${Object.values(USERS).map(u => `
                        <option value="${u.id}">${u.name} — ₹${u.walletBalance.toLocaleString()} wallet</option>
                    `).join('')}
                </select>
            </div>

            <div class="form-group">
                <label for="txn-recipient">Recipient</label>
                <select id="txn-recipient" class="input" required>
                    <option value="">Select recipient...</option>
                    <optgroup label="Users">
                        ${Object.values(USERS).map(u => `
                            <option value="${u.id}">${u.name} (${u.id})</option>
                        `).join('')}
                    </optgroup>
                    <optgroup label="Merchants">
                        ${Object.values(MERCHANTS).map(m => `
                            <option value="${m.id}">${m.name} ${m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL' ? '⚠️' : ''}</option>
                        `).join('')}
                    </optgroup>
                </select>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="txn-amount">Amount</label>
                    <input type="number" id="txn-amount" class="input" placeholder="0.00" min="1" step="0.01" required />
                </div>
                <div class="form-group">
                    <label for="txn-currency">Currency</label>
                    <select id="txn-currency" class="input" required>
                        ${VALID_CURRENCIES.map(c => `
                            <option value="${c}" ${c === 'INR' ? 'selected' : ''}>${c}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="txn-method">Payment Method</label>
                <select id="txn-method" class="input" required>
                    <option value="">Select method...</option>
                    ${VALID_PAYMENT_METHODS.map(m => `
                        <option value="${m}">${paymentLabels[m] || m}</option>
                    `).join('')}
                </select>
            </div>

            <div id="txn-form-error" class="form-error" style="display:none;"></div>

            <button type="submit" class="btn btn-primary" style="width:100%; margin-top: var(--space-2); padding: var(--space-3);" id="txn-submit-btn">
                ⚡ Process Transaction
            </button>
        </form>

        <div class="divider" style="margin: var(--space-5) 0;"></div>

        <div class="section-header">
            <h4 class="section-title" style="font-size: var(--text-sm);">
                🧪 Quick Scenarios
            </h4>
        </div>

        <div class="scenarios-grid" id="scenarios-grid">
            ${SCENARIOS.map((s, i) => `
                <button class="scenario-btn" data-scenario="${i}" title="${s.description}">
                    <span class="scenario-name">${s.name}</span>
                    <span class="scenario-desc">${s.description}</span>
                </button>
            `).join('')}
        </div>
    `;

    // ── Event Handlers ──
    const form = document.getElementById('txn-form');
    const errorEl = document.getElementById('txn-form-error');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';

        const data = {
            userId: document.getElementById('txn-sender').value,
            recipientId: document.getElementById('txn-recipient').value,
            amount: document.getElementById('txn-amount').value,
            currency: document.getElementById('txn-currency').value,
            paymentMethod: document.getElementById('txn-method').value
        };

        // Basic client-side validation
        if (!data.userId || !data.recipientId || !data.amount || !data.paymentMethod) {
            errorEl.textContent = 'Please fill in all required fields.';
            errorEl.style.display = 'block';
            return;
        }

        if (data.userId === data.recipientId) {
            errorEl.textContent = 'Sender and recipient cannot be the same.';
            errorEl.style.display = 'block';
            return;
        }

        onSubmit(data);
    });

    // Scenario buttons
    document.getElementById('scenarios-grid').addEventListener('click', (e) => {
        const btn = e.target.closest('.scenario-btn');
        if (!btn) return;
        const idx = parseInt(btn.dataset.scenario);
        const scenario = SCENARIOS[idx];
        if (!scenario) return;

        // Fill form
        document.getElementById('txn-sender').value = scenario.data.userId;
        document.getElementById('txn-recipient').value = scenario.data.recipientId;
        document.getElementById('txn-amount').value = scenario.data.amount;
        document.getElementById('txn-currency').value = scenario.data.currency;
        document.getElementById('txn-method').value = scenario.data.paymentMethod;

        // Auto-submit
        onSubmit(scenario.data);
    });
}

/**
 * Set the form's loading state.
 */
export function setFormLoading(loading) {
    const btn = document.getElementById('txn-submit-btn');
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="agent-processing-spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></span> Processing...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '⚡ Process Transaction';
    }
}
