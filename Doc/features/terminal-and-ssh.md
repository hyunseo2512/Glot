# Terminal and SSH Integration

Gluon provides an embedded, cross-platform terminal experience and remote SSH capabilities so you never have to leave the window.

## Integrated Terminal (node-pty)

Opening the panel with `` Ctrl + ` `` launches a real pseudo-terminal instance (PTY).
- It spawns your system's default shell (`bash`, `zsh`, or `powershell`).
- You can split or add new tabs using the terminal tab bar.
- Fully supports ANSI escape codes, colored outputs, and interactive CLI applications like `vim` or `htop`.

## Remote SSH Editing

Clicking the **Remote SSH** button allows you to connect instantly to external servers.
- **Workflow**: Enter `user@host` and your password/key. Gluon connects via the `ssh2` Node package.
- **File System**: Gluon mounts a remote directory view in the File Explorer.
- **Editing**: When you edit and save a file, it securely transfers the changes via SFTP in the background.

*This document is a work-in-progress draft.*
