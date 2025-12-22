# TradingView to MT5 Trade Bridge

**FREE & Open Source** - Automated trading system that detects trades from TradingView Strategy Tester and executes them on MetaTrader 5 (MT5) via **HTTP bridge** in real-time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![MT5](https://img.shields.io/badge/MT5-Compatible-green.svg)](https://www.metatrader5.com/)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)](https://github.com/niiisho/TradingView-MT5-Bridge)

---

## 🌟 Why This Project is Different

### ✨ **ABSOLUTELY FREE - NO TRADINGVIEW PREMIUM NEEDED!**

**Unlike paid solutions requiring:**
- ❌ TradingView Premium webhooks
- ❌ File watchers (slow + error-prone)
- ❌ Cloud VPS ($10-50/month)

**This is:**
- ✅ **100% FREE** - No subscriptions
- ✅ **HTTP Bridge** - Lightning fast (<500ms latency)
- ✅ **Tiny Memory ~45MB** - Minimal resource usage
- ✅ **No File I/O** - Direct Chrome → Server → MT5
- ✅ **Production Ready** - Waitress server
- ✅ **Smart Protection** - Refresh and Rapid Trades Safe

---

## 📖 How It Works

```
TradingView Strategy Tester
         ↓
   Chrome Extension Detects
         ↓ HTTP POST
   localhost:8080 
         ↓ JSON Poll
   MT5 WebRequest EA Executes
         ↓
✅ Trade on Your Broker
```

**Total Latency:** **<500ms** end-to-end!

---

## Installation & Setup Video
- 3-minute full Installation & Setup Video of Trading-MT5-Bridge to automate Trades with Live Trade Example:
  https://youtu.be/Op9VwIgxM8o

---

## 🎯 Features

- **Real-time Detection** - Monitors TradingView trades list  
- **Automatic Signal Extraction**: Extracts BUY/SELL signals with SL/TP/LOT parameters 
- **HTTP Bridge** - Chrome → localhost:8080 → MT5  
- **Signal Rejection** - Prevents overwrites during processing    
- **Smart Filtering** - Ignores refresh/false signals  
- **Robust Recovery** - Auto-reconnects on tab close  
- **Clean UI** - Minimal popup logger  

---

## 📋 Requirements

- **Windows OS** (MT5)
- **Chrome** browser
- **MetaTrader 5**
- **TradingView** Free account (no premium needed!)

---

## 🛠️ 4-Step Installation

### **1. TradingBridge.exe**
1. Run `TradingBridge.exe`
2. ✅ Click "Allow access" when Windows asks
3. ✅ If Blocked: Windows Defender → Allow through firewall

### **2. Chrome Extension**
1. Chrome → `chrome://extensions/` → **Developer mode**
2. **Load unpacked** → Select `Tradingview Trade Detector` Extension
3. ✅ Extension ready!

### **3. TradingView Website**
1. Open `List of Trades` Tab in Strategy Tester
2. Click `View Site Information` on Top-left Corner
3. Allow `Local Network Access` Permission - To send Trades to Server  

### **4. MT5 EA**
1. Move `Trading_Bot` Folder to:
```
C:\Users\YourUsername\AppData\Roaming\MetaTrader 5\MQL5\Experts\
```
2. **Add URL:** In MT5 → Tools → Options → Expert Advisors → `http://127.0.0.1:8080`
3. Attach EA to chart →  Tick **Allow Algo Trading**
4. Enable **Algo Trading** (Green) → Button on Top Row


---

## 🚀 Usage

1. Start `TradingBridge.exe` - ✅ Shows: localhost:8080 running
2. Load Chrome extension
3. Open TradingView → Strategy Tester → **List of Trades**
4. Open MT5 → **Attach EA** to any chart  
5. ✅ **Automation active!**  
6. ⚠️ **Important:** Keep TradingView tab visible/foreground (Chrome extension needs it active)

- **Signal appears → Trade executes automatically**  
- You can check All **Trade Logs** in TradingBridge.exe Dashboard  

---

### TradingView Pine Script Setup (Optional)

#### For Variable SL/TP/LOT:

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
```

Similarly in your Short Entry Logic  
**Values should be in PIPS** (not price levels).


#### Without Variable SL/TP/LOT:

If you don't modify your strategy  
The MT5 EA will use **default values** from inputs.


---

## 📊 Signal Format

```
Full: "BUY SL=50 TP=100 LOT=0.01"
Simple: "BUY" or "SELL"
Fallback: "long"→BUY, "short"→SELL
```

---

## 📁 Structure

```
tradingview-mt5-bridge/
├── TradingBridge.exe                                  # HTTP server
├── TradingBot.mq5                                     # MT5 EA 
├── TradingBot.ex5
└── TradingView Trade Detector - Extension/            # Chrome extension
    ├── manifest.json
    ├── content.js
    ├── logger.html
    └── logger.js
```

---

## 🔧 Troubleshooting

**Extension not detecting trades:**
- Refresh TradingView page
- Verify "List of Trades" tab is open


**Server errors:**

❌ "Port 8080 already in use"   →  Close other apps using port 8080  
❌ "Server offline"      →   TradingBridge.exe  
❌ "WebRequest error"     →   Add http://127.0.0.1:8080 to MT5  


**MT5 not trading:**

❌ AutoTrading red? → Click to enable (green)  
❌ Experts tab errors? → Check logs  
❌ Broker restrictions? → Test demo account  


**Rejected/False signals:**

✅ Extension ignores TradingView refresh  
✅ Server rejects pending signals  
✅ If Server **Rejecting Legit Trades** - Try `Clean Old Signal`    
✅ EA checks existing positions  
✅ No Multiple Trades - Only 1 at a Time Allowed  

---

## ⚙️ Configuration

**MT5 EA inputs:**
```
LotSize=0.01
StopLossPoints=50
TakeProfitPoints=100
```

## ❓ FAQ

**Q: Does this work with live trading?**
A: Yes! But always test on demo first.

**Q: Can I modify SL/TP after trade opens?**
A: Yes, But Recommended to modify before attaching to chart.

**Q: Multiple strategies same time?**
A: One instance per symbol recommended.


---

## 🔒 Security

✅ **100% Local** - localhost only   
✅ **No cloud** - No external servers  
✅ **Open Source** - Full transparency  
✅ **No API Keys** - No third-party services  
✅ **Your Credentials** - Stay on your machine only  


---

## ⚠️ Disclaimer

**Educational use only. Test on demo first!**

---

## 📈 v2.0.0 Updates


✅ HTTP bridge (no files!)  
✅ Signal rejection protection  
✅ Production waitress server  
✅ Duplicate/Rapid Trades Handling  


---


## 🔄 File-Based Bridge (Old Version)

For the older file-based bridge using Alerts.txt, see previous releases:  
https://github.com/niiisho/TradingView-MT5-Bridge/releases/v1.0.1

---

## 👨‍💻 For Developers


The EXE source code is available upon request for developers who want to build/modify.  
Contact: See [Support & Contact](#-support--contact) section below.

---


## 📝 License

**MIT License** - See LICENSE file for details.

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

---

## 📧 Support & Contact  

**Issues & Questions:**
- 🐛 Open an issue  
- 💬 Check existing issues first 

**Commercial Support:**  
- 💼 Custom features & modifications  
- 🛠️ Installation assistance  
- 📞 Contact: contactme.ngone@gmail.com 

---

## ⭐ Star History  

If this project helped you, please **star the repository!**  

It helps others discover this free alternative to paid services.  

---

**Built with ❤️ by Nishant P.Garg**  

**© 2025 Nishant Prakash Garg. Released under MIT License.**  
 
---

### 🚨 Important Note
This is an **independent project** and is **not affiliated** with TradingView, MetaQuotes, or MetaTrader 5.

