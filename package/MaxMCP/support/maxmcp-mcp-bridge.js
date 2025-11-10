#!/usr/bin/env node
// bridge-src/maxmcp-mcp-bridge.js
var dgram = require("dgram");
var readline = require("readline");
var args = process.argv.slice(2);
var port = 7400;
var debug = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && i + 1 < args.length) {
    port = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--debug") {
    debug = true;
  }
}
function log(message) {
  if (debug) {
    console.error(`[Bridge] ${message}`);
  }
}
log(`Starting MaxMCP Bridge: UDP localhost:${port}`);
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});
var socket = dgram.createSocket("udp4");
var isReady = false;
var MAX_UDP_PAYLOAD = 6e4;
var FRAGMENT_HEADER = "MCPF:";
var fragmentMap = /* @__PURE__ */ new Map();
function parseFragment(buffer) {
  const str = buffer.toString();
  if (!str.startsWith(FRAGMENT_HEADER)) {
    return null;
  }
  const parts = str.split(":");
  if (parts.length < 4) {
    return null;
  }
  const msgId = parts[1];
  const fragIndex = parseInt(parts[2]);
  const totalFrags = parseInt(parts[3]);
  const data = str.substring(FRAGMENT_HEADER.length + msgId.length + 1 + parts[2].length + 1 + parts[3].length + 1);
  return { msgId, fragIndex, totalFrags, data };
}
function handleFragment(fragment) {
  const { msgId, fragIndex, totalFrags, data } = fragment;
  log(`Fragment received: ${msgId} (${fragIndex}/${totalFrags})`);
  if (!fragmentMap.has(msgId)) {
    fragmentMap.set(msgId, {
      totalFrags,
      fragments: new Array(totalFrags),
      receivedCount: 0
    });
  }
  const info = fragmentMap.get(msgId);
  info.fragments[fragIndex] = data;
  info.receivedCount++;
  if (info.receivedCount === info.totalFrags) {
    const completeMessage = info.fragments.join("");
    fragmentMap.delete(msgId);
    log(`Complete message reassembled: ${completeMessage.length} bytes`);
    console.log(completeMessage);
  }
}
function sendUDP(message) {
  if (message.length <= MAX_UDP_PAYLOAD) {
    const buffer = Buffer.from(message);
    socket.send(buffer, port, "localhost", (err) => {
      if (err) {
        console.error("[Bridge] UDP send error:", err);
      } else {
        log(`Sent to Max: ${message.length} bytes`);
      }
    });
  } else {
    const totalFrags = Math.ceil(message.length / MAX_UDP_PAYLOAD);
    const msgId = Date.now().toString(16);
    log(`Sending fragmented message: ${message.length} bytes in ${totalFrags} fragments`);
    for (let i = 0; i < totalFrags; i++) {
      const offset = i * MAX_UDP_PAYLOAD;
      const fragLen = Math.min(MAX_UDP_PAYLOAD, message.length - offset);
      const fragData = message.substring(offset, offset + fragLen);
      const fragment = `${FRAGMENT_HEADER}${msgId}:${i}:${totalFrags}:${fragData}`;
      const buffer = Buffer.from(fragment);
      socket.send(buffer, port, "localhost", (err) => {
        if (err) {
          console.error(`[Bridge] Fragment ${i} send error:`, err);
        }
      });
      if (i < totalFrags - 1) {
        setTimeout(() => {
        }, 1);
      }
    }
  }
}
socket.on("listening", () => {
  const address = socket.address();
  isReady = true;
  console.error(`[Bridge] *** UDP READY on ${address.address}:${address.port} ***`);
  log("UDP socket ready");
});
socket.on("message", (msg, rinfo) => {
  log(`Received from Max: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
  const fragment = parseFragment(msg);
  if (fragment) {
    handleFragment(fragment);
  } else {
    const message = msg.toString();
    console.log(message);
  }
});
socket.on("error", (err) => {
  console.error("[Bridge] UDP error:", err);
  socket.close();
  process.exit(1);
});
socket.bind();
rl.on("line", (line) => {
  log(`Received from Claude Code: ${line.length} bytes`);
  if (isReady) {
    sendUDP(line);
  } else {
    log("UDP not ready, discarding message");
  }
});
rl.on("close", () => {
  log("Stdin closed, shutting down");
  socket.close();
  process.exit(0);
});
process.on("SIGINT", () => {
  log("Received SIGINT, shutting down");
  socket.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down");
  socket.close();
  process.exit(0);
});
process.stdin.resume();
