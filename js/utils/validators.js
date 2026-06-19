// ============================================================
// validators.js — Input Validation
// ============================================================

const VALID_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const VALID_PAYMENT_METHODS = [
    'UPI', 'WALLET_TRANSFER', 'BANK_TRANSFER',
    'CREDIT_CARD', 'DEBIT_CARD', 'MERCHANT_PAYMENT', 'SUBSCRIPTION_PAYMENT'
];

/**
 * Validate a complete transaction request.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateTransaction(data) {
    const errors = [];

    if (!data) {
        return { valid: false, errors: ['Transaction data is required'] };
    }

    // User ID
    if (!data.userId || typeof data.userId !== 'string' || data.userId.trim() === '') {
        errors.push('Valid User ID is required');
    }

    // Recipient ID
    if (!data.recipientId || typeof data.recipientId !== 'string' || data.recipientId.trim() === '') {
        errors.push('Valid Recipient ID is required');
    }

    // Self-transfer check
    if (data.userId && data.recipientId && data.userId === data.recipientId) {
        errors.push('Cannot transfer to yourself');
    }

    // Amount
    if (data.amount === undefined || data.amount === null || data.amount === '') {
        errors.push('Amount is required');
    } else {
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            errors.push('Amount must be a positive number');
        } else if (amount < 1) {
            errors.push('Minimum transaction amount is 1');
        } else if (amount > 10000000) {
            errors.push('Amount exceeds maximum transaction limit (1,00,00,000)');
        }
    }

    // Currency
    if (!data.currency || !VALID_CURRENCIES.includes(data.currency)) {
        errors.push(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}`);
    }

    // Payment Method
    if (!data.paymentMethod || !VALID_PAYMENT_METHODS.includes(data.paymentMethod)) {
        errors.push(`Payment method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate an amount string/number.
 */
export function validateAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return { valid: false, error: 'Invalid number' };
    if (num <= 0) return { valid: false, error: 'Must be positive' };
    if (num < 1) return { valid: false, error: 'Minimum is ₹1' };
    if (num > 10000000) return { valid: false, error: 'Exceeds limit' };
    return { valid: true, value: num };
}

/**
 * Validate currency code.
 */
export function validateCurrency(code) {
    return VALID_CURRENCIES.includes(code);
}

/**
 * Validate payment method.
 */
export function validatePaymentMethod(method) {
    return VALID_PAYMENT_METHODS.includes(method);
}

/**
 * Sanitize user input (basic XSS prevention).
 */
export function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export { VALID_CURRENCIES, VALID_PAYMENT_METHODS };
