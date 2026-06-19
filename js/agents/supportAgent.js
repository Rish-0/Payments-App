// ============================================================
// supportAgent.js — Customer Support & Dispute Resolution Agent
// ============================================================

import { generateId } from '../utils/helpers.js';
import { store } from '../data/store.js';
import { USERS } from '../data/mockData.js';

export class CustomerSupportAgent {
    constructor() {
        this.name = 'Customer Support';
    }

    /**
     * Handle a user support query.
     * @param {string} message - The user's message
     * @param {object} context - Optional context (userId, txnId)
     * @returns {object} Agent response JSON
     */
    async handleQuery(message, context = {}) {
        const lowerMsg = message.toLowerCase().trim();
        const category = this._categorize(lowerMsg);
        const userId = context.userId || null;

        switch (category) {
            case 'REFUND_REQUEST':
                return this._handleRefund(lowerMsg, context);
            case 'PAYMENT_FAILURE':
                return this._handlePaymentFailure(lowerMsg, context);
            case 'FRAUD_COMPLAINT':
                return this._handleFraudComplaint(lowerMsg, context);
            case 'ACCOUNT_ISSUE':
                return this._handleAccountIssue(lowerMsg, context);
            case 'INFORMATION_REQUEST':
                return this._handleInfoRequest(lowerMsg, context);
            case 'ESCALATION_REQUIRED':
                return this._handleEscalation(lowerMsg, context);
            default:
                return this._handleGeneral(lowerMsg, context);
        }
    }

    /**
     * Categorize a user message into an issue type.
     */
    _categorize(msg) {
        const patterns = {
            REFUND_REQUEST: /refund|money back|return|reversal|chargeback|reverse/,
            PAYMENT_FAILURE: /fail|error|declined|reject|not going through|couldn't pay|payment issue|stuck|timeout/,
            FRAUD_COMPLAINT: /fraud|unauthorized|didn't make|stolen|hacked|suspicious|scam|not me/,
            ACCOUNT_ISSUE: /account|login|password|locked|suspended|blocked|kyc|verify/,
            ESCALATION_REQUIRED: /escalat|manager|supervisor|complaint|unresolved|not resolved|urgent/,
            INFORMATION_REQUEST: /status|track|where|when|how|check|history|receipt|detail/
        };

        for (const [category, pattern] of Object.entries(patterns)) {
            if (pattern.test(msg)) return category;
        }

        return 'INFORMATION_REQUEST';
    }

    // ─── Issue Handlers ─────────────────────────────────

    _handleRefund(msg, context) {
        // Try to find transaction reference in message
        const txnMatch = msg.match(/txn-[a-z0-9]+/i);
        const txnId = txnMatch ? txnMatch[0].toUpperCase() : context.txnId || null;

        if (txnId) {
            const txn = store.getTransaction(txnId);
            if (txn) {
                // Check refund eligibility
                const isApproved = txn.status === 'APPROVED' || txn.status === 'COMPLETED';
                const ageHours = (Date.now() - new Date(txn.createdAt).getTime()) / 3600000;
                const eligible = isApproved && ageHours < 168; // 7 days

                const ticket = store.createTicket({
                    userId: context.userId,
                    issue_type: 'REFUND_REQUEST',
                    status: eligible ? 'REFUND_INITIATED' : 'UNDER_REVIEW',
                    relatedTxnId: txnId,
                    priority: 'MEDIUM'
                });

                return {
                    agent: 'Customer Support',
                    ticket_id: ticket.ticket_id,
                    issue_type: 'REFUND_REQUEST',
                    status: eligible ? 'REFUND_INITIATED' : 'UNDER_REVIEW',
                    resolution: eligible
                        ? `Refund of ₹${txn.amount.toLocaleString()} for transaction ${txnId} has been initiated. The amount will be credited back within 5-7 business days.`
                        : `Transaction ${txnId} is under review for refund eligibility. Status: ${txn.status}. Our team will review this within 24 hours.`,
                    estimated_resolution_time: eligible ? '5-7 business days' : '24-48 hours',
                    next_action: eligible
                        ? 'Refund is being processed. You will receive a confirmation via email.'
                        : 'Our team will contact you with an update. Please keep your ticket ID for reference.'
                };
            }
        }

        // No transaction found
        const ticket = store.createTicket({
            userId: context.userId,
            issue_type: 'REFUND_REQUEST',
            status: 'PENDING_INFO',
            priority: 'MEDIUM'
        });

        return {
            agent: 'Customer Support',
            ticket_id: ticket.ticket_id,
            issue_type: 'REFUND_REQUEST',
            status: 'PENDING_INFO',
            resolution: 'To process your refund request, please provide the transaction ID. You can find it in your transaction history or payment receipt.',
            estimated_resolution_time: '24-48 hours after details received',
            next_action: 'Please share your transaction ID so we can look into this.'
        };
    }

