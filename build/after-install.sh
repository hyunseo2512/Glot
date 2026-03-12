#!/bin/bash
# Replace symlink with wrapper script that runs Glot in background
# (like VS Code's /usr/bin/code)

WRAPPER="/usr/bin/glot"

# Remove default symlink created by electron-builder
rm -f "$WRAPPER"

# Create wrapper script
cat > "$WRAPPER" << 'EOF'
#!/bin/bash
nohup /opt/Glot/glot --no-sandbox --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime "$@" > /dev/null 2>&1 &
disown
EOF

chmod +x "$WRAPPER"

# Patch desktop file to include --no-sandbox
DESKTOP="/usr/share/applications/glot.desktop"
if [ -f "$DESKTOP" ]; then
  sed -i 's|Exec=/opt/Glot/glot|Exec=/opt/Glot/glot --no-sandbox|g' "$DESKTOP"
fi

echo "Glot installed successfully! Run 'glot' to start."
