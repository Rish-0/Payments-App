// ============================================================
// store.js — In-Memory Transaction & Ticket Store
// ============================================================

import { generateId } from '../utils/helpers.js';

class TransactionStore {
    constructor() {
        /** @type {Map<string, object>} transaction_id -> transaction */
        this.transactions = new Map();
        /** @type {Map<string, object>} ticket_id -> ticket */
        this.tickets = new Map();
        /** @type {Array<object>} audit log entries */
        this.auditLog = [];
        /** @type {Map<string, number>} userId -> last transaction count for stats */
        this.userTransactionCounts = new Map();
    }

    // ─── Transactions ───────────────────────────────────

    /**
     * Add a transaction to the store.
     * @param {object} txn
     * @returns {object} the stored transaction
     */
    addTransaction(txn) {
        this.transactions.set(txn.transaction_id, {
            ...txn,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Update user tx count
        const count = this.userTransactionCounts.get(txn.userId) || 0;
        this.userTransactionCounts.set(txn.userId, count + 1);

        this.log('TRANSACTION_CREATED', txn.transaction_id, txn);
        return txn;
    }

    /**
     * Update a transaction's status.
     */
    updateTransactionStatus(txnId, status, details = {}) {
        const txn = this.transactions.get(txnId);
        if (!txn) return null;
        txn.status = status;
        txn.updatedAt = new Date().toISOString();
        Object.assign(txn, details);
        this.log('TRANSACTION_UPDATED', txnId, { status, ...details });
        return txn;
    }

    /**
     * Get a transaction by ID.
     */
    getTransaction(txnId) {
        return this.transactions.get(txnId) || null;
    }

    /**
     * Get all transactions for a user (as sender).
     */
    getUserTransactions(userId) {
        const results = [];
        for (const txn of this.transactions.values()) {
            if (txn.userId === userId) results.push(txn);
        }
        return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get all transactions, newest first.
     */
    getAllTransactions() {
        return Array.from(this.transactions.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get aggregate stats.
     */
    getStats() {
        const all = Array.from(this.transactions.values());
        const approved = all.filter(t => t.status === 'APPROVED' || t.status === 'COMPLETED');
        const blocked = all.filter(t => t.status === 'BLOCKED' || t.status === 'REJECTED');
        const pending = all.filter(t => t.status === 'PENDING' || t.status === 'MANUAL_REVIEW' || t.status === 'OTP_REQUIRED');
        const totalAmount = approved.reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
            total: all.length,
            approved: approved.length,
            blocked: blocked.length,
            pending: pending.length,
            approvalRate: all.length > 0 ? ((approved.length / all.length) * 100).toFixed(1) : '0.0',
            totalAmount,
            activeTickets: this.getOpenTickets().length
        };
    }

    // ─── Support Tickets ────────────────────────────────

    /**
     * Create a support ticket.
     */
    createTicket(ticket) {
        const id = generateId('TKT');
        const full = {
            ...ticket,
            ticket_id: id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: ticket.messages || []
        };
        this.tickets.set(id, full);
        this.log('TICKET_CREATED', id, full);
        return full;
    }

    /**
     * Update ticket status.
     */
    updateTicket(ticketId, updates) {
        const ticket = this.tickets.get(ticketId);
        if (!ticket) return null;
        Object.assign(ticket, updates, { updatedAt: new Date().toISOString() });
        this.log('TICKET_UPDATED', ticketId, updates);
        return ticket;
    }

    /**
     * Get a ticket by ID.
     */
    getTicket(ticketId) {
        return this.tickets.get(ticketId) || null;
    }

    /**
     * Get all open tickets.
     */
    getOpenTickets() {
        return Array.from(this.tickets.values())
            .filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    }

    /**
     * Get all tickets.
     */
    getAllTickets() {
        return Array.from(this.tickets.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // ─── Audit Log ──────────────────────────────────────

    /**
     * Add an audit log entry.
     */
    log(action, referenceId, data) {
        this.auditLog.push({
            timestamp: new Date().toISOString(),
            action,
            referenceId,
            data: JSON.parse(JSON.stringify(data))
        });
        // Keep only last 500 entries
        if (this.auditLog.length > 500) {
            this.auditLog = this.auditLog.slice(-500);
        }
    }

    /**
     * Get recent audit log entries.
     */
    getRecentLogs(count = 20) {
        return this.auditLog.slice(-count).reverse();
    }
}

// Singleton instance
export const store = new TransactionStore();
