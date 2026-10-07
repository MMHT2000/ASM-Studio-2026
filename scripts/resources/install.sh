#!/usr/bin/env bash
# ASM Studio 2026 - User-level Desktop Installer for Ubuntu / Linux
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$HOME/.local/share/asm-studio"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

echo "================================================="
echo "   ASM Studio 2026 — Linux Desktop Installer     "
echo "================================================="

mkdir -p "$APP_DIR" "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR"

echo "--> Copying files to $APP_DIR..."
cp -r "$SCRIPT_DIR"/* "$APP_DIR/"
chmod +x "$APP_DIR/asm-studio"

echo "--> Installing desktop icon..."
cp "$SCRIPT_DIR/icon.png" "$ICON_DIR/asm-studio.png"

echo "--> Creating launcher symlink in $BIN_DIR/asm-studio..."
ln -sf "$APP_DIR/asm-studio" "$BIN_DIR/asm-studio"

echo "--> Creating desktop shortcut in $DESKTOP_DIR/asm-studio.desktop..."
cat <<EOF > "$DESKTOP_DIR/asm-studio.desktop"
[Desktop Entry]
Name=ASM Studio 2026
Comment=Modern Intel 8086 Assembly IDE & Simulator
Exec=$APP_DIR/asm-studio %U
Icon=asm-studio
Terminal=false
Type=Application
Categories=Development;IDE;
StartupWMClass=ASM Studio 2026
EOF

chmod +x "$DESKTOP_DIR/asm-studio.desktop"

# Refresh desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "Installation complete!"
echo "You can now launch 'ASM Studio 2026' from your Ubuntu application menu"
echo "or type 'asm-studio' from your terminal."
echo "================================================="

