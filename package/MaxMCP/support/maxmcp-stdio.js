#!/usr/bin/env node
// MaxMCP stdio server - communicates directly with maxmcp.server
// This is a standalone Node.js process, NOT Node for Max

const readline = require('readline');

// Create readline interface for stdio
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Handle incoming JSON-RPC from Claude Code
rl.on('line', (line) => {
    // Just pass through to stdout for now
    // Max's shell object will capture this
    process.stderr.write(`MAXMCP_REQUEST:${line}\n`);
});

// Handle responses from Max (via stdin redirection)
process.stdin.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.startsWith('MAXMCP_RESPONSE:')) {
            const response = line.substring('MAXMCP_RESPONSE:'.length);
            console.log(response);
        }
    });
});

// Error handling
rl.on('error', (err) => {
    process.stderr.write(`Error: ${err.message}\n`);
});

rl.on('close', () => {
    process.exit(0);
});

// Signal handlers
process.on('SIGINT', () => {
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});