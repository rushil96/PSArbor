import threading
import time
import os
import random

def worker_thread(thread_id):
    """
    A simple worker thread that performs light operations
    to show activity in the process manager without being intensive.
    """
    print(f"Thread-{thread_id} started (PID: {os.getpid()})")
    while True:
        # Simulate some very light work
        _ = [random.random() for _ in range(100)]
        
        # Sleep to keep CPU usage low as requested
        time.sleep(random.uniform(1.0, 3.0))
        
        # Occasional log
        if random.random() < 0.1:
            print(f"Thread-{thread_id} is pulse checking...")

def main():
    print("=== Multi-threaded Monitor Test ===")
    print(f"Main Process PID: {os.getpid()}")
    print("Spawning 5 worker threads...")
    
    threads = []
    for i in range(5):
        t = threading.Thread(target=worker_thread, args=(i,), daemon=True)
        t.start()
        threads.append(t)
    
    try:
        while True:
            time.sleep(10)
            print("-- Main thread heartbeat --")
    except KeyboardInterrupt:
        print("\nExiting monitoring test...")

if __name__ == "__main__":
    main()
