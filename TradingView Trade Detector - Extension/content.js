/**
 * TradingView to MT5 Bridge - Trade Detector
 * 
 * Copyright (c) 2025 Nishant P.Garg
 * Licensed under MIT License
 * 
 * GitHub: https://github.com/niiisho/tradingview-mt5-bridge
 * 
 * Monitors TradingView Strategy Tester for new trades and sends alerts
 */


(function () {
  'use strict';

  console.log('TradingView Trade Detector: Extension loaded');

  // Track existing trades to detect new ones
  let trackedTrades = new Set();
  let tradesObserver = null;
  let containerObserver = null;
  let currentTradesContainer = null;
  let isRefreshing = false;

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

      console.log('🆕 NEW TRADE DETECTED!', tradeInfo);

      // Send trade to extension pages (including logger.html)
      chrome.runtime.sendMessage({
        type: 'NEW_TRADE',
        tradeData: tradeInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Connection error - logger tab probably not open
          console.warn('⚠️ Logger not connected:', chrome.runtime.lastError.message);
          console.warn('💡 Make sure logger.html tab is open');
        } else {
          console.log('✅ Message sent successfully, response:', response);
        }
      });

      return true;
    } else if (!trackedTrades.has(tradeId) && isRefreshing) {
      // ✅ ADDED: Silently add trades during refresh (don't trigger alerts)
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

    // If we see multiple trades removed and added in same mutation batch,
    // it's likely a refresh (date range change, strategy update, etc.)
    const isLikelyRefresh = totalRemoved > 3 || (totalRemoved > 0 && totalAdded > 5);

    return isLikelyRefresh;
  }

  // Mutation Observer callback for trades
  function handleMutations(mutations) {
    // Check if this looks like a list refresh
    const isListRefresh = detectListRefresh(mutations);

    if (isListRefresh) {
      isRefreshing = true;
      console.log('🔄 LIST REFRESH DETECTED (Date range change or strategy update)');
      console.log('═══════════════════════════════════════');
      console.log(`Previous trades count: ${trackedTrades.size}`);
      console.log('Clearing tracked trades and reloading...');
      trackedTrades.clear();
    }

    mutations.forEach(mutation => {
      // Handle removed nodes
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const tradeId = node.textContent.trim();
            if (trackedTrades.has(tradeId) && !isRefreshing) {
              // Individual trade removed (not during refresh)
              trackedTrades.delete(tradeId);
              console.log('➖ Trade removed:', tradeId.substring(0, 50) + '...');
            }
          }
        });
      }

      // Handle added nodes
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Check if the node itself is a trade row
            if (node.matches && (
              node.matches('tr') ||
              node.matches('[class*="row"]') ||
              node.matches('[class*="trade"]')
            )) {
              processTrade(node);
            }

            // Also check child elements
            const tradeRows = node.querySelectorAll('tr, [class*="row"]');
            tradeRows.forEach(row => processTrade(row));
          }
        });
      }
    });

    // After processing all mutations, end refresh mode
    if (isListRefresh) {
      setTimeout(() => {
        isRefreshing = false;
        console.log(`✅ Refresh complete. Now tracking ${trackedTrades.size} trades`);
        console.log('═══════════════════════════════════════');
      }, 500);
    }
  }

  // Function to monitor container removal
  function monitorContainerRemoval(container) {
    // Disconnect previous container observer if exists
    if (containerObserver) {
      containerObserver.disconnect();
    }

    // Observe the parent to detect when container is removed
    const parent = container.parentNode;
    if (!parent) return;

    containerObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach(function (removedNode) {
            // Check if the removed node is or contains our trades container
            if (removedNode === container || removedNode.contains(container)) {
              console.log('🚫 TRADES TAB REMOVED!');
              console.log('═══════════════════════════════════════');
              console.log(`Removed at: ${new Date().toLocaleString()}`);
              console.log(`Total trades tracked before removal: ${trackedTrades.size}`);
              console.log('═══════════════════════════════════════');

              // Cleanup
              if (tradesObserver) {
                tradesObserver.disconnect();
                tradesObserver = null;
              }

              currentTradesContainer = null;
              trackedTrades.clear();
              isRefreshing = false;

              // Try to reinitialize after a delay
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

  // Also monitor if container disappears from entire document
  function monitorDocumentLevel(container) {
    const documentObserver = new MutationObserver(function (mutations) {
      // Check if container still exists in document
      if (!document.body.contains(container)) {
        console.log('🚫 TRADES TAB REMOVED FROM DOCUMENT!');
        console.log('═══════════════════════════════════════');
        console.log(`Removed at: ${new Date().toLocaleString()}`);
        console.log(`Total trades tracked before removal: ${trackedTrades.size}`);
        console.log('═══════════════════════════════════════');

        // Cleanup
        if (tradesObserver) {
          tradesObserver.disconnect();
          tradesObserver = null;
        }

        documentObserver.disconnect();

        currentTradesContainer = null;
        trackedTrades.clear();
        isRefreshing = false;

        // Try to reinitialize after a delay
        setTimeout(reinitialize, 2000);
      }
    });

    documentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize observer
  function initObserver() {
    const tradesContainer = findTradesListContainer();

    if (tradesContainer && tradesContainer !== currentTradesContainer) {
      currentTradesContainer = tradesContainer;

      console.log('✅ Trades list container found, starting observer...');

      // Load existing trades into the tracked set
      const existingTrades = tradesContainer.querySelectorAll('tr, [class*="row"]');
      existingTrades.forEach(trade => {
        const tradeId = trade.textContent.trim();
        if (tradeId) {
          trackedTrades.add(tradeId);
        }
      });

      console.log(`📊 Tracking ${trackedTrades.size} existing trades`);

      // Create and start observer for trades
      tradesObserver = new MutationObserver(handleMutations);

      const config = {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      };

      tradesObserver.observe(tradesContainer, config);
      console.log('👀 Observer active - monitoring for new trades...');

      // Monitor for container removal
      monitorContainerRemoval(tradesContainer);
      monitorDocumentLevel(tradesContainer);

      return tradesObserver;
    } else if (!tradesContainer) {
      console.log('⚠️  Trades list not found yet. Retrying in 2 seconds...');
      setTimeout(initObserver, 2000);
    }
  }

  // Reinitialize function to restart monitoring
  function reinitialize() {
    console.log('🔄 Attempting to reinitialize trade detector...');
    initObserver();
  }

  // Wait for page to load, then initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initObserver, 1000);
    });
  } else {
    setTimeout(initObserver, 1000);
  }

})();

