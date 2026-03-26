<div align="center">
  <img src="public/icons/glot-512.svg" alt="Glot Logo" width="120" />
</div>

<h1 align="center">Glot - AI-Powered IDE</h1>

<div align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-success.svg" alt="Version">
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F.svg?logo=electron&logoColor=white" alt="Built with Electron">
  <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E" alt="Vite">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
</div>

<br>

> A modern, integrated computing environment powered by local Large Language Models (LLMs).

Glot is an advanced Integrated Development Environment (IDE) that seamlessly integrates with a local LLM engine. It provides features like real-time AI assistance, context-aware code analysis, smart terminal management, and robust file editing capabilities.

Quick Start
-----------

* **Get the Source**: `git clone https://github.com/hyunseo2512/Glot.git`
* **Install Dependencies**: `npm install`
* **Run Development Server**: `npm run dev`
* **Build for Linux**: `npm run build && npm run package`

Essential Documentation
-----------------------

All users should be familiar with the following core principles:

* **Project Description**: Glot brings everything together in one unified pane: Write code, run tests in the integrated terminal, manage your Git history, and collaborate with your AI pair-programmer—all without ever leaving your window.
* **Privacy & Security**: By hosting the LLM locally on your machine, Glot ensures that your source code never leaves your workstation, preserving maximum intellectual property security.
* **Prerequisites**: Node.js **v18.0+** and Python **v3.10+** (Required for the AI backend).

For Specific Users
==================

Software Engineer
-----------------

If you are developing software using Glot, familiarize yourself with its core editing capabilities:

* **Advanced Code Editor**: Built on Monaco Editor featuring syntax highlighting, auto-completion, and code formatting.
* **Split Editor**: Edit multiple files simultaneously with horizontal/vertical split views. Toggle using `Ctrl + \`.
* **Integrated Terminal**: Fully-featured pseudo-terminal (pty) with multi-tab support. Toggle quickly using `` Ctrl + ` ``.
* **File Explorer**: Intuitive file management with drag-and-drop support and custom icons.
* **Markdown Preview**: Live-rendered Markdown preview with full HTML support, syntax-highlighted code blocks, and local image rendering.

AI Enthusiast
-------------

If you're utilizing our AI pair programmer, explore these features:

* **AI Integration**: Engage in real-time conversational AI powered by local models like DeepSeek or Llama 3.
* **Context Awareness**: Open the right AI Panel to ask questions; the LLM automatically understands the context of your currently active file.
* **Diff Viewer**: Visually compare Git changes and seamlessly review AI-suggested code modifications before applying them.

System Administrator / DevOps
-----------------------------

For users deploying and managing remote systems:

* **Source Control**: Built-in Git integration for staging, committing, and viewing diffs directly in the sidebar.
* **Remote SSH**: Connect to remote servers and intuitively edit remote configuration files directly within the local IDE.
* **Command Palette**: Quickly search and execute commands across the workspace using `Ctrl + Shift + P`.

Themes
------

Glot ships with three built-in themes optimized for all-day coding:

* **Modern White**: A clean light theme with high-contrast colors for bright environments.
* **Modern Dark**: A balanced dark theme as the default, easy on the eyes.
* **Tokyo Night**: A stylish dark theme inspired by the iconic Tokyo Night color palette.

Switch themes instantly via **Settings → Editor → Theme**.
