(function () {
'use strict';

console.log('TradingView Trade Detector: Extension loaded');

let trackedTrades = new Set();
let tradesObserver = null;
let containerObserver = null;
let currentTradesContainer = null;
let isRefreshing = false;
let domInspected = false;

const alertShown = {};
const RESET_DELAY = 5000;

// Dedup guard: ignore identical signal within 1 second
let lastSignalKey = null;
let lastSignalTime = 0;

function logOnce(message, key) {
    console.log(message);
    if (alertShown[key]) return;
    alertShown[key] = true;
    alert(message);
    setTimeout(() => { alertShown[key] = false; }, RESET_DELAY);
}

// Broadcast a log entry to the popup (if open) and persist it
function broadcastLog(text) {
    const entry = { text, time: new Date().toLocaleTimeString() };

    // Live update to popup if it's open
    chrome.runtime.sendMessage({ type: 'log', entry }).catch(() => {});

    // Persist last 50 entries for when popup opens later
    chrome.storage.local.get({ logs: [] }, ({ logs }) => {
        logs.push(entry);
        if (logs.length > 50) logs.splice(0, logs.length - 50);
        chrome.storage.local.set({ logs });
    });
}

async function sendToServer(tradeInfo) {
    const signal = extractSignal(tradeInfo);
    if (signal === 'UNKNOWN') {
        console.log('⚠️ No valid signal extracted from:', tradeInfo.fullText.slice(0, 80));
        return;
    }

    // Suppress identical signal fired within 1 second (subtree observer artifact)
    const now = Date.now();
    if (signal === lastSignalKey && now - lastSignalTime < 1000) {
        console.log('⏭️ Duplicate signal suppressed:', signal);
        return;
    }
    lastSignalKey = signal;
    lastSignalTime = now;

    console.log('📤 Sending signal:', signal);
    broadcastLog(`📤 ${signal}`);

    try {
        const response = await fetch('http://localhost:8080/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signal, timestamp: new Date().toISOString() })
        });
        if (!response.ok) {
            broadcastLog('❌ Server error');
            logOnce('❌ Server error - TradingBridge may not be responding properly', 'server_error');
        } else {
            broadcastLog(`✅ Signal sent: ${signal}`);
        }
    } catch {
        broadcastLog('❌ Server offline');
        logOnce('❌ Server offline - Please start TradingBridge.exe', 'server_offline');
    }
}

function extractSignal(tradeInfo) {
    const fullText = tradeInfo.fullText || '';

    const fullMatch = fullText.match(/\b(BUY|SELL)\s+SL=([\d.]+)\s+TP=([\d.]+)\s+LOT=([\d.]+)\b/i);
    if (fullMatch) return fullMatch[0];

    const sideMatch = fullText.match(/\b(BUY|SELL)\b/i);
    if (sideMatch) return sideMatch[0].toUpperCase();

    const lower = fullText.toLowerCase();
    if (lower.includes('long')) return 'BUY';
    if (lower.includes('short')) return 'SELL';

    return 'UNKNOWN';
}

function inspectContainerOnce(container) {
    if (domInspected) return;
    domInspected = true;

    console.log('🔍 DOM INSPECTOR - Container:', container.tagName, container.className);
    const { children } = container;
    if (!children.length) { console.log('🔍 Container has no children yet'); return; }

    console.log(`🔍 Child[0]: <${children[0].tagName}> "${children[0].className}"`);
    if (children.length > 1)
        console.log(`🔍 Child[1]: <${children[1].tagName}> "${children[1].className}"`);

    const grandchildren = children[0].children;
    if (grandchildren.length)
        console.log(`🔍 Grandchild[0]: <${grandchildren[0].tagName}> "${grandchildren[0].className}"`);
}

function isTradeRow(node) {
    if (node.nodeType !== 1) return false;
    if (node.textContent.trim().length < 5) return false;
    if (node.tagName === 'TR') return true;
    return node.querySelectorAll('td, [class*="cell"]').length >= 2;
}

function extractTradeInfo(el) {
    return {
        timestamp: new Date().toISOString(),
        fullText: el.textContent.trim(),
        cells: Array.from(el.querySelectorAll('td, [class*="cell"]')).map(c => c.textContent.trim())
    };
}

function processTrade(node) {
    if (!isTradeRow(node)) return false;

    const tradeId = node.textContent.trim();
    if (!tradeId) return false;

    if (trackedTrades.has(tradeId)) return false;

    trackedTrades.add(tradeId);

    if (!isRefreshing) {
        console.log('🆕 New trade:', tradeId.slice(0, 80));
        sendToServer(extractTradeInfo(node));
        return true;
    }

    return false;
}

function detectListRefresh(mutations) {
    let removed = 0, added = 0;
    for (const m of mutations) {
        if (m.type === 'childList') { removed += m.removedNodes.length; added += m.addedNodes.length; }
    }
    return removed > 4 && added > 4;
}

function handleMutations(mutations) {
    const isListRefresh = detectListRefresh(mutations);

    if (isListRefresh) {
        isRefreshing = true;
        console.log('🔄 LIST REFRESH DETECTED');
        trackedTrades.clear();
    }

    for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;

        for (const node of mutation.removedNodes) {
            if (node.nodeType === 1 && !isRefreshing)
                trackedTrades.delete(node.textContent.trim());
        }

        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            // Only process nodes that are direct children of the container,
            // or <tr> elements anywhere inside it.
            // Skipping deep descendants avoids re-firing when subtree:true
            // generates separate mutation records for cells/spans within a row.
            if (node.parentElement === currentTradesContainer) {
                processTrade(node);
            } else if (node.tagName === 'TR' && node.closest && node.closest('tbody, [class*="tbody"]') === currentTradesContainer) {
                processTrade(node);
            }
            // Also catch a wrapper div added directly to the container
            // that itself contains trade rows
            if (node.parentElement === currentTradesContainer) {
                node.querySelectorAll('tr').forEach(r => processTrade(r));
            }
        }
    }

    if (isListRefresh) {
        setTimeout(() => {
            isRefreshing = false;
            console.log(`✅ Refresh complete. Tracking ${trackedTrades.size} trades`);
        }, 750);
    }
}

