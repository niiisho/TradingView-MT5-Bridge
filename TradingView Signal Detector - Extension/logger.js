/**
 * TradingView to MT5 Bridge - Logger Script
 * 
 * Copyright (c) 2025 Nishant P.Garg
 * Licensed under MIT License
 * 
 * GitHub: https://github.com/niiisho/tradingview-mt5-bridge
 * 
 * Handles file writing and signal extraction
 */


let fileHandle = null;

console.log('🚀 Logger.js script loading...');

function appendLog(text) {
  const log = document.getElementById('log');
  if (log) {
    log.textContent += text + '\n';
    log.scrollTop = log.scrollHeight;
  }
}

async function writeTrade(tradeData) {
  console.log('💾 Writing trade to file:', tradeData);
  
  if (!fileHandle) {
    appendLog('⚠️ No file selected; trade not written.');
    console.warn('No file handle available');
    return;
  }

  try {
    const permission = await fileHandle.queryPermission({ mode: 'readwrite' });
    
    if (permission !== 'granted') {
      appendLog('❌ Permission lost. Please reselect the file.');
      console.error('Permission not granted:', permission);
      fileHandle = null;
      document.getElementById('status').textContent = '❌ Permission lost - reselect file';
      return;
    }
    
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    
    // ✅ Extract clean signal from fullText
    const cleanSignal = extractSignal(tradeData);
    
    await writable.write(cleanSignal);
    await writable.close();

    appendLog(`✅ Wrote trade: ${cleanSignal}`);
    console.log('✅ Trade written successfully');
  } catch (error) {
    appendLog(`❌ Write error: ${error.message}`);
    console.error('Write error:', error);
  }
}

function extractSignal(tradeData) {
  const fullText = tradeData.fullText || '';
  
  console.log('Full text:', fullText);
  
  // ✅ Try to extract full pattern: (BUY|SELL) SL=number TP=number LOT=number
  const fullRegex = /\b(BUY|SELL)\s+SL=([\d.]+)\s+TP=([\d.]+)\s+LOT=([\d.]+)\b/i;
  const fullMatch = fullText.match(fullRegex);
  
  if (fullMatch) {
    const signal = fullMatch[0];  // e.g., "SELL SL=800 TP=2400 LOT=6.25"
    console.log('✅ Extracted full signal:', signal);
    return signal;
  }
  
  // ✅ Fallback: Just find BUY or SELL
  console.log('⚠️ Full pattern not found, searching for BUY/SELL only');
  
  const sideRegex = /\b(BUY|SELL)\b/i;
  const sideMatch = fullText.match(sideRegex);
  
  if (sideMatch) {
    const side = sideMatch[0].toUpperCase();  // "BUY" or "SELL"
    console.log('✅ Extracted side only:', side);
    return side;
  }
  
  // ✅ Last fallback: check for Long/Short
  if (fullText.toLowerCase().includes('long')) {
    console.log('✅ Found "long", returning BUY');
    return 'BUY';
  }
  if (fullText.toLowerCase().includes('short')) {
    console.log('✅ Found "short", returning SELL');
    return 'SELL';
  }
  
  // ✅ Ultimate fallback
  console.log('⚠️ Could not detect signal, using default');
  return 'UNKNOWN';
}




// Wait for DOM to load before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM loaded, setting up event listeners');

  // Select existing file
  const selectBtn = document.getElementById('selectFile');
  if (selectBtn) {
    selectBtn.addEventListener('click', async () => {
      console.log('File picker opening...');
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] }
          }],
          multiple: false
        });

        const permission = await handle.requestPermission({ mode: 'readwrite' });
        
        if (permission !== 'granted') {
          appendLog('❌ Permission denied by user');
          document.getElementById('status').textContent = '❌ Permission denied';
          return;
        }

        fileHandle = handle;
        document.getElementById('status').textContent = `✅ Selected: ${fileHandle.name}`;
        appendLog(`📁 File selected with write permission: ${fileHandle.name}`);
        console.log('✅ File selected with permission:', fileHandle.name);
      } catch (e) {
        document.getElementById('status').textContent = '❌ Selection cancelled';
        appendLog('⚠️ File selection cancelled');
        console.log('File selection cancelled or error:', e.message);
      }
    });
  } else {
    console.error('❌ selectFile button not found in DOM');
  }

  appendLog('🚀 Trade Logger ready. Select alerts.txt to begin.');
  console.log('✅ Event listeners registered');
});

// Listen for trades - this can be set up immediately
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('📩 Message received:', msg);
  
  if (msg.type === 'NEW_TRADE') {
    console.log('🎯 NEW_TRADE message confirmed');
    appendLog('📨 Received new trade from TradingView');
    writeTrade(msg.tradeData);
    sendResponse({ ok: true });
  }
  return true;
});

console.log('✅ Message listener registered');
