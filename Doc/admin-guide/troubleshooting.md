# Troubleshooting Guide

This guide helps administrators and developers diagnose common issues encountered while running or building Glot.

## 1. Native Module Compilation Errors (node-pty)
Glot utilizes `node-pty` for the integrated terminal. Since it is a native C++ module, it must be rebuilt whenever the Node.js or Electron version changes.

**Symptom:** The IDE launches, but the terminal panel crashes or fails to open with an `Uncaught Exception` regarding `node-pty`.

**Solution:**
Force rebuilding native dependencies using `electron-builder`:
```bash
npm run postinstall
# or manually:
npx electron-rebuild
```

## 2. Python AI Backend Fails to Start
**Symptom:** The AI panel shows "Disconnected" or fails to generate responses.

**Solution:**
1. Verify that Python 3.10+ is installed on the machine.
2. Check the path configured in the global settings.
3. Look for port collisions (the backend usually binds to a local port).

*This document is a work-in-progress draft.*
