# TradingView to MT5 Trade Bridge

**FREE & Open Source** - Automated trading system that detects trades from TradingView Strategy Tester and executes them on MetaTrader 5 (MT5) in real-time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)

---

## 🌟 Why This Project is Different

### ✨ **ABSOLUTELY FREE - NO TRADINGVIEW PREMIUM NEEDED!**

Unlike other TradingView-to-MT5 solutions that require:
- ❌ TradingView Premium ($15-60/month for webhooks)
- ❌ Paid bridge services ($5-50/month)
- ❌ Cloud servers or third-party APIs

**This solution is:**
- ✅ **100% FREE** - No subscriptions, no premium accounts needed
- ✅ **No Webhooks Required** - Works directly with Strategy Tester
- ✅ **Fully Local** - Runs on your computer, no cloud dependency
- ✅ **Open Source** - Modify and customize as needed
- ✅ **No Coding** - Easy setup for non-programmers

---

## 📖 How It Works

```
TradingView Strategy Tester (Free Account)
         ↓
    New Trade Appears
         ↓
Chrome Extension Detects Trade → Extracts Signal (BUY/SELL + SL/TP/LOT)
         ↓
    Writes to Local File (D:\alerts_connector.txt)
         ↓
Python File Watcher Monitors File → Filters & Validates Signal
         ↓
    Copies to MT5 'alerts' File
         ↓
MT5 Expert Advisor Reads Signal → Executes Trade Automatically
         ↓
    ✅ Trade Executed on Your Broker
```

**Total Latency:** < 2 seconds from TradingView signal to MT5 execution

---

## 🎯 Features

- **Real-time Trade Detection**: Monitors TradingView Strategy Tester trades list
- **Automatic Signal Extraction**: Extracts BUY/SELL signals with SL/TP/LOT parameters
- **Chrome Extension**: Captures trades and writes to local file
- **Python File Watcher**: Monitors and copies signals with validation
- **MT5 Integration**: Executes trades automatically with custom parameters
- **Smart Filtering**: Prevents duplicate signals during scrolling/refreshing
- **Risk Management**: Variable SL/TP and lot size per trade from strategy
- **Configurable**: Easy setup via config.ini (no Python editing needed)

---

## 📋 System Requirements

