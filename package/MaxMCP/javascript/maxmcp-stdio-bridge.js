// MaxMCP stdio bridge for Node for Max
// This script handles stdio communication between Claude Code and maxmcp.server

const Max = require('max-api');
const readline = require('readline');

// Initialize readline for stdin
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Log to Max console
Max.post('MaxMCP stdio bridge starting...');

// Handle incoming JSON-RPC requests from Claude Code
rl.on('line', (line) => {
    try {
        // Parse and validate JSON
        const json = JSON.parse(line);

        // Log request (truncate for console)
        const preview = line.length > 100 ? line.substring(0, 100) + '...' : line;
        Max.post(`MCP Request received: ${preview}`);

        // Send to maxmcp.server via outlet
        // Format: request <json_string>
        Max.outlet('request', line);

    } catch (e) {
        Max.post(`Error parsing JSON: ${e.message}`);

        // Send JSON-RPC error response
        const errorResponse = {
            jsonrpc: "2.0",
            error: {
                code: -32700,
                message: `Parse error: ${e.message}`
            },
            id: null
        };

        console.log(JSON.stringify(errorResponse));
    }
});

// Handle responses from maxmcp.server
Max.addHandler('response', (jsonString) => {
    try {
        // Log response (truncate for console)
        const preview = jsonString.length > 100 ?
            jsonString.substring(0, 100) + '...' : jsonString;
        Max.post(`MCP Response sending: ${preview}`);

        // Send to Claude Code via stdout
        console.log(jsonString);

    } catch (e) {
        Max.post(`Error sending response: ${e.message}`);
    }
});

// Handle errors
rl.on('error', (err) => {
    Max.post(`Readline error: ${err.message}`);
});

// Handle close event
rl.on('close', () => {
    Max.post('MCP Bridge: stdin closed');
});

// Handle process termination
process.on('SIGINT', () => {
    Max.post('MCP Bridge shutting down...');
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    Max.post('MCP Bridge terminated');
    rl.close();
    process.exit(0);
});

// Initialization complete
Max.post('MaxMCP stdio bridge initialized successfully');
Max.post('Waiting for MCP requests...');