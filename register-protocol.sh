#!/bin/bash

# Create desktop entry for Glot Protocol handling in dev mode
DESKTOP_FILE="$HOME/.local/share/applications/glot-dev.desktop"
PROJECT_PATH=$(pwd)
EXEC_PATH="$PROJECT_PATH/node_modules/.bin/electron $PROJECT_PATH"

echo "Creating desktop entry at $DESKTOP_FILE"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Glot Dev
Exec=$EXEC_PATH %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/glot;
EOF

# Register the protocol
echo "Updating desktop database..."
update-desktop-database "$HOME/.local/share/applications/"
xdg-mime default glot-dev.desktop x-scheme-handler/glot

echo "✅ Glot protocol registered! You can now use deep links."
echo "Test command: xdg-open 'glot://auth?token=TEST'"
