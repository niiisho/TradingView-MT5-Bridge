from flask import Flask, request, jsonify
from flask_cors import CORS
import tkinter as tk
from tkinter import scrolledtext
import threading
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Store signal with status flag
current_signal = {
    "signal": "NONE",
    "timestamp": "",
    "status": "PROCESSED"
}

log_widget = None

def log(msg):
    """Add message to GUI"""
    if log_widget:
        time = datetime.now().strftime("%H:%M:%S")
        log_widget.insert(tk.END, f"[{time}] {msg}\n")
        log_widget.see(tk.END)
    print(msg)


def clear_signal_manual():
    """Manual clear button"""
    global current_signal
    current_signal = {
        "signal": "NONE",
        "timestamp": "",
        "status": "PROCESSED"
    }
    log(f"✅ Signal manually cleared!")



@app.route('/signal', methods=['GET'])
def get_signal():
    """MT5 reads from here"""
    return jsonify(current_signal)


@app.route('/signal', methods=['POST'])
def post_signal():
    global current_signal
    data = request.json
    signal_value = data.get('signal', 'NONE')
    
    # 🔥 CHECK IF SIGNAL IS ALREADY PENDING
    if current_signal["status"] == "NEW":
        log(f"⚠️ REJECTED: '{signal_value}' - Previous signal still pending!")
        return jsonify({"status": "rejected", "reason": "signal_pending"})
    
    # Only accept if no pending signal
    current_signal = {
        "signal": signal_value,
        "timestamp": datetime.now().isoformat(),
        "status": "NEW"
    }
    
    log(f"📊 NEW Signal: {signal_value}")
    return jsonify({"status": "success"})


@app.route('/signal/processed', methods=['POST'])
def mark_processed():
    """MT5 calls this after executing trade"""
    global current_signal
    current_signal["status"] = "PROCESSED"
    log(f"✅ Signal marked as PROCESSED")
    return jsonify({"status": "success"})


@app.route('/signal/clear', methods=['POST'])
def clear_signal():
    """Reset to NONE"""
    global current_signal
    current_signal = {
        "signal": "NONE",
        "timestamp": "",
        "status": "PROCESSED"
    }
    log("🗑️ Signal cleared")
    return jsonify({"status": "success"})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "running"})

def run_production_server():
    """Run production server with Waitress"""
    try:
        # Try to import waitress (production server)
        from waitress import serve
        log("🚀 Starting production server (Waitress)...")
        serve(app, host='127.0.0.1', port=8080, threads=4)
    except ImportError:
        # Fallback to Flask dev server if waitress not installed
        log("⚠️ Waitress not found, using development server")
        log("⚠️ For production use: pip install waitress")
        app.run(host='127.0.0.1', port=8080, debug=False, use_reloader=False)

def create_gui():
    global log_widget
    
    root = tk.Tk()
    root.title("TradingBridge Server")
    root.geometry("550x400")
    
    # Header
    header = tk.Label(root, text="🚀 TradingView Bridge", 
                      font=("Arial", 14, "bold"), 
                      bg="#4CAF50", fg="white", pady=10)
    header.pack(fill=tk.X)
    
    # Status
    status = tk.Label(root, text="✅ Production Server Running on localhost:8080", 
                      font=("Arial", 10), fg="green")
    status.pack(pady=10)

    clear_btn = tk.Button(root, 
                         text="🗑️ Clear Old Signal", 
                         command=clear_signal_manual,
                         font=("Arial", 10, "bold"),
                         bg="#FF6B6B", 
                         fg="white",
                         cursor="hand2",
                         relief="raised",
                         padx=20,
                         pady=5)
    clear_btn.pack(pady=5)
    
    info = tk.Label(root, text="Keep this window open while trading", 
                    font=("Arial", 9), fg="gray")
    info.pack()
    
    # Log section
    tk.Label(root, text="Signal Log:", font=("Arial", 9, "bold")).pack(pady=5)
    
    log_widget = scrolledtext.ScrolledText(root, height=15, 
                                           font=("Courier", 9),
                                           bg="#1e1e1e", fg="#00ff00")
    log_widget.pack(padx=10, pady=5, fill=tk.BOTH, expand=True)
    
    # Initial messages
    log("✅ Server started successfully!")
    log("🔧 Production mode - No Flask warnings!")
    log("📡 Waiting for signals from TradingView...")
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_production_server, daemon=True)
    server_thread.start()
    
    root.mainloop()

if __name__ == '__main__':
    print("WARNING: This software can execute live trades. Use at your own risk. See README for full disclaimer.")
    create_gui()