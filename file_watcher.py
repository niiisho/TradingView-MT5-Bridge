"""
TradingView to MT5 Bridge - File Watcher

Copyright (c) 2025 Nishant P.Garg
Licensed under MIT License

GitHub: https://github.com/niiisho/tradingview-mt5-bridge

Monitors source file and copies filtered signals to MT5 alerts file
"""

import os
import shutil
import time
import configparser
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class FileWatcher(FileSystemEventHandler):
    def __init__(self, source_file, destination_file):
        self.source_file = os.path.abspath(source_file)
        self.destination_file = destination_file
        print(f"🔍 Monitoring: {self.source_file}")
        print(f"📋 Will copy to: {destination_file}")
        print("=" * 50)
    
    def on_modified(self, event):
        if os.path.abspath(event.src_path) == self.source_file and not event.is_directory:
            try:
                time.sleep(0.1)
                shutil.copyfile(self.source_file, self.destination_file)
                
                timestamp = time.strftime("%H:%M:%S")
                print(f"✅ [{timestamp}] Copied {os.path.basename(self.source_file)} → alerts.txt")
                
            except Exception as e:
                print(f"❌ Error copying file: {e}")

def load_config():
    """Load configuration from config.ini"""
    config = configparser.ConfigParser()
    
    if not os.path.exists('config.ini'):
        print("❌ config.ini not found!")
        print("Please make sure config.ini is in the same folder as file_watcher.py")
        input("Press Enter to exit...")
        exit(1)
    
    config.read('config.ini')
    
    try:
        source_file = config.get('Paths', 'source_file')
        destination_file = config.get('Paths', 'destination_file')
    except:
        print("❌ Error reading config.ini!")
        print("Please check the file format.")
        input("Press Enter to exit...")
        exit(1)
    
    return source_file, destination_file

if __name__ == "__main__":
    print("🚀 TradingView to MT5 Bridge - File Watcher")
    print("=" * 50)
    
    # Load configuration
    SOURCE_FILE, DESTINATION_FILE = load_config()
    
    # Validate paths
    if "YOUR_USERNAME" in DESTINATION_FILE or "YOUR_TERMINAL_ID" in DESTINATION_FILE:
        print("❌ Please edit config.ini with your actual paths!")
        print("Replace YOUR_USERNAME and YOUR_TERMINAL_ID with your values.")
        print(f"\nCurrent destination: {DESTINATION_FILE}")
        input("\nPress Enter to exit...")
        exit(1)
    
    # Create destination directory if it doesn't exist
    try:
        os.makedirs(os.path.dirname(DESTINATION_FILE), exist_ok=True)
    except Exception as e:
        print(f"❌ Error creating destination folder: {e}")
        input("Press Enter to exit...")
        exit(1)
    
    # Create source file if it doesn't exist
    source_path = os.path.abspath(SOURCE_FILE)
    if not os.path.exists(source_path):
        try:
            # Create directory if needed
            source_dir = os.path.dirname(source_path)
            if source_dir and not os.path.exists(source_dir):
                os.makedirs(source_dir, exist_ok=True)
            
            open(source_path, 'w').close()
            print(f"📝 Created {source_path}")
        except Exception as e:
            print(f"❌ Error creating source file: {e}")
            input("Press Enter to exit...")
            exit(1)
    else:
        # Clear the source file when watcher starts
        with open(source_path, 'w') as f:
            f.write('')
        print(f"🧹 Cleared {os.path.basename(source_path)}")
    
    # Start monitoring
    event_handler = FileWatcher(SOURCE_FILE, DESTINATION_FILE)
    observer = Observer()
    
    # Watch the directory containing source file
    watch_dir = os.path.dirname(os.path.abspath(SOURCE_FILE))
    if not watch_dir:
        watch_dir = '.'  # Current directory if relative path
    
    observer.schedule(event_handler, path=watch_dir, recursive=False)
    observer.start()
    
    print("🚀 File watcher started!")
    print("Press Ctrl+C to stop...")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n⏹️ File watcher stopped")
    
    observer.join()
