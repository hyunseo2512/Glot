#!/bin/bash
# Replace symlink with wrapper script that runs Gluon in background
# (like VS Code's /usr/bin/code)

WRAPPER="/usr/bin/gluon"

# Remove default symlink created by electron-builder
rm -f "$WRAPPER"

# Create wrapper script
cat > "$WRAPPER" << 'EOF'
#!/bin/bash
nohup /opt/Gluon/gluon --no-sandbox --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime "$@" > /dev/null 2>&1 &
disown
EOF

chmod +x "$WRAPPER"

# Patch desktop file to include --no-sandbox
DESKTOP="/usr/share/applications/gluon.desktop"
if [ -f "$DESKTOP" ]; then
  sed -i 's|Exec=/opt/Gluon/gluon|Exec=/opt/Gluon/gluon --no-sandbox|g' "$DESKTOP"
fi

echo "Gluon installed successfully! Run 'gluon' to start."
