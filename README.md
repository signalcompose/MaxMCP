# MaxMCP - Native MCP Server for Max/MSP

Control your Max/MSP patches with Claude Code using natural language.

## Inspiration

This project was inspired by the [MaxMSP-MCP-Server-multipatch](https://github.com/your-username/MaxMSP-MCP-Server-multipatch) implementation. We reimagined the architecture with a native C++ approach for improved performance and simplified deployment.

## Overview

MaxMCP is a native C++ external object for Max/MSP that acts as an MCP (Model Context Protocol) server. It enables Claude Code to control Max/MSP patches through natural language commands, with zero configuration required from users.

## Key Features

- ✅ **Zero configuration**: Just place `[maxmcp]` in your patch
- ✅ **Automatic patch detection**: Auto-generated patch IDs
- ✅ **Natural language control**: "Add a 440Hz oscillator to synth patch"
- ✅ **Multi-patch support**: Control multiple patches simultaneously
- ✅ **Auto-cleanup**: Lifecycle management on patch close

## Architecture

```
Claude Code (MCP Client)
    ↕ stdio (JSON-RPC)
Node.js Bridge (websocket-mcp-bridge.js)
    ↕ WebSocket
[maxmcp] C++ External Object
    ↕ Max API
Max/MSP Patches
```

**Components**:
- **maxmcp.mxo**: Single unified external with two modes:
  - `@mode agent`: WebSocket server, MCP protocol handler (1 per Max instance)
  - `@mode patch`: Patch registration (1 per controllable patch, default)
- **Bridge**: stdio ↔ WebSocket translator (Node.js, launched by Max)

## Tech Stack

- **Language**: C/C++ (Max SDK 8.6+)
- **Build System**: CMake 3.19+
- **Architecture**: arm64 (Apple Silicon native)
- **MCP Protocol**: stdio-based JSON-RPC
- **JSON Library**: nlohmann/json 3.11.0+
- **WebSocket**: libwebsockets (bundled)
- **TLS**: OpenSSL 3.x (bundled)
- **Code Signing**: Ad-hoc signature (auto-applied)
- **Distribution**: Max Package

## Architecture Evolution

This implementation reimagines the previous approach:
- ❌ Python MCP Server
- ❌ Node.js Socket.IO Server
- ❌ 6 JavaScript files (max_mcp_node.js, mcp-router.js, etc.)
- ✅ **1 C++ external object** (99% reduction)

## Installation

### Option 1: Max Package Manager (Recommended)
1. Open Max/MSP
2. File → Show Package Manager
3. Search "MaxMCP"
4. Click Install

### Option 2: Manual Install
1. Download latest release
2. Extract to `~/Documents/Max 9/Packages/`
3. Restart Max

## Quick Start

### 1. Install Dependencies (First Time Only)
Open `00-setup.maxpat` from the MaxMCP package and click the message box to run npm install.

### 2. Start MCP Server
Open `01-claude-code-connection.maxpat` and click "start" to launch the server and bridge.

### 3. Configure Claude Code
Run this command in your terminal:
```bash
claude mcp add maxmcp node ~/Documents/Max\ 9/Packages/MaxMCP/support/bridge/websocket-mcp-bridge.js ws://localhost:7400
```

### 4. Create Controllable Patch
In your Max patch, add:
```
[maxmcp @mode patch @alias my-synth @group synth]
```

Or use default mode (patch):
```
[maxmcp @alias my-synth @group synth]
```

This registers your patch for Claude Code control.

### 5. Control with Natural Language
In Claude Code, say:
- "List all active Max patches"
- "Add a 440Hz oscillator to my-synth patch"

**Note**: After modifying package files (examples, support), copy them to Max:
```bash
cp -R package/MaxMCP ~/Documents/Max\ 9/Packages/
```

## Development Status

**Current Phase**: Phase 2 Complete (E2E WebSocket MCP Connection)

✅ **Completed**:
- Phase 1: Core external objects (maxmcp.agent, maxmcp.client)
- Phase 2: WebSocket bridge, MCP protocol implementation, E2E connection

🔄 **Next**:
- Phase 3: Additional MCP tools, enhanced patch control

See `docs/` for detailed specifications and development roadmap.

## Documentation

- [Complete Design Specification](docs/MAXMCP_V2_DESIGN.md)
- [Quick Start Guide](docs/README.md)
- [Development Guide](docs/development-guide.md)
- [Architecture](docs/architecture.md)

## License

MIT License

## Author

Hiroshi Yamato

## Support

- GitHub Issues: https://github.com/dropcontrol/MaxMCP/issues
- Documentation: Coming soon
