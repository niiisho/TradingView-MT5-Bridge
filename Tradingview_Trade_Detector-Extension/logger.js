const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const clearBtn = document.getElementById('clear-btn');
const SERVER = 'http://localhost:8080';

function appendLog(entry) {
    const line = document.createElement('div');
    line.textContent = `[${entry.time}] ${entry.text}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(online) {
    statusEl.textContent = online ? '🟢 TradingBridge Online' : '🔴 TradingBridge Offline';
    statusEl.className = online ? 'online' : 'offline';
}

async function checkServer() {
    try {
        const res = await fetch(`${SERVER}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
        setStatus(res.ok);
    } catch {
        setStatus(false);
    }
}

// Load persisted logs from storage
chrome.storage.local.get({ logs: [] }, ({ logs }) => {
    logs.forEach(appendLog);
});

// Live updates from content.js while popup is open
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'log') appendLog(msg.entry);
});

clearBtn.addEventListener('click', () => {
    logEl.innerHTML = '';
    chrome.storage.local.set({ logs: [] });
});

// Check server on open and every 5s
checkServer();
setInterval(checkServer, 5000);
