#!/usr/bin/env python3
"""
MaxMCP stdio-UDP Bridge
Converts stdio (Claude Code) ⟷ UDP (Max)
Uses OSC format for compatibility with Max's udpreceive
"""

import sys
import socket
import threading
from datetime import datetime

# Configuration
UDP_SEND_PORT = 7400  # Send to Max [udpreceive 7400]
UDP_RECV_PORT = 7401  # Receive from Max [udpsend localhost 7401]
LOG_FILE = "/tmp/mcp-bridge.log"

def log(message):
    """Write log message to file"""
    with open(LOG_FILE, 'a') as f:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f"[{timestamp}] {message}\n")
        f.flush()

def create_osc_message(address, *args):
    """Create a simple OSC message"""
    msg = bytearray()

    # OSC address (null-terminated, padded to 4 bytes)
    address_bytes = address.encode() + b'\x00'
    padding = (4 - len(address_bytes) % 4) % 4
    msg.extend(address_bytes + b'\x00' * padding)

    # OSC type tag string
    type_tags = ',' + 's' * len(args)  # All arguments as strings
    type_tag_bytes = type_tags.encode() + b'\x00'
    padding = (4 - len(type_tag_bytes) % 4) % 4
    msg.extend(type_tag_bytes + b'\x00' * padding)

    # Arguments
    for arg in args:
        arg_bytes = str(arg).encode() + b'\x00'
        padding = (4 - len(arg_bytes) % 4) % 4
        msg.extend(arg_bytes + b'\x00' * padding)

    return bytes(msg)

def parse_osc_message(data):
    """Parse OSC message and extract the first string argument"""
    try:
        # Skip OSC address (find first null byte)
        idx = data.index(b'\x00')
        # Align to 4 bytes
        idx = ((idx + 4) // 4) * 4

        # Skip type tag string (should be ",s" or similar)
        type_tag_end = data.index(b'\x00', idx)
        idx = ((type_tag_end + 4) // 4) * 4

        # Extract first string argument
        arg_end = data.index(b'\x00', idx)
        arg = data[idx:arg_end].decode('utf-8')
        return arg.strip()
    except Exception as e:
        log(f"OSC parse error: {e}, trying raw decode")
        # Fallback: try to decode as UTF-8 and strip null bytes and commas
        decoded = data.decode('utf-8', errors='ignore').rstrip('\x00').strip()
        # Remove trailing comma and spaces (OSC padding artifacts)
        decoded = decoded.rstrip(',').strip()
        return decoded

def udp_receiver(sock):
    """Receive UDP messages from Max and write to stdout"""
    log("UDP receiver thread started")
    while True:
        try:
            data, addr = sock.recvfrom(65535)
            # Check if it's an OSC message (starts with '/')
            if data.startswith(b'/'):
                # Parse OSC message to extract JSON
                message = parse_osc_message(data)
                log(f"Received from Max (OSC parsed): {message}")
            else:
                # Plain text message
                message = data.decode('utf-8').strip()
                log(f"Received from Max (plain): {message}")
            # Write to stdout (to Claude Code)
            print(message, flush=True)
        except Exception as e:
            log(f"UDP receiver error: {e}")
            break

def main():
    log("Bridge starting...")

    # Create UDP socket for receiving from Max
    recv_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    recv_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    recv_sock.bind(('localhost', UDP_RECV_PORT))
    log(f"UDP receiver bound to port {UDP_RECV_PORT}")

    # Create UDP socket for sending to Max
    send_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    log(f"UDP sender ready for port {UDP_SEND_PORT}")

    # Start UDP receiver thread
    receiver_thread = threading.Thread(target=udp_receiver, args=(recv_sock,), daemon=True)
    receiver_thread.start()

    # Read from stdin and send to Max via UDP (OSC format)
    log("Waiting for stdin input...")
    try:
        for line in sys.stdin:
            line = line.strip()
            if line:
                log(f"Received from stdin: {line}")
                # Send to Max via UDP as OSC message with two arguments: "request" and JSON
                osc_msg = create_osc_message("/mcp", "request", line)
                send_sock.sendto(osc_msg, ('localhost', UDP_SEND_PORT))
                log(f"Sent OSC message to Max port {UDP_SEND_PORT} (size: {len(osc_msg)})")
    except KeyboardInterrupt:
        log("Bridge interrupted by user")
    except Exception as e:
        log(f"Bridge error: {e}")
    finally:
        log("Bridge shutting down...")
        recv_sock.close()
        send_sock.close()

if __name__ == "__main__":
    main()
