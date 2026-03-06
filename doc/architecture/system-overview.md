# System Architecture Overview

This document outlines the high-level architecture of the Gluon IDE.

## 1. Core Paradigm

Gluon is an Electron-based application comprising three primary components:
1. **Main Process (Backend)**: Manages OS-level APIs, window lifecycles, and backend services (Node.js).
2. **Renderer Process (Frontend)**: Handles the user interface, React tree, and Monaco Editor.
3. **Python AI Engine**: Runs local Large Language Models (LLMs) and context analysis.

## 2. Component Interaction (IPC)

The Renderer process rarely interacts with the OS directly. Instead, it sends messages via Inter-Process Communication (IPC) to the Main process. 

For instance, when a user asks the AI a question:
1. User types in the **React Frontend** (Renderer).
2. React sends an IPC call via `window.api` (Preload script).
3. The **Main Process** forwards the request to the **Python AI Service**.
4. The AI Service streams the response back through the Main Process to the Frontend.

## 3. Directory Structure

```text
src/
├── main/          # Backend code (Electron)
│   ├── services/  # Sub-services (Linter, Environment)
│   └── preload.ts # IPC bindings
├── renderer/      # Frontend code (React + Vite)
│   ├── components/# Reusable UI elements
│   ├── store/     # State management (Zustand)
│   └── themes/    # Custom editor syntax themes
└── ...
```

*This document is a work-in-progress draft.*
