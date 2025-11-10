#!/usr/bin/env node
// MaxMCP stdio server - standalone Node.js process
// This communicates with Claude Code via stdio and Max via UDP

const readline = require('readline');
const dgram = require('dgram');

// Configuration
const MAX_UDP_PORT = 7400; // Port where Max listens (udpreceive)
const SERVER_UDP_PORT = 7401; // Port where this server listens

// Create UDP socket
const socket = dgram.createSocket('udp4');

// Create readline interface for stdio
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Debug logging
const debug = (msg) => {
    if (process.env.DEBUG) {
        console.error(`[DEBUG] ${msg}`);
    }
};

debug('MaxMCP stdio server starting...');

// Handle incoming JSON-RPC from Claude Code
rl.on('line', (line) => {
    debug(`Received from Claude: ${line}`);

    try {
        // Validate it's JSON
        JSON.parse(line);

        // Forward to Max via UDP
        const buffer = Buffer.from(line);
        socket.send(buffer, 0, buffer.length, MAX_UDP_PORT, 'localhost', (err) => {
            if (err) {
                debug(`Error sending to Max: ${err}`);

                // Send error response back to Claude
                const errorResponse = {
                    jsonrpc: "2.0",
                    error: {
                        code: -32603,
                        message: `Failed to send to Max: ${err.message}`
                    },
                    id: null
                };
                console.log(JSON.stringify(errorResponse));
            } else {
                debug(`Sent to Max successfully`);
            }
        });

    } catch (e) {
        debug(`Invalid JSON: ${e.message}`);

        // Send parse error
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

// Handle UDP responses from Max
socket.on('message', (msg, rinfo) => {
    const response = msg.toString();
    debug(`Received from Max: ${response}`);

    // Forward to Claude Code via stdout
    console.log(response);
});

// Bind UDP socket
socket.bind(SERVER_UDP_PORT, () => {
    debug(`UDP socket listening on port ${SERVER_UDP_PORT}`);
});

// Error handling
socket.on('error', (err) => {
    debug(`Socket error: ${err}`);
    process.exit(1);
});

rl.on('error', (err) => {
    debug(`Readline error: ${err}`);
});

rl.on('close', () => {
    debug('Stdin closed');
    process.exit(0);
});

// Signal handlers
process.on('SIGINT', () => {
    debug('Received SIGINT');
    socket.close();
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    debug('Received SIGTERM');
    socket.close();
    rl.close();
    process.exit(0);
});

debug('MaxMCP stdio server ready');