/**
    @file maxmcp_server.cpp
    MaxMCP Server - MCP Server Max External Implementation

    @ingroup maxmcp
*/

#include "maxmcp_server.h"
#include "mcp_server.h"
#include "udp_server.h"
#include "utils/console_logger.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <sstream>
#include <cstdlib>

using json = nlohmann::json;

// Global class pointer
static t_class* maxmcp_server_class = nullptr;

// Global singleton instance
static t_maxmcp_server* g_server_instance = nullptr;

/**
 * @brief Main entry point for maxmcp.server external
 *
 * Registers the maxmcp.server class with Max.
 *
 * @param r Module reference (unused)
 */
void ext_main(void* r) {
    t_class* c;

    c = class_new("maxmcp.server",
                  (method)maxmcp_server_new,
                  (method)maxmcp_server_free,
                  (long)sizeof(t_maxmcp_server),
                  nullptr,
                  A_GIMME,
                  0);

    class_addmethod(c, (method)maxmcp_server_assist, "assist", A_CANT, 0);

    // Register attributes
    CLASS_ATTR_LONG(c, "port", 0, t_maxmcp_server, port);
    CLASS_ATTR_LABEL(c, "port", 0, "UDP Port");
    CLASS_ATTR_DEFAULT(c, "port", 0, "7400");
    CLASS_ATTR_ACCESSORS(c, "port", nullptr, (method)maxmcp_server_port_set);

    CLASS_ATTR_CHAR(c, "debug", 0, t_maxmcp_server, debug);
    CLASS_ATTR_STYLE_LABEL(c, "debug", 0, "onoff", "Debug Mode");
    CLASS_ATTR_DEFAULT(c, "debug", 0, "0");

    class_register(CLASS_BOX, c);
    maxmcp_server_class = c;

    post("MaxMCP Server external loaded (UDP mode)");
}

void* maxmcp_server_new(t_symbol* s, long argc, t_atom* argv) {
    // Singleton check
    if (g_server_instance != nullptr) {
        object_error(nullptr, "maxmcp.server already exists! Only one instance allowed");
        return nullptr;
    }

    t_maxmcp_server* x = (t_maxmcp_server*)object_alloc(maxmcp_server_class);

    if (x) {
        // Initialize state
        x->initialized = false;
        x->protocol_version = "";
        x->running = true;

        // Initialize attributes with defaults
        x->port = 7400;
        x->debug = false;

        // Create outlet for JSON-RPC responses (optional, for debugging)
        x->outlet_log = outlet_new(x, nullptr);

        // Create qelem for deferred message processing
        x->qelem = qelem_new(x, (method)maxmcp_server_process_messages);

        // Process attributes
        attr_args_process(x, argc, argv);

        // Check environment variable for port
        if (const char* env_port = std::getenv("MAXMCP_PORT")) {
            x->port = std::atoi(env_port);
        }

        // Create UDP server
        x->udp_server = new UDPServer((int)x->port);

        // Set message callback - triggers qelem when message arrives
        x->udp_server->set_message_callback([x](const std::string& message) {
            // Message received callback (runs in UDP thread)
            // Trigger qelem to process in Max main thread
            qelem_set(x->qelem);
        });

        // Start UDP server
        if (!x->udp_server->start()) {
            object_error((t_object*)x, "Failed to start UDP server");
            delete x->udp_server;
            x->udp_server = nullptr;
            return nullptr;
        }

        // Start MCP server
        MCPServer::get_instance()->start();

        // Set global singleton
        g_server_instance = x;

        object_post((t_object*)x, "MaxMCP Server started on port %ld", x->port);
        ConsoleLogger::log(("maxmcp.server: UDP server listening on port " + std::to_string(x->port)).c_str());
    }

    return x;
}

void maxmcp_server_free(t_maxmcp_server* x) {
    if (x) {
        // Stop running
        x->running = false;

        // Stop UDP server
        if (x->udp_server) {
            x->udp_server->stop();
            delete x->udp_server;
            x->udp_server = nullptr;
        }

        // Free qelem
        if (x->qelem) {
            qelem_free(x->qelem);
            x->qelem = nullptr;
        }

        // Stop MCP server
        MCPServer::destroy_instance();

        ConsoleLogger::log("MaxMCP Server destroyed");

        // Clear singleton
        g_server_instance = nullptr;

        object_post((t_object*)x, "MaxMCP Server freed");
    }
}