- **Windows OS** (for MT5)
- **Google Chrome** browser
- **Python 3.7+** ([Download here](https://www.python.org/downloads/))
- **MetaTrader 5** ([Download here](https://www.metatrader5.com/en/download))
- **TradingView** Free account (no premium needed!)

---

## 🛠️ Installation

### 1. Chrome Extension Setup

1. **Clone or download this repository:**
```bash
git clone https://github.com/niiisho/tradingview-mt5-bridge.git
cd tradingview-mt5-bridge
```

2. **Load the extension in Chrome:**
   - Open Chrome → `chrome://extensions/`
   - Enable "**Developer mode**" (toggle in top right)
   - Click "**Load unpacked**"
   - Select the folder: **`TradingView Signal Detector - Extension`**

3. **Pin the extension** to your toolbar for easy access

---

### 2. Python File Watcher Setup

1. **Install required Python package:**
```bash
pip install watchdog
```


2. Edit config.ini (located in project folder):
   Open config.ini and update with your paths:
   Instructions written in config.ini file...

3. **Run the file watcher:**
```bash
python file_watcher.py
```

Keep it running in the background. You'll see:
```
🔍 Monitoring: D:\alerts_connector.txt
📋 Will copy to: C:\Users\...\alerts.txt
🚀 File watcher started!
```

---

### 3. MT5 Expert Advisor Setup

1. **Copy the EA file to MT5:**

Copy `TradingBot.mq5` to:
```
C:\Users\YourUsername\AppData\Roaming\MetaTrader 5\MQL5\Experts\
```
2. **Create alerts.txt file:** 
   - Navigate to: `C:\Users\YourUsername\AppData\Roaming\MetaTrader 5\MQL5\Files\`
   - Create a new text file named **`alerts.txt`** (all lowercase)
   - Leave it empty (the EA will write to it)
   
   **Note:** The EA will also create this file automatically if it doesn't exist, but creating it manually ensures proper permissions.

3. **Compile the EA:**
   - Open **MetaEditor** in MT5
   - Open `TradingBot.mq5`
   - Click **Compile** (F7)

4. **Attach EA to a chart:**
   - Drag EA from Navigator → Chart
   - **Configure inputs:**
     - `LotSize` = 0.01 (default if strategy doesn't specify)
     - `TakeProfitPoints` = 100 (default TP)
     - `StopLossPoints` = 50 (default SL)
     - `AlertFilePath` = `"alerts.txt"` (don't change)
     - `MagicNumber` = 12345 (unique ID for this EA)

5. **Enable AutoTrading:**
   - Click **"AutoTrading"** button in MT5 toolbar (should be green)

---

### 4. TradingView Pine Script Setup

#### For Variable SL/TP/LOT (Recommended):

Add this code to your Pine Script strategy to send **dynamic SL/TP/LOT** values:

**Entry name format required:**
```
"BUY SL=<value> TP=<value> LOT=<value>"
"SELL SL=<value> TP=<value> LOT=<value>"
```

**Example implementation:**

```pine
// In your Long entry logic:
if (buyCondition)
    // Calculate your SL/TP/LOT dynamically
    sl_pips = math.round((entry - stop_loss) / pipsize)
    tp_pips = math.round((take_profit - entry) / pipsize)
    lot_size = calculated_lot_size
    
    // Format entry name with SL/TP/LOT
    entry_name = "BUY SL=" + str.tostring(sl_pips) + " TP=" + str.tostring(tp_pips) + " LOT=" + str.tostring(lot_size)
    
    strategy.entry(entry_name, strategy.long, qty=lot_size)

// In your Short entry logic:
if (sellCondition)
    // Calculate your SL/TP/LOT dynamically
    sl_pips = math.round((stop_loss - entry) / pipsize)
    tp_pips = math.round((entry - take_profit) / pipsize)
    lot_size = calculated_lot_size
    
    // Format entry name with SL/TP/LOT
    entry_name = "SELL SL=" + str.tostring(sl_pips) + " TP=" + str.tostring(tp_pips) + " LOT=" + str.tostring(lot_size)
    
    strategy.entry(entry_name, strategy.short, qty=lot_size)
```

**Values should be in PIPS** (not price levels).

#### Without Variable SL/TP/LOT:

If you don't modify your strategy, just use entry names:
- `"BUY"` or `"SELL"`

The MT5 EA will use **default values** from inputs.

---

## 🚀 Usage Guide

### Step-by-Step Workflow

**1. Start Python Watcher:**
```bash
python file_watcher.py
```
✅ Should display: `🚀 File watcher started!`

**2. Open TradingView Extension:**
   - Click **extension icon** in Chrome toolbar
   - Click the **three dots (⋮)** → **Options**
   - New tab opens (keep it open in background)

**3. Select File Location:**
   - In the options tab, click **"Select File"**
   - Navigate to your chosen location (e.g., `D:\`)
   - Select `alerts_connector.txt` (or create new file)
   - ✅ Status shows: "Selected: alerts_connector.txt"

**4. Open TradingView Strategy:**
   - Go to TradingView → Open your strategy
   - Click **"Strategy Tester"** tab (bottom panel)
   - Click **"List of Trades"** sub-tab

**5. Watch Automation Work:**
   - When new trade appears in list:
     - ✅ Extension detects → Writes to `alerts_connector.txt`
     - ✅ Python watcher → Copies to MT5 `alerts.txt`
     - ✅ MT5 EA → Executes trade
   - Check MT5 "**Trade**" tab to see executed orders

---

## 📊 Signal Format

### Full Signal (with variable SL/TP/LOT):
```
BUY SL=50 TP=200 LOT=0.5
SELL SL=45.5 TP=182.0 LOT=0.75
```

### Simple Signal (uses EA defaults):
```
BUY
SELL
```

**MT5 EA behavior:**
- **If full signal:** Uses provided SL/TP/LOT values
- **If simple signal:** Uses default values from EA inputs

---

## 📁 Project Structure

```
tradingview-mt5-bridge/
├── LICENSE                                    # MIT License
├── README.md                                  # This file
├── config.ini                                 # Python watcher configuration
├── file_watcher.py                            # Python signal monitor & copier
├── TradingBot.mq5                             # MT5 Expert Advisor
└── TradingView Signal Detector - Extension/   # Chrome extension folder
    ├── manifest.json                          # Extension configuration
    ├── content.js                             # TradingView page monitor
    ├── logger.html                            # Extension popup UI
    └── logger.js                              # File writer logic
```

---

## ⚙️ Configuration

### config.ini (Python Watcher)
```ini
[Paths]
source_file = D:\alerts_connector.txt
destination_file = C:\Users\...\Terminal\...\MQL5\Files\alerts.txt
```

### MT5 Expert Advisor Inputs
```mql5
LotSize = 0.01              // Default lot size (if not in signal)
TakeProfitPoints = 100      // Default TP in points
StopLossPoints = 50         // Default SL in points
AlertFilePath = "alerts.txt" // Don't change
MagicNumber = 12345         // Unique identifier for this EA
```

---

## 🔧 Troubleshooting

### Extension Not Detecting Trades
- ✅ Make sure you're on **"List of Trades"** tab in Strategy Tester
- ✅ Check browser console (`F12`) for errors
- ✅ Verify extension options tab is **open in background**
- ✅ Try refreshing TradingView page

### Python Watcher Not Copying
- ✅ Check if `alerts_connector.txt` is being updated
- ✅ Verify MT5 Terminal ID in `config.ini` is correct
- ✅ Look for error messages in Python console
- ✅ Make sure source file path exists

### MT5 Not Executing Trades
- ✅ Ensure **"AutoTrading"** button is enabled (green)
- ✅ Check MT5 **"Experts"** tab for error messages
- ✅ Verify `alerts.txt` file exists and has content
- ✅ Check if broker allows automated trading
- ✅ Ensure EA is attached to chart (smiley face visible)

### Duplicate Signals
- ✅ Extension has scroll detection - shouldn't happen
- ✅ Check if multiple instances of Python watcher running
- ✅ Verify only one EA instance on chart

### "System Files" Error (Chrome)
- ✅ **Use D:\ or another non-system drive** for `alerts_connector.txt`
- ✅ **Don't try to select MQL5 folder directly** in extension
- ✅ Let Python watcher handle copying to MQL5 folder

### File Not Found Errors
- ✅ Create destination folder manually if needed
- ✅ Check file paths have no typos
- ✅ Use raw strings in config (`r"path"` notation)

---

## 🔒 Security & Privacy

- ✅ **100% Local** - All processing happens on your computer
- ✅ **No External Servers** - No data sent to cloud
- ✅ **No API Keys** - No third-party services
- ✅ **Open Source** - Audit the code yourself
- ✅ **Your Credentials** - Stay on your machine only

**Always test on demo account first!**

---

## ⚠️ Disclaimer

This software is for **educational purposes only**. Trading involves substantial risk of loss.

- ⚠️ No guarantees or warranties provided
- ⚠️ Not responsible for financial losses
- ⚠️ Not financial or investment advice
- ⚠️ Test thoroughly on demo account first
- ⚠️ Use at your own risk

**Past performance does not guarantee future results.**

---

## 📝 License

**MIT License** - See [LICENSE](LICENSE) file for details.

**Copyright © 2025 Nishant Prakash Garg. All rights reserved.**

### Using This Project?

✅ **FREE for personal/educational use**  
✅ **Commercial use allowed** (with attribution)  
⚠️ **MUST include** copyright notice and LICENSE file  
🙏 **Star the repo** if you find it useful!

---

## 🤝 Contributing

Contributions welcome! Please:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Ideas for Contributions:
- Support for more indicators
- Multi-symbol trading
- Telegram notifications
- Trading dashboard
- Backtesting improvements

---

## 📧 Support & Contact

**Issues & Questions:**
- 🐛 [Open an issue](https://github.com/niiisho/tradingview-mt5-bridge/issues)
- 💬 Check [existing issues](https://github.com/niiisho/tradingview-mt5-bridge/issues?q=is%3Aissue) first

**Commercial Support:**
- 💼 Custom features & modifications
- 🛠️ Installation assistance
- 📞 Contact: contactme.ngone.com

---

## 🙏 Acknowledgments

- **TradingView** - Amazing charting platform
- **MetaTrader 5** - Robust trading platform
- **Chrome Extensions API** - Browser automation
- **Python Watchdog** - File monitoring library

---

## 📈 Roadmap

- [ ] Multi-account support
- [ ] Telegram notifications
- [ ] Web dashboard
- [ ] Strategy performance analytics
- [ ] Risk management module
- [ ] Position sizing calculator

---

## ⭐ Star History

If this project helped you, please **star the repository!**

It helps others discover this free alternative to paid services.

---

**Built with ❤️ by Nishant Prakash Garg**

**© 2025 Nishant Prakash Garg. Released under MIT License.**

---

### 🚨 Important Note

This is an **independent project** and is **not affiliated** with TradingView, MetaQuotes, or MetaTrader 5.
```

***
