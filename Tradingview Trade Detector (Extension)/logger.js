console.log('🚀 Logger.js loading...');

// Append to UI log
function appendLog(text) {
  const log = document.getElementById('log');
  if (log) {
    log.textContent += text + '\n';
    log.scrollTop = log.scrollHeight;
  }
}

// Initialize UI
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM loaded');
  
  appendLog('🚀 TradingBridge Extension Ready!');
  appendLog('📡 Server: http://localhost:8080');
  appendLog('⚠️ Make sure TradingBridge.exe is running!');
});

console.log('✅ Extension ready');
