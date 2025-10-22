/**
 * MaxMCP MCP Bridge
 *
 * Bridges stdio communication (Claude Code) with UDP (Max).
 * This script acts as an MCP server, forwarding messages between
 * Claude Code and Max's maxmcp.server external.
 */

const dgram = require('dgram');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 7400;
let debug = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
        port = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--debug') {
        debug = true;
    }
}

// Logging helper
function log(message) {
    if (debug) {
        console.error(`[Bridge] ${message}`);
    }
}

log(`Starting MaxMCP Bridge: UDP localhost:${port}`);

// Create readline interface for stdin/stdout
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Create UDP socket
const socket = dgram.createSocket('udp4');
let isReady = false;

// Fragment protocol constants
const MAX_UDP_PAYLOAD = 60000;
const FRAGMENT_HEADER = 'MCPF:';

// Fragment reassembly state
const fragmentMap = new Map();

/**
 * Parse fragment header
 * Format: "MCPF:msg_id:frag_index:total_frags:data"
 */
function parseFragment(buffer) {
    const str = buffer.toString();

    if (!str.startsWith(FRAGMENT_HEADER)) {
        return null;
    }

    const parts = str.split(':');
    if (parts.length < 4) {
        return null;
    }

    const msgId = parts[1];
    const fragIndex = parseInt(parts[2]);
    const totalFrags = parseInt(parts[3]);
    const data = str.substring(FRAGMENT_HEADER.length + msgId.length + 1 +
                               parts[2].length + 1 + parts[3].length + 1);

    return { msgId, fragIndex, totalFrags, data };
}

/**
 * Handle received fragment
 */
function handleFragment(fragment) {
    const { msgId, fragIndex, totalFrags, data } = fragment;

    log(`Fragment received: ${msgId} (${fragIndex}/${totalFrags})`);

    if (!fragmentMap.has(msgId)) {
        fragmentMap.set(msgId, {
            totalFrags: totalFrags,
            fragments: new Array(totalFrags),
            receivedCount: 0
        });
    }

    const info = fragmentMap.get(msgId);
    info.fragments[fragIndex] = data;
    info.receivedCount++;

    // Check if all fragments received
    if (info.receivedCount === info.totalFrags) {
        const completeMessage = info.fragments.join('');
        fragmentMap.delete(msgId);

        log(`Complete message reassembled: ${completeMessage.length} bytes`);

        // Forward to Claude Code via stdout
        console.log(completeMessage);
    }
}

/**
 * Send message via UDP (with fragmentation if needed)
 */
function sendUDP(message) {
    if (message.length <= MAX_UDP_PAYLOAD) {
        // Send as single packet
        const buffer = Buffer.from(message);
        socket.send(buffer, port, 'localhost', (err) => {
            if (err) {
                console.error('[Bridge] UDP send error:', err);
            } else {
                log(`Sent to Max: ${message.length} bytes`);
            }
        });
    } else {
        // Send as fragments
        const totalFrags = Math.ceil(message.length / MAX_UDP_PAYLOAD);
        const msgId = Date.now().toString(16);

        log(`Sending fragmented message: ${message.length} bytes in ${totalFrags} fragments`);

        for (let i = 0; i < totalFrags; i++) {
            const offset = i * MAX_UDP_PAYLOAD;
            const fragLen = Math.min(MAX_UDP_PAYLOAD, message.length - offset);
            const fragData = message.substring(offset, offset + fragLen);

            const fragment = `${FRAGMENT_HEADER}${msgId}:${i}:${totalFrags}:${fragData}`;
            const buffer = Buffer.from(fragment);

            socket.send(buffer, port, 'localhost', (err) => {
                if (err) {
                    console.error(`[Bridge] Fragment ${i} send error:`, err);
                }
            });

            // Small delay between fragments
            if (i < totalFrags - 1) {
                setTimeout(() => {}, 1);
            }
        }
    }
}

// UDP socket ready
socket.on('listening', () => {
    const address = socket.address();
    isReady = true;
    console.error(`[Bridge] *** UDP READY on ${address.address}:${address.port} ***`);
    log('UDP socket ready');
});

// Receive messages from Max
socket.on('message', (msg, rinfo) => {
    log(`Received from Max: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);

    // Check if this is a fragment
    const fragment = parseFragment(msg);
    if (fragment) {
        handleFragment(fragment);
    } else {
        // Complete message in single packet
        const message = msg.toString();
        console.log(message);
    }
});

socket.on('error', (err) => {
    console.error('[Bridge] UDP error:', err);
    socket.close();
    process.exit(1);
});

// Bind to any available port (we only need to send to Max's fixed port)
socket.bind();

// Handle incoming messages from Claude Code (stdin)
rl.on('line', (line) => {
    log(`Received from Claude Code: ${line.length} bytes`);

    if (isReady) {
        sendUDP(line);
    } else {
        log('UDP not ready, discarding message');
    }
});

rl.on('close', () => {
    log('Stdin closed, shutting down');
    socket.close();
    process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
    log('Received SIGINT, shutting down');
    socket.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down');
    socket.close();
    process.exit(0);
});

// Keep process alive
process.stdin.resume();
