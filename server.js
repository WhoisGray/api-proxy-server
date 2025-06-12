const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { SocksProxyAgent } = require("socks-proxy-agent");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 42000;

// SOCKS5 proxy configuration
const socksProxy = process.env.SOCKS_PROXY || "socks5://127.0.0.1:18086";
const agent = new SocksProxyAgent(socksProxy);

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Generic proxy middleware
const createProxy = (target) => {
  return createProxyMiddleware({
    target: `https://${target}`,
    changeOrigin: true,
    secure: true,
    followRedirects: true,
    logLevel: "warn", // Reduce logging noise

    // Use SOCKS5 proxy
    agent: agent,

    // Remove the target domain from the path
    pathRewrite: (path, req) => {
      // Remove the target domain from the beginning of the path
      const targetDomain = req.url.split("/")[1];
      return path.replace(`/${targetDomain}`, "");
    },

    // Handle headers
    onProxyReq: (proxyReq, req, res) => {
      try {
        // ignore if favicon.ico
        if (req.url.includes("favicon.ico")) {
          return;
        }

        // Only set headers if they haven't been sent yet
        if (!proxyReq.headersSent) {
          // Set User-Agent if not already present
          if (!proxyReq.getHeader("User-Agent")) {
            proxyReq.setHeader(
              "User-Agent",
              req.headers["user-agent"] || "Mozilla/5.0"
            );
          }
        }

        // Log the actual request being made
        console.log(
          `Proxying to: https://${req.url.split("/")[1]}${proxyReq.path}`
        );
      } catch (error) {
        console.error("Error in onProxyReq:", error.message);
      }
    },

    // Handle response
    onProxyRes: (proxyRes, req, res) => {
      // Headers are already set by CORS middleware
      console.log(
        `✅ Response: ${proxyRes.statusCode} from ${req.url.split("/")[1]}`
      );
    },

    // Handle errors
    onError: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.status(500).json({
        error: "Proxy error",
        message: err.message,
      });
    },
  });
};

// Dynamic proxy route
app.use("/:target(*)", (req, res, next) => {
  const fullPath = req.params.target;
  const targetDomain = fullPath.split("/")[0];

  // Validate domain
  if (!targetDomain || !targetDomain.includes(".")) {
    return res.status(400).json({
      error: "Invalid target domain",
      usage: "Use format: /domain.com/path",
    });
  }

  // Create proxy for this specific target
  const proxy = createProxy(targetDomain);
  proxy(req, res, next);
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "Reverse Proxy Server Running",
    port: PORT,
    usage: [
      "OpenAI: http://127.0.0.1:42000/api.openai.com/v1/chat/completions",
      "Google AI: http://127.0.0.1:42000/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    ],
    proxy: socksProxy,
  });
});

// Handle CORS preflight requests (this is now handled by middleware above)
// app.options('*', (req, res) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', '*');
//   res.sendStatus(200);
// });

// Start server
app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Reverse Proxy Server running on http://127.0.0.1:${PORT}`);
  console.log(`📡 Using SOCKS5 proxy: ${socksProxy}`);
  console.log("\n📋 Usage Examples:");
  console.log(
    `   OpenAI: http://127.0.0.1:${PORT}/api.openai.com/v1/chat/completions`
  );
  console.log(
    `   Google: http://127.0.0.1:${PORT}/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
  );
  console.log("\n✅ Ready to proxy requests!");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Shutting down proxy server...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Shutting down proxy server...");
  process.exit(0);
});
