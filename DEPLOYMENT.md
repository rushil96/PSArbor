# 📦 PSArbor: Deployment & Production Guide

This guide provides the full pipeline for building and distributing **PSArbor** as a production-grade desktop application using **Tauri 2.0**.

---

## 🛠️ Build Prerequisites

Before building for production, ensure your development environment is fully prepared:

### 1. Rust Toolchain (v1.77+)
The backend requires a modern stable Rust.
```bash
rustup update stable
```

### 2. Node.js (v18+)
The Next.js frontend requires Node. Ensure your dependencies are up to date:
```bash
cd frontend && npm install && cd ..
```

### 3. System Dependencies (Linux Only)
If building on Linux (Debian/Ubuntu), ensure webkit and other libraries are installed:
```bash
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## 🚀 The Build Pipeline

PSArbor uses a two-stage build process automated by Tauri.

### Single Command Build
Run the following command from the **root directory**:
```bash
npx tauri build
```

This command automatically executes:
1.  **Next.js Export**: `npm run build` in the `frontend/` directory (generates static files in `frontend/out/`).
2.  **Rust Compilation**: Compiles the backend in `release` mode with optimizations.
3.  **Bundling**: Packs the executable, icons, and assets into a native installer.

---

## 📦 Output Artifacts

Once the build completes, find your installers here:

*   **macOS**: `src-tauri/target/release/bundle/dmg/*.dmg` or `.app`
*   **Linux**: `src-tauri/target/release/bundle/deb/*.deb` or `.AppImage`

---

## 🎨 Branding & Icons

To update the application icons, place a **1024x1024 PNG** as `src-tauri/icons/icon.png` and run the Tauri icon generator:
```bash
npx tauri icon
```
This will regenerate all required formats for macOS and Linux (`.icns`, `.ico`, etc.).

---

## 🤖 CI/CD (Optional)

We recommend using **GitHub Actions** for automated builds across all platforms. Below is a professional template (`.github/workflows/build.yml`):

```yaml
name: "Production Build"
on:
  push:
    branches: ["main"]

jobs:
  build-tauri:
    strategy:
      fail-fast: false
      matrix:
         platform: [macos-latest, ubuntu-22.04]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - name: setup node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: setup rust
        uses: dtolnay/rust-toolchain@stable
      - name: install frontend deps
        run: npm install --prefix frontend
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__ # version from package.json
          releaseName: "PSArbor v__VERSION__"
          releaseBody: "Automated Release"
          releaseDraft: true
          prerelease: false
```

---
*For support or issue reporting, please visit our Internal Documentation.*
