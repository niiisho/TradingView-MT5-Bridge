(function () {
  'use strict';

  console.log('TradingView Trade Detector: Extension loaded');

  // Track existing trades to detect new ones
  let trackedTrades = new Set();
  let tradesObserver = null;
  let containerObserver = null;
  let currentTradesContainer = null;
  let isRefreshing = false;

 // 🔥 Simple flag system - only show alert once per error type
const alertShown = {};
const RESET_DELAY = 5000; // Reset after 3 seconds

function logOnce(message, key) {
  console.log(message);
  
  // If alert already shown for this key, skip
  if (alertShown[key]) {
    return;
  }
  
  // Show alert
  alertShown[key] = true;
  alert(message);
  
  // Reset flag after delay so user can see it again if issue persists
  setTimeout(() => {
    alertShown[key] = false;
  }, RESET_DELAY);
}


  // 🔥 NEW: Send directly to server
  async function sendToServer(tradeInfo) {
    const signal = extractSignal(tradeInfo);

    if (signal === 'UNKNOWN') {
      console.log('⚠️ No valid signal extracted');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: signal,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        logOnce('❌ Server error - TradingBridge may not be responding properly', 'server_error');
      }
    } catch (error) {
      logOnce('❌ Server offline - Please start TradingBridge.exe', 'server_offline');
    }
  }

  // 🔥 NEW: Extract signal from trade data
  function extractSignal(tradeInfo) {
    const fullText = tradeInfo.fullText || '';

    // Try full pattern: BUY/SELL SL=X TP=Y LOT=Z
    const fullPattern = /\b(BUY|SELL)\s+SL=([\d.]+)\s+TP=([\d.]+)\s+LOT=([\d.]+)\b/i;
    const fullMatch = fullText.match(fullPattern);
    if (fullMatch) {
      return fullMatch[0];
    }

    // Fallback: Just BUY or SELL
    const sidePattern = /\b(BUY|SELL)\b/i;
    const sideMatch = fullText.match(sidePattern);
    if (sideMatch) {
      return sideMatch[0].toUpperCase();
    }

    // Fallback: Long/Short
    if (fullText.toLowerCase().includes('long')) return 'BUY';
    if (fullText.toLowerCase().includes('short')) return 'SELL';

    return 'UNKNOWN';
  }

  // Function to find the trades list container
  function findTradesListContainer() {
    // TradingView uses dynamic class names, so we look for common patterns
    const possibleSelectors = [
      '[class*="list-"]',
      '[class*="trades"]',
      '[data-name="list-of-trades"]',
      '.tv-data-table__tbody',
      '[class*="tbody"]'
    ];

    for (const selector of possibleSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // Check if this looks like the trades list
        if (element.querySelector('[class*="trade"]') ||
          element.textContent.includes('Trade') ||
          element.closest('[class*="strategy-tester"]')) {
          return element;
        }
      }
    }
    return null;
  }

  // Function to extract trade information
  function extractTradeInfo(tradeElement) {
    const text = tradeElement.textContent;
    const cells = tradeElement.querySelectorAll('td, div[class*="cell"]');

    const tradeInfo = {
      timestamp: new Date().toISOString(),
      fullText: text.trim(),
      cells: Array.from(cells).map(cell => cell.textContent.trim())
    };

    return tradeInfo;
  }

  // Function to process new trades
  function processTrade(tradeElement) {
    const tradeId = tradeElement.textContent.trim();

    if (!trackedTrades.has(tradeId) && !isRefreshing) {
      trackedTrades.add(tradeId);
      const tradeInfo = extractTradeInfo(tradeElement);

      sendToServer(tradeInfo);
      return true;
    
    } else if (!trackedTrades.has(tradeId) && isRefreshing) {
      trackedTrades.add(tradeId);
    }

    return false;
  }

  // Detect if this is a list refresh (bulk removal + bulk addition)
  function detectListRefresh(mutations) {
    let totalRemoved = 0;
    let totalAdded = 0;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        totalRemoved += mutation.removedNodes.length;
        totalAdded += mutation.addedNodes.length;
      }
    });

    const isLikelyRefresh = (totalRemoved > 4 && totalAdded > 4);
    return isLikelyRefresh;
  }

  // Mutation Observer callback for trades
  function handleMutations(mutations) {
    const isListRefresh = detectListRefresh(mutations);

    if (isListRefresh) {
      isRefreshing = true;
      console.log('🔄 LIST REFRESH DETECTED (Date range change or strategy update)');
      trackedTrades.clear();
    }

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const tradeId = node.textContent.trim();
            if (trackedTrades.has(tradeId) && !isRefreshing) {
              trackedTrades.delete(tradeId);
            }
          }
        });
      }

      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches && (
              node.matches('tr') ||
              node.matches('[class*="row"]') ||
              node.matches('[class*="trade"]')
            )) {
              processTrade(node);
            }

            const tradeRows = node.querySelectorAll('tr, [class*="row"]');
            tradeRows.forEach(row => processTrade(row));
          }
        });
      }
    });

    if (isListRefresh) {
      setTimeout(() => {
        isRefreshing = false;
        console.log(`✅ Refresh complete. Now tracking ${trackedTrades.size} trades`);
      }, 750);
    }
  }

  function monitorContainerRemoval(container) {
    if (containerObserver) {
      containerObserver.disconnect();
    }

    const parent = container.parentNode;
    if (!parent) return;

    containerObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach(function (removedNode) {
            if (removedNode === container || removedNode.contains(container)) {
              console.log('🚫 TRADES TAB REMOVED!');

              if (tradesObserver) {
                tradesObserver.disconnect();
                tradesObserver = null;
              }

              currentTradesContainer = null;
              trackedTrades.clear();
              isRefreshing = false;

              setTimeout(reinitialize, 2000);
            }
          });
        }
      });
    });

    containerObserver.observe(parent, {
      childList: true,
      subtree: false
    });
  }

  function monitorDocumentLevel(container) {
    const documentObserver = new MutationObserver(function (mutations) {
      if (!document.body.contains(container)) {
        console.log('🚫 TRADES TAB REMOVED FROM DOCUMENT!');

        if (tradesObserver) {
          tradesObserver.disconnect();
          tradesObserver = null;
        }

        documentObserver.disconnect();

        currentTradesContainer = null;
        trackedTrades.clear();
        isRefreshing = false;

        setTimeout(reinitialize, 2000);
      }
    });

    documentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function initObserver() {
    const tradesContainer = findTradesListContainer();

    if (tradesContainer && tradesContainer !== currentTradesContainer) {
      currentTradesContainer = tradesContainer;

      console.log('✅ Trades list container found, starting observer...');

      const existingTrades = tradesContainer.querySelectorAll('tr, [class*="row"]');
      existingTrades.forEach(trade => {
        const tradeId = trade.textContent.trim();
        if (tradeId) {
          trackedTrades.add(tradeId);
        }
      });

      tradesObserver = new MutationObserver(handleMutations);

      const config = {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      };

      tradesObserver.observe(tradesContainer, config);
      console.log('👀 Observer active - monitoring for new trades...');

      monitorContainerRemoval(tradesContainer);
      monitorDocumentLevel(tradesContainer);

      return tradesObserver;
    } else if (!tradesContainer) {
      console.log('⚠️  Trades list not found yet. Retrying in 2 seconds...');
      setTimeout(initObserver, 2000);
    }
  }

  function reinitialize() {
    console.log('🔄 Attempting to reinitialize trade detector...');
    initObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initObserver, 1000);
    });
  } else {
    setTimeout(initObserver, 1000);
  }

})();
