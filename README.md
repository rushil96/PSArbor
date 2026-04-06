# 🚀 PSArbor

### **High-Performance, Glassmorphic System Monitor with Intuitive Forest View Hierarchy**

PSArbor is a professional-grade process manager for **macOS** and **Linux**, designed for users who need deep visibility into their system's anatomy. Powered by **Tauri 2.0**, **Rust**, and **Next.js**, it combines native speed with a fluid, hardware-accelerated UI.

![PSArbor Glassmorphic Icon](src-tauri/icons/icon.png)

---

## ✨ Key Features

*   **💎 Glassmorphic Aesthetics**: A high-contrast, premium interface that feels at home on modern OSes.
*   **🌳 Forest View (Tree Mode)**: Intuitively visualize process hierarchies and parent-child relationships.
*   **🔍 Deep Inspector**: Drill down into command-line arguments, environment variables, working directories, and live file/network handles.
*   **🛡️ Security Audit**: Instant links to VirusTotal and Google Research for any suspicious process.
*   **⚡ Performance Mode**: Toggle sparklines and animations for ultra-low resource monitoring on high-load systems.
*   **📊 Hardware Health**: Monitor CPU temperatures, disk throughput, and network activity in real-time.
*   **📥 Professional Exports**: Snapshot your process list and export to high-fidelity CSV for forensic analysis.

---

## 🛠️ Quick Start (Development)

### Prerequisites
*   **Node.js** (v18+)
*   **Rust** (v1.77+ via [rustup](https://rustup.rs/))
*   **Tauri Dependencies**: Follow the [Tauri setup guide](https://tauri.app/start/prerequisites/) for your OS.

### Installation
```bash
git clone https://github.com/<your-github-username>/psarbor.git
cd psarbor
npm install
```

### Run in Development
```bash
npx tauri dev
```

---

## 🏗️ Production Deployment

Ready to distribute? We support **DMG** and **App** bundles for macOS, and **Deb** or **AppImage** for Linux.

For detailed production build instructions, see our [**Deployment Guide (DEPLOYMENT.md)**](DEPLOYMENT.md).

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with ❤️ using Tauri & Next.js*
