// ============================================================
// dashboard.js — Stats Cards & Transaction Feed Rendering
// ============================================================

import { store } from '../data/store.js';
import { animateCounter, formatCurrency, timeAgo } from '../utils/helpers.js';

/**
 * Render the stats row.
 */
export function renderStats() {
    const stats = store.getStats();

    const statsEl = document.getElementById('stats-row');
    if (!statsEl) return;

    statsEl.innerHTML = `
        <div class="stat-card glass-card hover-lift animate-slide-up stagger-1" data-accent="cyan">
            <div class="stat-card-header">
                <span class="stat-card-label">Total Transactions</span>
                <div class="stat-card-icon cyan">📊</div>
            </div>
            <div class="stat-card-value" id="stat-total">${stats.total}</div>
            <div class="stat-card-sub">All processed transactions</div>
        </div>

        <div class="stat-card glass-card hover-lift animate-slide-up stagger-2" data-accent="green">
            <div class="stat-card-header">
                <span class="stat-card-label">Approval Rate</span>
                <div class="stat-card-icon green">✓</div>
            </div>
            <div class="stat-card-value" id="stat-approval">${stats.approvalRate}%</div>
            <div class="stat-card-sub">${stats.approved} approved of ${stats.total}</div>
        </div>

        <div class="stat-card glass-card hover-lift animate-slide-up stagger-3" data-accent="amber">
            <div class="stat-card-header">
                <span class="stat-card-label">Fraud Blocked</span>
                <div class="stat-card-icon amber">🛡</div>
            </div>
            <div class="stat-card-value" id="stat-blocked">${stats.blocked}</div>
            <div class="stat-card-sub">Transactions blocked</div>
        </div>

        <div class="stat-card glass-card hover-lift animate-slide-up stagger-4" data-accent="red">
            <div class="stat-card-header">
                <span class="stat-card-label">Active Tickets</span>
                <div class="stat-card-icon red">🎫</div>
            </div>
            <div class="stat-card-value" id="stat-tickets">${stats.activeTickets}</div>
            <div class="stat-card-sub">Open support tickets</div>
        </div>
    `;
}

/**
 * Render the transaction feed.
 */
export function renderTransactionFeed() {
    const container = document.getElementById('transaction-feed');
    if (!container) return;

    const transactions = store.getAllTransactions();

    // Update count badge
    const countBadge = document.getElementById('txn-count-badge');
    if (countBadge) countBadge.textContent = `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`;

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="txn-empty">
                <div class="txn-empty-icon">📋</div>
                <p>No transactions yet</p>
                <p style="font-size: var(--text-xs); margin-top: var(--space-2);">
                    Process a payment or select a scenario to get started
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = transactions.map((txn, i) => {
        const statusConfig = getStatusConfig(txn.status);
        return `
            <div class="txn-item animate-slide-right stagger-${Math.min(i + 1, 8)}" data-txn-id="${txn.transaction_id}">
                <div class="txn-icon ${statusConfig.iconClass}">${statusConfig.icon}</div>
                <div class="txn-details">
                    <div class="txn-title">${txn.userName || txn.userId} → ${txn.recipientName || txn.recipientId}</div>
                    <div class="txn-subtitle">${txn.paymentType || txn.paymentMethod} · ${timeAgo(txn.createdAt)}</div>
                </div>
                <div class="txn-amount">
                    <div class="txn-amount-value">${formatCurrency(txn.amount, txn.currency)}</div>
                    <div class="txn-amount-status">
                        <span class="badge ${statusConfig.badgeClass}">${statusConfig.label}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get display configuration for a transaction status.
 */
function getStatusConfig(status) {
    const configs = {
        'APPROVED': { icon: '✓', iconClass: 'approved', badgeClass: 'badge-success', label: 'Approved' },
        'COMPLETED': { icon: '✓', iconClass: 'approved', badgeClass: 'badge-success', label: 'Completed' },
        'BLOCKED': { icon: '✕', iconClass: 'blocked', badgeClass: 'badge-error', label: 'Blocked' },
        'REJECTED': { icon: '✕', iconClass: 'blocked', badgeClass: 'badge-error', label: 'Rejected' },
        'MANUAL_REVIEW': { icon: '👁', iconClass: 'review', badgeClass: 'badge-info', label: 'Review' },
        'OTP_REQUIRED': { icon: '🔑', iconClass: 'pending', badgeClass: 'badge-warning', label: 'OTP' },
        'PENDING_RISK_CHECK': { icon: '⏳', iconClass: 'pending', badgeClass: 'badge-warning', label: 'Pending' },
        'VALIDATION_FAILED': { icon: '✕', iconClass: 'blocked', badgeClass: 'badge-error', label: 'Failed' },
        'INSUFFICIENT_FUNDS': { icon: '💰', iconClass: 'blocked', badgeClass: 'badge-error', label: 'No Funds' },
        'AUTH_FAILED': { icon: '🔒', iconClass: 'blocked', badgeClass: 'badge-error', label: 'Auth Fail' },
        'ACCOUNT_SUSPENDED': { icon: '🚫', iconClass: 'blocked', badgeClass: 'badge-critical', label: 'Suspended' },
        'LIMIT_EXCEEDED': { icon: '📊', iconClass: 'blocked', badgeClass: 'badge-error', label: 'Limit' },
        'DUPLICATE_REQUEST': { icon: '📋', iconClass: 'pending', badgeClass: 'badge-warning', label: 'Duplicate' },
    };
    return configs[status] || { icon: '❓', iconClass: 'pending', badgeClass: 'badge-neutral', label: status };
}

export { getStatusConfig };
