#!/bin/bash
# MaxMCP MCP Server Wrapper
# This script acts as the MCP server, handling stdio communication
# and passing data to/from Max via the maxmcp.server external

# Enable debug logging if DEBUG env var is set
if [ -n "$DEBUG" ]; then
    exec 2>> /tmp/maxmcp-debug.log
    set -x
    echo "=== MaxMCP MCP Server starting at $(date) ===" >&2
fi

# Path to Max patch
PATCH_PATH="/Users/yamato/Src/proj_max_mcp/MaxMCP/package/MaxMCP/patchers/maxmcp-server-test.maxpat"

# Open Max with the patch
# Note: This will launch Max as a GUI app, but the maxmcp.server external
# will handle stdio communication directly
open -a Max "$PATCH_PATH"

# Wait a moment for Max to initialize
sleep 2

# Now act as stdio passthrough
# In this initial version, we just relay stdin/stdout
# The maxmcp.server external should be reading stdin and writing to stdout

# Read from stdin and forward (this is a placeholder - actual implementation
# will depend on how Max external communicates)
while IFS= read -r line; do
    echo "$line" >&2  # Debug: log incoming requests
    # TODO: Send to Max external via some IPC mechanism
    # For now, just echo back an error
    echo '{"jsonrpc":"2.0","error":{"code":-32603,"message":"Max communication not yet implemented"},"id":null}'
done