    _handlePaymentFailure(msg, context) {
        const txnMatch = msg.match(/txn-[a-z0-9]+/i);
        const txnId = txnMatch ? txnMatch[0].toUpperCase() : context.txnId || null;
        let resolution, status;

        if (txnId) {
            const txn = store.getTransaction(txnId);
            if (txn) {
                status = 'INVESTIGATING';
                const statusExplanations = {
                    'BLOCKED': 'This transaction was blocked by our fraud detection system due to security concerns. If you believe this is an error, we can escalate for manual review.',
                    'MANUAL_REVIEW': 'This transaction is currently under manual review by our security team. Expected resolution: 2-4 hours.',
                    'OTP_REQUIRED': 'This transaction requires OTP verification. Please check your registered mobile number for the verification code.',
                    'VALIDATION_FAILED': 'The transaction could not be processed due to validation errors. Please verify the payment details and try again.',
                    'INSUFFICIENT_FUNDS': 'The transaction failed due to insufficient funds. Please check your account balance.',
                    'APPROVED': 'This transaction was approved and processed successfully. If you\'re experiencing issues, please describe the problem.',
                    'COMPLETED': 'This transaction has been completed. The funds should reflect in the recipient\'s account.'
                };

                resolution = statusExplanations[txn.status] ||
                    `Transaction ${txnId} status: ${txn.status}. Our team is looking into this.`;
            } else {
                status = 'NOT_FOUND';
                resolution = `Transaction ${txnId} was not found in our records. Please verify the transaction ID and try again.`;
            }
        } else {
            status = 'PENDING_INFO';
            resolution = 'I understand you\'re having trouble with a payment. Could you please share the transaction ID or describe the issue in more detail?';
        }

        const ticket = store.createTicket({
            userId: context.userId,
            issue_type: 'PAYMENT_FAILURE',
            status: status,
            relatedTxnId: txnId,
            priority: 'HIGH'
        });

        return {
            agent: 'Customer Support',
            ticket_id: ticket.ticket_id,
            issue_type: 'PAYMENT_FAILURE',
            status: status,
            resolution: resolution,
            estimated_resolution_time: status === 'INVESTIGATING' ? '2-4 hours' : 'Immediately upon info received',
            next_action: txnId
                ? 'Our team is actively investigating. You will be notified once resolved.'
                : 'Please provide the transaction ID or payment details.'
        };
    }

    _handleFraudComplaint(msg, context) {
        const ticket = store.createTicket({
            userId: context.userId,
            issue_type: 'FRAUD_COMPLAINT',
            status: 'ESCALATED',
            priority: 'CRITICAL'
        });

        return {
            agent: 'Customer Support',
            ticket_id: ticket.ticket_id,
            issue_type: 'FRAUD_COMPLAINT',
            status: 'ESCALATED',
            resolution: 'Your fraud complaint has been immediately escalated to our Security & Fraud Investigation team. As a precautionary measure, we recommend changing your password and enabling 2FA if not already active.',
            estimated_resolution_time: '4-24 hours (Priority Investigation)',
            next_action: 'A senior fraud analyst will contact you within 4 hours. Please do not share your OTP or credentials with anyone claiming to be from our team.'
        };
    }

