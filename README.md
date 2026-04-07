# 🌳 PSArbor - Lightweight process visualizer for macOS and Ubuntu servers

---

## 🚀 Overview

PSArbor is a process visualizer for macOS and Ubuntu. It uses a "Forest View" to show process hierarchies and is built with **Rust**, **Tauri**, and **Next.js** for high performance.

## ✨ Features

*   **🌳 Forest View**: Hierarchical parent-child process visualization.
*   **🔍 Process Inspector**: View command-line arguments, environment variables, and file paths.
*   **📊 GUI lsof**: View open file handles and network sockets without running any CLI commands.
*   **📈 Resource Monitoring**: Real-time tracking of RAM and CPU usage per process.
*   **🛡️ Security Check**: Instant reputation lookups on VirusTotal and Google.
*   **🌡️ Hardware Metrics**: Monitor CPU temperatures, disk throughput, and network activity.
*   **⚡ Lightweight**: Built with Rust and Tauri for high performance and low resource footprint.
*   **🎨 Glassmorphic UI**: Hardware-accelerated, modern interface.
*   **📥 CSV Export**: Export process lists for external analysis.

---

## 🛠️ Quick Start

### Prerequisites
*   **Node.js** (v18+)
*   **Rust** (v1.77+ via [rustup](https://rustup.rs/))
*   **Tauri Dependencies**: [Setup Guide](https://tauri.app/start/prerequisites/)

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/rushil96/PSArbor.git
cd PSArbor

# Install dependencies
npm install

# Start in development mode
npm run tauri dev
```

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with ❤️ for the community using Tauri & Next.js*
