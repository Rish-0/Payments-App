// ============================================================
// paymentAgent.js — Payment Processing Agent
// ============================================================

import { generateId } from '../utils/helpers.js';
import { validateTransaction } from '../utils/validators.js';
import { USERS, MERCHANTS } from '../data/mockData.js';
import { store } from '../data/store.js';

export class PaymentProcessingAgent {
    constructor() {
        this.name = 'Payment Processing';
    }

    /**
     * Main entry point — validate, verify, and prepare a transaction.
     * Does NOT finalize — waits for Fraud Agent decision.
     * @param {object} requestData - Raw form data
     * @returns {object} Agent response JSON
     */
    async processTransaction(requestData) {
        // Step 1: Validate required fields
        const validation = validateTransaction(requestData);
        if (!validation.valid) {
            return this._errorResponse(
                'VALIDATION_FAILED',
                `Malformed request: ${validation.errors.join('; ')}`,
                null,
                requestData
            );
        }

        const user = USERS[requestData.userId];
        const recipient = USERS[requestData.recipientId] || MERCHANTS[requestData.recipientId];
        const amount = parseFloat(requestData.amount);

        // Step 2: Verify user
        if (!user) {
            return this._errorResponse('USER_NOT_FOUND', 'User account not found', null, requestData);
        }
        if (!user.authenticated) {
            return this._errorResponse('AUTH_FAILED', 'User is not authenticated. Please log in.', null, requestData);
        }
        if (user.accountStatus === 'SUSPENDED') {
            return this._errorResponse('ACCOUNT_SUSPENDED', 'Account is suspended. Contact support.', null, requestData);
        }
        if (user.accountStatus === 'BLOCKED') {
            return this._errorResponse('ACCOUNT_BLOCKED', 'Account is blocked due to security concerns.', null, requestData);
        }

        // Step 3: Verify recipient
        if (!recipient) {
            return this._errorResponse('INVALID_RECIPIENT', 'Recipient account not found', null, requestData);
        }

        // Step 4: Check balance / availability
        const balanceCheck = this._checkBalance(user, amount, requestData.paymentMethod);
        if (!balanceCheck.sufficient) {
            return this._errorResponse('INSUFFICIENT_FUNDS', balanceCheck.message, null, requestData);
        }

        // Step 5: Check transaction limits
        const limitCheck = this._checkLimits(user, amount);
        if (!limitCheck.withinLimits) {
            return this._errorResponse('LIMIT_EXCEEDED', limitCheck.message, null, requestData);
        }

        // Step 6: Check for duplicate (simulate — last 5 seconds)
        const recentTxns = store.getUserTransactions(user.id);
        const duplicate = recentTxns.find(t => {
            const timeDiff = Date.now() - new Date(t.createdAt).getTime();
            return timeDiff < 5000
                && t.recipientId === requestData.recipientId
                && t.amount === amount;
        });
        if (duplicate) {
            return this._errorResponse(
                'DUPLICATE_REQUEST',
                `Duplicate transaction detected. Existing ID: ${duplicate.transaction_id}`,
                duplicate.transaction_id,
                requestData
            );
        }

        // Step 7: Generate transaction
        const txnId = generateId('TXN');
        const transaction = {
            transaction_id: txnId,
            userId: user.id,
            userName: user.name,
            recipientId: requestData.recipientId,
            recipientName: recipient.name,
            amount,
            currency: requestData.currency,
            paymentMethod: requestData.paymentMethod,
            paymentType: this._getPaymentTypeLabel(requestData.paymentMethod),
            status: 'PENDING_RISK_CHECK',
            timestamp: new Date().toISOString(),
            userDevice: user.device,
            userIp: user.ip,
            userLocation: user.location,
            userKycStatus: user.kycVerified,
            userFailedAttempts: user.failedAttempts,
            userRecentTransactions: user.recentTransactions,
            recipientRiskLevel: recipient.riskLevel || 'LOW',
            recipientCategory: recipient.category || 'INDIVIDUAL'
        };

        // Store transaction
        store.addTransaction(transaction);

        return {
            agent: 'Payment Processing',
            transaction_id: txnId,
            status: 'PENDING_RISK_CHECK',
            payment_type: transaction.paymentType,
            amount: amount,
            currency: requestData.currency,
            sender: { id: user.id, name: user.name },
            recipient: { id: recipient.id, name: recipient.name },
            message: 'Transaction validated and prepared. Forwarding to Fraud & Compliance for risk evaluation.',
            next_step: 'FRAUD_RISK_EVALUATION',
            _transaction: transaction // Internal — passed to fraud agent
        };
    }