void maxmcp_server_assist(t_maxmcp_server* x, void* b, long m, long a, char* s) {
    if (m == ASSIST_INLET) {
        snprintf(s, 256, "Control messages");
    } else {
        snprintf(s, 256, "Log output");
    }
}

/**
 * @brief Get global server instance (for client access)
 *
 * Used by client objects to check if server exists.
 *
 * @return Pointer to server instance, or nullptr if not created
 */
t_maxmcp_server* maxmcp_server_get_instance() {
    return g_server_instance;
}

/**
 * @brief Handle incoming MCP request from UDP
 *
 * Receives JSON-RPC request as Max message, processes it, and outputs response to outlet.
 *
 * @param x Server instance
 * @param s Symbol (unused)
 * @param argc Number of atoms
 * @param argv Array of atoms containing JSON-RPC request string
 */
void maxmcp_server_request(t_maxmcp_server* x, t_symbol* s, long argc, t_atom* argv) {
    if (argc < 1) {
        object_error((t_object*)x, "request: expected JSON-RPC string");
        return;
    }

    // Build JSON string from atoms (could be single symbol or list of symbols)
    std::string request;
    if (atom_gettype(argv) == A_SYM) {
        // Single symbol
        request = atom_getsym(argv)->s_name;
    } else {
        // List of atoms - concatenate them
        for (long i = 0; i < argc; i++) {
            if (atom_gettype(&argv[i]) == A_SYM) {
                request += atom_getsym(&argv[i])->s_name;
            } else if (atom_gettype(&argv[i]) == A_LONG) {
                request += std::to_string(atom_getlong(&argv[i]));
            } else if (atom_gettype(&argv[i]) == A_FLOAT) {
                request += std::to_string(atom_getfloat(&argv[i]));
            }
        }
    }

    try {
        ConsoleLogger::log(("MCP Request received (" + std::to_string(request.length()) + " bytes)").c_str());

        // Route to MCP server
        std::string response = MCPServer::get_instance()->handle_request_string(request);

        // Output response to outlet (will be sent via UDP)
        t_atom response_atom;
        atom_setsym(&response_atom, gensym(response.c_str()));
        outlet_anything(x->outlet_log, gensym("response"), 1, &response_atom);

        ConsoleLogger::log(("MCP Response sent (" + std::to_string(response.length()) + " bytes)").c_str());

    } catch (const std::exception& e) {
        object_error((t_object*)x, "request error: %s", e.what());

        // Send error response
        json error_response = {
            {"jsonrpc", "2.0"},
            {"error", {
                {"code", -32603},
                {"message", std::string("Internal error: ") + e.what()}
            }},
            {"id", nullptr}
        };

        t_atom error_atom;
        atom_setsym(&error_atom, gensym(error_response.dump().c_str()));
        outlet_anything(x->outlet_log, gensym("response"), 1, &error_atom);
    }
}

/**
 * @brief Attribute setter for port
 */
t_max_err maxmcp_server_port_set(t_maxmcp_server* x, t_object* attr, long ac, t_atom* av) {
    if (ac && av) {
        x->port = atom_getlong(av);
        ConsoleLogger::log(("Port set to " + std::to_string(x->port)).c_str());
    }
    return MAX_ERR_NONE;
}

/**
 * @brief Process UDP messages (called periodically or via idle)
 *
 * This should be called from Max's main thread to safely process
 * messages received from UDP clients.
 */
void maxmcp_server_process_messages(t_maxmcp_server* x) {
    if (!x || !x->udp_server) {
        return;
    }

    // Process all pending messages
    std::string message;
    while (x->udp_server->get_received_message(message)) {
        try {
            if (x->debug) {
                ConsoleLogger::log(("Processing UDP message (" + std::to_string(message.length()) + " bytes)").c_str());
            }

            // Route to MCP server
            std::string response = MCPServer::get_instance()->handle_request_string(message);

            // Send response back via UDP
            x->udp_server->send_message(response);

            if (x->debug) {
                ConsoleLogger::log(("Response sent via UDP (" + std::to_string(response.length()) + " bytes)").c_str());
            }

        } catch (const std::exception& e) {
            object_error((t_object*)x, "Request processing error: %s", e.what());

            // Send error response
            json error_response = {
                {"jsonrpc", "2.0"},
                {"error", {
                    {"code", -32603},
                    {"message", std::string("Internal error: ") + e.what()}
                }},
                {"id", nullptr}
            };

            x->udp_server->send_message(error_response.dump());
        }
    }
}
