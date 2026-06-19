// ============================================================
// app.js — Main Orchestrator & Application Controller
// ============================================================

import { PaymentProcessingAgent } from './agents/paymentAgent.js';
import { FraudComplianceAgent } from './agents/fraudAgent.js';
import { renderStats, renderTransactionFeed } from './ui/dashboard.js';
import { renderTransactionForm, setFormLoading } from './ui/transactionForm.js';
import { renderPipelineSteps, renderAgentPanels, showProcessingState } from './ui/agentPanels.js';
import { initChat, toggleChat } from './ui/chatInterface.js';
import { notifications } from './ui/notifications.js';
import { delay } from './utils/helpers.js';

// ── Agent Instances ──
const paymentAgent = new PaymentProcessingAgent();
const fraudAgent = new FraudComplianceAgent();

// ── Application State ──
let isProcessing = false;

/**
 * Initialize the application.
 */
function init() {
    // Render initial UI
    renderStats();
    renderTransactionFeed();
    renderPipelineSteps(0, []);
    renderAgentPanels(null, null, null);
    renderTransactionForm(handleTransactionSubmit);
    initChat();

    // Chat toggle button
    document.getElementById('chat-toggle')?.addEventListener('click', toggleChat);

    // Welcome notification
    setTimeout(() => {
        notifications.info(
            'System Online',
            'Multi-Agent Payment Platform is ready. Process a transaction or try a scenario.'
        );
    }, 800);

    console.log('%c⚡ Multi-Agent Payment Platform Initialized', 'color: #00d4ff; font-size: 14px; font-weight: bold;');
}

/**
 * Handle transaction form submission — orchestrate the 4-step workflow.
 */
async function handleTransactionSubmit(formData) {
    if (isProcessing) {
        notifications.warning('Please Wait', 'A transaction is already being processed.');
        return;
    }

    isProcessing = true;
    setFormLoading(true);

    try {
        // ════════════════════════════════════════════
        // STEP 1: Payment Processing Agent
        // ════════════════════════════════════════════
        renderPipelineSteps(1, []);
        showProcessingState('Payment Processing');
        notifications.info('Step 1', 'Payment Processing Agent is validating the transaction...');
        await delay(600 + Math.random() * 400);

        const paymentResult = await paymentAgent.processTransaction(formData);

        // If payment validation failed, stop here
        if (paymentResult._error) {
            renderPipelineSteps(0, []);
            renderAgentPanels(paymentResult, null, null);
            renderStats();
            renderTransactionFeed();
            notifications.error('Transaction Failed', paymentResult.message);
            return;
        }

        renderPipelineSteps(2, [1]);
        renderAgentPanels(paymentResult, null, null);

        // ════════════════════════════════════════════
        // STEP 2: Fraud & Compliance Agent
        // ════════════════════════════════════════════
        notifications.info('Step 2', 'Fraud & Compliance Agent is evaluating risk...');
        await delay(800 + Math.random() * 600);

        const fraudResult = await fraudAgent.evaluateTransaction(paymentResult._transaction);

        renderPipelineSteps(3, [1, 2]);
        renderAgentPanels(paymentResult, fraudResult, null);

        // ════════════════════════════════════════════
        // STEP 3: Decision Engine
        // ════════════════════════════════════════════
        notifications.info('Step 3', `Decision Engine: ${fraudResult.risk_level} — ${fraudResult.decision}`);
        await delay(500 + Math.random() * 300);

        // ════════════════════════════════════════════
        // STEP 4: Finalize Transaction
        // ════════════════════════════════════════════
        const finalResult = paymentAgent.finalizeTransaction(
            paymentResult.transaction_id,
            fraudResult.decision
        );

        renderPipelineSteps(4, [1, 2, 3, 4]);
        renderAgentPanels(paymentResult, fraudResult, finalResult);
        renderStats();
        renderTransactionFeed();

        // Status-specific notification
        const notifMap = {
            'APPROVED': () => notifications.success('Transaction Approved', `${paymentResult.transaction_id} processed successfully.`),
            'OTP_REQUIRED': () => notifications.warning('OTP Required', 'Additional verification needed. Check registered mobile.'),
            'MANUAL_REVIEW': () => notifications.warning('Manual Review', 'Transaction flagged for human review.'),
            'BLOCKED': () => notifications.error('Transaction Blocked', 'Transaction blocked due to high risk.'),
        };
        (notifMap[finalResult.status] || (() => {}))();

    } catch (error) {
        console.error('Orchestration error:', error);
        notifications.error('System Error', 'An unexpected error occurred. Please try again.');
        renderPipelineSteps(0, []);
    } finally {
        isProcessing = false;
        setFormLoading(false);
    }
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', init);
