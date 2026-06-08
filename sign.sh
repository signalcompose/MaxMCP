#!/bin/bash
#
# MaxMCP Sign & Notarize Script (macOS, arm64)
#
# Signs the built external with a Developer ID Application certificate,
# submits it to Apple for notarization, and staples the ticket so it
# passes Gatekeeper on a clean Mac.
#
# Order matters: nested dylibs are signed first (inside-out), then the
# bundle. Max's own frameworks (MaxAudioAPI / JitterAPI) are referenced
# via @executable_path and provided by Max at runtime, so they are NOT
# bundled and NOT signed here.
#
# Prerequisites:
#   1. ./build.sh   (produces package/MaxMCP/externals/maxmcp.mxo)
#   2. A "Developer ID Application" certificate in your login keychain
#        security find-identity -v -p codesigning
#   3. Stored notarization credentials (one-time, see --setup-credentials)
#
# Usage:
#   ./sign.sh --setup-credentials   # one-time: store Apple notary credentials
#   ./sign.sh                       # sign + notarize + staple
#   ./sign.sh --sign-only           # sign + verify, skip notarization
#
# Configuration (environment variables, all optional):
#   MAXMCP_SIGN_IDENTITY  Signing identity. Default: "Developer ID Application"
#                         (matches the only such cert; set the full
#                          "Developer ID Application: Name (TEAMID)" if you
#                          have more than one).
#   MAXMCP_NOTARY_PROFILE Keychain profile name for notarytool.
#                         Default: "MaxMCPNotary"
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MXO="$SCRIPT_DIR/package/MaxMCP/externals/maxmcp.mxo"
BUILD_DIR="$SCRIPT_DIR/build"
ZIP_PATH="$BUILD_DIR/maxmcp-notarize.zip"

SIGN_IDENTITY="${MAXMCP_SIGN_IDENTITY:-Developer ID Application}"
NOTARY_PROFILE="${MAXMCP_NOTARY_PROFILE:-MaxMCPNotary}"

# --- One-time credential setup -------------------------------------------
# Stores an App Store Connect API key (or Apple ID app-specific password)
# in the keychain under $NOTARY_PROFILE so notarytool can run unattended.
if [ "${1:-}" = "--setup-credentials" ]; then
    echo "Storing notarization credentials under profile: $NOTARY_PROFILE"
    echo "You will be prompted for Apple ID / Team ID / app-specific password,"
    echo "or pass an App Store Connect API key. See:"
    echo "  xcrun notarytool store-credentials --help"
    echo ""
    xcrun notarytool store-credentials "$NOTARY_PROFILE"
    exit 0
fi

SIGN_ONLY=false
[ "${1:-}" = "--sign-only" ] && SIGN_ONLY=true

# --- Pre-flight checks ---------------------------------------------------
echo "=== MaxMCP Sign & Notarize ==="
echo ""

if [ ! -d "$MXO" ]; then
    echo "Error: $MXO not found. Run ./build.sh first."
    exit 1
fi

if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "Error: No 'Developer ID Application' certificate found in keychain."
    echo "Check with: security find-identity -v -p codesigning"
    exit 1
fi
echo "[1/6] Signing identity: $SIGN_IDENTITY"

# --- Sign nested dylibs first (inside-out) -------------------------------
echo "[2/6] Signing bundled dylibs..."
for dylib in "$MXO"/Contents/Frameworks/*.dylib; do
    [ -e "$dylib" ] || continue
    chmod u+w "$dylib"   # Homebrew dylibs are installed read-only
    codesign --force --timestamp --options runtime \
        --sign "$SIGN_IDENTITY" "$dylib"
    echo "    signed: $(basename "$dylib")"
done

# --- Sign the bundle (after its contents) --------------------------------
echo "[3/6] Signing bundle..."
codesign --force --timestamp --options runtime \
    --sign "$SIGN_IDENTITY" "$MXO"

# --- Verify signature ----------------------------------------------------
echo "[4/6] Verifying signature..."
codesign --verify --strict --verbose=2 "$MXO"
echo "    OK"

if [ "$SIGN_ONLY" = true ]; then
    echo ""
    echo "=== Sign-only complete (notarization skipped) ==="
    exit 0
fi

# --- Notarize ------------------------------------------------------------
echo "[5/6] Notarizing (this may take a few minutes)..."
mkdir -p "$BUILD_DIR"
rm -f "$ZIP_PATH"
# notarytool requires an archive; zip the bundle preserving its top folder.
ditto -c -k --keepParent "$MXO" "$ZIP_PATH"
xcrun notarytool submit "$ZIP_PATH" \
    --keychain-profile "$NOTARY_PROFILE" \
    --wait

# --- Staple --------------------------------------------------------------
echo "[6/6] Stapling ticket..."
xcrun stapler staple "$MXO"
xcrun stapler validate "$MXO"

echo ""
echo "=== Sign & Notarize Complete ==="
echo "Signed, notarized, and stapled: $MXO"
echo ""
echo "Next: ./deploy.sh (local test) or build the distribution zip for submission."
echo "Tip: verify on a clean Mac after download (Gatekeeper / quarantine)."