    _handleAccountIssue(msg, context) {
        let resolution, status;

        if (/suspend|block/i.test(msg)) {
            status = 'UNDER_REVIEW';
            resolution = 'Account suspension/blocking issues are handled by our security team. We\'ve flagged your account for immediate review. If this is urgent, your case will be prioritized.';
        } else if (/kyc|verify/i.test(msg)) {
            status = 'ACTION_REQUIRED';
            resolution = 'KYC verification is required for full account access. Please upload your government-issued ID and address proof through the app. Processing typically takes 24-48 hours.';
        } else if (/login|password/i.test(msg)) {
            status = 'ACTION_REQUIRED';
            resolution = 'For login issues, please try resetting your password via the "Forgot Password" link. If your account is locked, it will automatically unlock after 30 minutes.';
        } else {
            status = 'PENDING_INFO';
            resolution = 'I\'d be happy to help with your account issue. Could you please provide more details about the problem you\'re experiencing?';
        }

        const ticket = store.createTicket({
            userId: context.userId,
            issue_type: 'ACCOUNT_ISSUE',
            status: status,
            priority: /suspend|block/i.test(msg) ? 'HIGH' : 'MEDIUM'
        });

        return {
            agent: 'Customer Support',
            ticket_id: ticket.ticket_id,
            issue_type: 'ACCOUNT_ISSUE',
            status: status,
            resolution: resolution,
            estimated_resolution_time: /suspend|block/i.test(msg) ? '4-12 hours' : '24-48 hours',
            next_action: 'Follow the steps above, or reply here if you need further assistance.'
        };
    }

    _handleInfoRequest(msg, context) {
        // Check if asking about a specific transaction
        const txnMatch = msg.match(/txn-[a-z0-9]+/i);
        const txnId = txnMatch ? txnMatch[0].toUpperCase() : context.txnId || null;

        if (txnId) {
            const txn = store.getTransaction(txnId);
            if (txn) {
                return {
                    agent: 'Customer Support',
                    ticket_id: 'N/A',
                    issue_type: 'INFORMATION_REQUEST',
                    status: 'RESOLVED',
                    resolution: `Transaction ${txnId} details:\n• Status: ${txn.status}\n• Amount: ₹${txn.amount.toLocaleString()}\n• Payment Type: ${txn.paymentType}\n• Recipient: ${txn.recipientName}\n• Date: ${new Date(txn.createdAt).toLocaleString()}`,
                    estimated_resolution_time: 'Resolved',
                    next_action: 'Is there anything else you\'d like to know about this transaction?'
                };
            }
        }

        // Check for general history request
        if (/history|recent|all/i.test(msg) && context.userId) {
            const txns = store.getUserTransactions(context.userId);
            const summary = txns.length > 0
                ? `You have ${txns.length} transaction(s). Most recent: ${txns[0].transaction_id} (${txns[0].status}) for ₹${txns[0].amount.toLocaleString()}`
                : 'No transactions found for your account.';

            return {
                agent: 'Customer Support',
                ticket_id: 'N/A',
                issue_type: 'INFORMATION_REQUEST',
                status: 'RESOLVED',
                resolution: summary,
                estimated_resolution_time: 'Resolved',
                next_action: 'Would you like details on a specific transaction?'
            };
        }

        return {
            agent: 'Customer Support',
            ticket_id: 'N/A',
            issue_type: 'INFORMATION_REQUEST',
            status: 'RESOLVED',
            resolution: 'I\'m here to help! You can ask me about:\n• Transaction status — provide a transaction ID\n• Payment failures or issues\n• Refund requests\n• Account problems\n• Fraud complaints\n\nHow can I assist you today?',
            estimated_resolution_time: 'Immediate',
            next_action: 'Please describe your issue or ask a specific question.'
        };
    }

    _handleEscalation(msg, context) {
        const ticket = store.createTicket({
            userId: context.userId,
            issue_type: 'ESCALATION_REQUIRED',
            status: 'ESCALATED',
            priority: 'CRITICAL'
        });

        return {
            agent: 'Customer Support',
            ticket_id: ticket.ticket_id,
            issue_type: 'ESCALATION_REQUIRED',
            status: 'ESCALATED',
            resolution: 'Your issue has been escalated to a senior support specialist. We understand your concern and want to resolve this as quickly as possible.',
            estimated_resolution_time: '2-4 hours',
            next_action: 'A senior representative will contact you shortly. Your ticket has been marked as high priority.'
        };
    }

    _handleGeneral(msg, context) {
        return {
            agent: 'Customer Support',
            ticket_id: 'N/A',
            issue_type: 'INFORMATION_REQUEST',
            status: 'RESOLVED',
            resolution: 'Thank you for reaching out! I can help you with payment issues, refund requests, transaction tracking, account problems, and fraud complaints. Please describe your issue and I\'ll assist you right away.',
            estimated_resolution_time: 'Immediate',
            next_action: 'Please share the details of your query.'
        };
    }
}
