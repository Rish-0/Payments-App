// ============================================================
// chatInterface.js — Customer Support Chat UI
// ============================================================

import { USERS } from '../data/mockData.js';
import { CustomerSupportAgent } from '../agents/supportAgent.js';
import { highlightJSON } from '../utils/helpers.js';

const supportAgent = new CustomerSupportAgent();

let chatOpen = false;
let selectedUserId = 'USR-001';

/**
 * Initialize the chat interface.
 */
export function initChat() {
    const panel = document.getElementById('chat-panel');
    const overlay = document.getElementById('chat-overlay');
    if (!panel || !overlay) return;

    // Close button
    document.getElementById('chat-close')?.addEventListener('click', closeChat);
    overlay.addEventListener('click', closeChat);

    // Send button
    document.getElementById('chat-send-btn')?.addEventListener('click', sendMessage);

    // Enter key
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Quick actions
    document.getElementById('chat-quick-actions')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.chat-quick-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = action;
            sendMessage();
        }
    });

    // User select
    document.getElementById('chat-user-select')?.addEventListener('change', (e) => {
        selectedUserId = e.target.value;
    });

    // Add welcome message
    addAgentMessage('Welcome! 👋 I\'m your Customer Support assistant. I can help with transaction status, refund requests, payment issues, fraud complaints, and account problems. How can I help you today?');
}

/**
 * Open the chat panel.
 */
export function openChat() {
    const panel = document.getElementById('chat-panel');
    const overlay = document.getElementById('chat-overlay');
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('visible');
    chatOpen = true;
    document.getElementById('chat-input')?.focus();
}

/**
 * Close the chat panel.
 */
export function closeChat() {
    const panel = document.getElementById('chat-panel');
    const overlay = document.getElementById('chat-overlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
    chatOpen = false;
}

/**
 * Toggle chat open/close.
 */
export function toggleChat() {
    if (chatOpen) closeChat();
    else openChat();
}

/**
 * Send the user's message.
 */
async function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    addUserMessage(message);

    // Show typing indicator
    showTyping();

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    // Process through support agent
    const response = await supportAgent.handleQuery(message, {
        userId: selectedUserId
    });

    hideTyping();

    // Build response text
    let responseText = response.resolution;
    if (response.ticket_id && response.ticket_id !== 'N/A') {
        responseText += `\n\n🎫 Ticket: ${response.ticket_id}`;
    }
    if (response.estimated_resolution_time && response.estimated_resolution_time !== 'Resolved') {
        responseText += `\n⏱ ETA: ${response.estimated_resolution_time}`;
    }

    addAgentMessage(responseText, response);
}

/**
 * Add a user message bubble.
 */
function addUserMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-message user';
    div.innerHTML = `
        <div class="chat-msg-sender">You</div>
        ${escapeHtml(text)}
    `;
    container.appendChild(div);
    scrollToBottom();
}

/**
 * Add an agent message bubble.
 */
function addAgentMessage(text, jsonData = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-message agent';

    let jsonHtml = '';
    if (jsonData) {
        const cleanData = { ...jsonData };
        delete cleanData._riskLevel;
        delete cleanData._decision;
        jsonHtml = `
            <details>
                <summary style="cursor:pointer; font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2); user-select: none;">View JSON Response</summary>
                <div class="chat-msg-json">${highlightJSON(cleanData)}</div>
            </details>
        `;
    }

    div.innerHTML = `
        <div class="chat-msg-sender">🤖 Support Agent</div>
        ${escapeHtml(text).replace(/\n/g, '<br>')}
        ${jsonHtml}
    `;
    container.appendChild(div);
    scrollToBottom();
}

function showTyping() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    // Remove any existing typing indicator
    hideTyping();
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chat-typing-indicator';
    div.innerHTML = `
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function hideTyping() {
    document.getElementById('chat-typing-indicator')?.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