    /**
     * Finalize a transaction after fraud decision.
     */
    finalizeTransaction(txnId, decision) {
        const statusMap = {
            'APPROVE': 'APPROVED',
            'APPROVE_WITH_MONITORING': 'APPROVED',
            'REQUIRE_OTP': 'OTP_REQUIRED',
            'REQUIRE_MANUAL_REVIEW': 'MANUAL_REVIEW',
            'BLOCK': 'BLOCKED'
        };

        const status = statusMap[decision] || 'UNKNOWN';
        store.updateTransactionStatus(txnId, status, {
            finalDecision: decision,
            finalizedAt: new Date().toISOString()
        });

        return {
            agent: 'Payment Processing',
            transaction_id: txnId,
            status: status,
            payment_type: store.getTransaction(txnId)?.paymentType || '',
            amount: store.getTransaction(txnId)?.amount || 0,
            currency: store.getTransaction(txnId)?.currency || 'INR',
            message: this._getFinalMessage(status, decision),
            next_step: status === 'APPROVED' ? 'COMPLETE' :
                       status === 'OTP_REQUIRED' ? 'AWAIT_OTP_VERIFICATION' :
                       status === 'MANUAL_REVIEW' ? 'ESCALATE_TO_REVIEW_TEAM' :
                       'TRANSACTION_TERMINATED'
        };
    }

    // ─── Private Helpers ────────────────────────────────

    _checkBalance(user, amount, method) {
        switch (method) {
            case 'WALLET_TRANSFER':
                if (user.walletBalance < amount) {
                    return { sufficient: false, message: `Insufficient wallet balance. Available: ₹${user.walletBalance.toLocaleString()}, Required: ₹${amount.toLocaleString()}` };
                }
                break;
            case 'BANK_TRANSFER':
            case 'UPI':
                if (user.bankBalance < amount) {
                    return { sufficient: false, message: `Insufficient bank balance. Available: ₹${user.bankBalance.toLocaleString()}, Required: ₹${amount.toLocaleString()}` };
                }
                break;
            case 'CREDIT_CARD':
                const availableCredit = user.creditLimit - user.creditUsed;
                if (availableCredit < amount) {
                    return { sufficient: false, message: `Insufficient credit. Available: ₹${availableCredit.toLocaleString()}, Required: ₹${amount.toLocaleString()}` };
                }
                break;
            case 'DEBIT_CARD':
                if (user.bankBalance < amount) {
                    return { sufficient: false, message: `Insufficient bank balance for debit. Available: ₹${user.bankBalance.toLocaleString()}` };
                }
                break;
            default:
                if (user.walletBalance + user.bankBalance < amount) {
                    return { sufficient: false, message: 'Insufficient funds across all accounts.' };
                }
        }
        return { sufficient: true };
    }

    _checkLimits(user, amount) {
        const remainingDaily = user.dailyLimit - user.dailySpent;
        if (amount > remainingDaily) {
            return {
                withinLimits: false,
                message: `Daily limit exceeded. Remaining: ₹${remainingDaily.toLocaleString()}, Attempted: ₹${amount.toLocaleString()}`
            };
        }
        const remainingMonthly = user.monthlyLimit - user.monthlySpent;
        if (amount > remainingMonthly) {
            return {
                withinLimits: false,
                message: `Monthly limit exceeded. Remaining: ₹${remainingMonthly.toLocaleString()}`
            };
        }
        return { withinLimits: true };
    }

    _getPaymentTypeLabel(method) {
        const labels = {
            'UPI': 'UPI',
            'WALLET_TRANSFER': 'Wallet Transfer',
            'BANK_TRANSFER': 'Bank Transfer',
            'CREDIT_CARD': 'Credit Card',
            'DEBIT_CARD': 'Debit Card',
            'MERCHANT_PAYMENT': 'Merchant Payment',
            'SUBSCRIPTION_PAYMENT': 'Subscription Payment'
        };
        return labels[method] || method;
    }

    _getFinalMessage(status, decision) {
        switch (status) {
            case 'APPROVED':
                return decision === 'APPROVE_WITH_MONITORING'
                    ? 'Transaction approved with enhanced monitoring. Activity will be tracked.'
                    : 'Transaction approved and completed successfully.';
            case 'OTP_REQUIRED':
                return 'Additional verification required. OTP has been sent to the registered mobile number.';
            case 'MANUAL_REVIEW':
                return 'Transaction flagged for manual review by the risk team. Expected resolution: 2-4 hours.';
            case 'BLOCKED':
                return 'Transaction has been blocked due to high risk. Please contact support.';
            default:
                return 'Transaction status updated.';
        }
    }

    _errorResponse(code, message, txnId = null, requestData = {}) {
        return {
            agent: 'Payment Processing',
            transaction_id: txnId || 'N/A',
            status: code,
            payment_type: this._getPaymentTypeLabel(requestData.paymentMethod) || 'N/A',
            amount: parseFloat(requestData.amount) || 0,
            currency: requestData.currency || 'INR',
            message: message,
            next_step: 'TRANSACTION_TERMINATED',
            _error: true
        };
    }
}
