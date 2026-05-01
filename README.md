# LeGeberew (ለገበሬው) - Edge AI Plant Doctor

**LeGeberew** is a high-performance mobile application designed for off-grid agricultural diagnostics. By combining a high-safety **Rust** systems core with a modern **React Native** interface, the app performs real-time plant disease detection directly on the device, ensuring privacy and functionality without an internet connection.
## 🏗 High-Level Architecture

This project implements a **Native-Bridge** architecture:

- **Core Logic:** Developed in **Rust** for memory safety and computational speed.
- **Binding Layer:** Uses **UniFFI** and **JNI** to expose Rust functions to the Android JVM.
- **UI Layer:** A **React Native (Bare Workflow)** application providing a responsive experience for farmers.
- **Hardware Acceleration:** Optimized for ARM64 architectures (Android) using the NDK.

## 🚀 Tech Stack

- **Languages:** Rust (Core), Kotlin (Android Bridge), TypeScript (Mobile UI).
- **Environment:** Ubuntu 24.04 LTS.
- **Toolchain:**
    - Java JDK 17
    - Node.js 20.x
    - Android NDK 26.1.10909125
    - Rust Target: `aarch64-linux-android`
- **Framework:** React Native (CLI)

## 🛠 Project Structure

```text
legeberew_project/
├── rust_core/              # Rust source code (Business logic & AI Inference)
│   ├── src/
│   └── target/             # Compiled binaries (.so files)
├── LeGeberewApp/           # React Native Mobile Application
│   ├── android/            # Native Android project configuration
│   │   └── app/src/main/jniLibs/  # Location of linked Rust binaries
│   └── src/                # UI Components and TypeScript logic
└── README.md
```

## ⚙️ Development Setup

### 1. Prerequisites

Ensure your Ubuntu machine has the cross-compilation targets installed:

```bash
rustup target add aarch64-linux-android
cargo install cargo-ndk
```
### 2. Building the Core

Navigate to the `rust_core` directory and compile the shared library:

```bash
cargo ndk -t arm64-v8a build --release
```
### 3. Deploying to Mobile

1. Connect a physical Android device via USB (Developer Mode & USB Debugging enabled).
2. Start the Metro Bundler:
	``` bash
	 npm start
	```
3. Run the application:
	```bash
	npm run android
	```


## 📱 Hardware Targets

The current build is optimized and tested on:

- **Development Host:** HP EliteBook (i5 6th Gen) / Ubuntu 24.04.
- **Target Device:** Samsung Galaxy J6+ (ARM64).

## 📄 License

This project is licensed under the MIT License.

---

**Author:** Lemi Negeso/lemiti 
**Field:** Computer Engineering

---
