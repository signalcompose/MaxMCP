#!/bin/bash
# MaxMCP stdio-UDP Bridge
# Converts stdio (Claude Code) ⟷ UDP (Max)

set -euo pipefail

# Configuration
UDP_SEND_PORT=7400    # Send to Max [udpreceive 7400]
UDP_RECV_PORT=7401    # Receive from Max [udpsend localhost 7401]
LOG_FILE="/tmp/mcp-bridge.log"

# Enable debug logging
exec 2>> "$LOG_FILE"
echo "[$(date)] Bridge starting..." >&2

# Cleanup handler
cleanup() {
    echo "[$(date)] Bridge shutting down..." >&2
    if [[ -n "${UDP_RECV_PID:-}" ]]; then
        kill "$UDP_RECV_PID" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start UDP receiver in background (Max → stdout)
(
    while true; do
        nc -ul "$UDP_RECV_PORT" 2>> "$LOG_FILE" || {
            echo "[$(date)] UDP receiver error, restarting..." >&2
            sleep 0.1
        }
    done
) &
UDP_RECV_PID=$!
echo "[$(date)] UDP receiver started (PID: $UDP_RECV_PID)" >&2

# Read from stdin and send to Max via UDP (stdin → Max)
while IFS= read -r line; do
    echo "[$(date)] Received from stdin: $line" >&2
    echo "$line" | nc -u -w0 localhost "$UDP_SEND_PORT" 2>> "$LOG_FILE" || {
        echo "[$(date)] Failed to send to Max" >&2
    }
done

# Cleanup
cleanup