function findTradesListContainer() {
    // Priority 1: known stable row selector
    const kaRows = document.querySelectorAll('tr.ka-tr.ka-row');
    if (kaRows.length) {
        const c = kaRows[0].closest('tbody') ||
                  kaRows[0].closest('[class*="tbody"]') ||
                  kaRows[0].parentElement;
        if (c) { console.log('✅ Container: tr.ka-tr.ka-row'); return c; }
    }

    // Priority 2: data-name attribute
    const byName = document.querySelector('[data-name="list-of-trades"]');
    if (byName) { console.log('✅ Container: data-name'); return byName; }

    // Priority 3: tbody inside strategy tester / backtesting panels
    const panel = document.querySelector('[class*="strategy-tester"], [class*="backtesting"]');
    if (panel) {
        const tbody = panel.querySelector('tbody, [class*="tbody"], [class*="body"]');
        if (tbody) { console.log('✅ Container: strategy-tester tbody', tbody.className); return tbody; }
    }

    // Priority 4: generic fallbacks
    for (const selector of [
        '[class*="list-of-trades"]', '[class*="listOfTrades"]', '[class*="trades-list"]',
        '.tv-data-table__tbody', '[class*="tbody"]', '[class*="trades"]', '[class*="list-"]'
    ]) {
        for (const el of document.querySelectorAll(selector)) {
            if (el.querySelector('[class*="trade"]') ||
                el.textContent.includes('Trade') ||
                el.closest('[class*="strategy-tester"]') ||
                el.closest('[class*="backtesting"]')) {
                console.log('✅ Container via fallback:', selector, el.className);
                return el;
            }
        }
    }

    return null;
}

function reset() {
    if (tradesObserver) { tradesObserver.disconnect(); tradesObserver = null; }
    currentTradesContainer = null;
    trackedTrades.clear();
    isRefreshing = false;
    domInspected = false;
}

function monitorContainerRemoval(container) {
    if (containerObserver) containerObserver.disconnect();

    const parent = container.parentNode;
    if (!parent) return;

    containerObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const removed of m.removedNodes) {
                if (removed === container || removed.contains(container)) {
                    console.log('🚫 Trades container removed');
                    reset();
                    setTimeout(initObserver, 2000);
                    return;
                }
            }
        }
    });

    // subtree:false on the direct parent is sufficient and much cheaper
    // than observing document.body with subtree:true
    containerObserver.observe(parent, { childList: true, subtree: false });
}

function initObserver() {
    const container = findTradesListContainer();

    if (!container) {
        console.log('⚠️ Trades list not found yet. Retrying in 2 seconds...');
        setTimeout(initObserver, 2000);
        return;
    }

    if (container === currentTradesContainer) return;

    currentTradesContainer = container;
    console.log('✅ Trades list container found, starting observer...');
    inspectContainerOnce(container);

    // Seed existing trades so they aren't fired as new
    const seed = new Set();
    container.querySelectorAll('tr').forEach(r => { const id = r.textContent.trim(); if (id) seed.add(id); });
    Array.from(container.children).forEach(c => { const id = c.textContent.trim(); if (id) seed.add(id); });
    trackedTrades = seed;
    console.log(`📋 Seeded ${trackedTrades.size} existing trades`);

    tradesObserver = new MutationObserver(handleMutations);
    tradesObserver.observe(container, { childList: true, subtree: true, attributes: false, characterData: false });
    console.log('👀 Observer active');

    monitorContainerRemoval(container);
    broadcastLog('👀 Observer active on trades list');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initObserver, 1000));
} else {
    setTimeout(initObserver, 1000);
}

})();