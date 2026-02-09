const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { SocksProxyAgent } = require("socks-proxy-agent");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 42000;

// SOCKS5 proxy configuration
const socksProxy = process.env.SOCKS_PROXY || "";
const agent = socksProxy ? new SocksProxyAgent(socksProxy) : null;

// --- IMPORTANT: Set your secret API key in your .env file ---
// For example: EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY_HERE
const EXPECTED_API_KEY = process.env.EXPECTED_API_KEY;

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

/**
 * Creates a proxy middleware for a given target domain.
 * @param {string} target The target domain (e.g., "api.openai.com").
 * @param {string} apiPathSegment The API key segment to remove from the path.
 * @returns {Function} The proxy middleware.
 */
const createProxy = (target, apiPathSegment) => {
  return createProxyMiddleware({
    target: `https://${target}`,
    changeOrigin: true,
    secure: true,
    followRedirects: true,
    logLevel: "warn", // Reduce logging noise for production

    // Use SOCKS5 proxy
    agent: agent ? agent : undefined,

    // Remove both the API key and target domain from the beginning of the path
    pathRewrite: (path, req) => {
      // The original path will be like /<apiKey>/<targetDomain>/<actualPath>
      // We need to remove /<apiKey>/<targetDomain>
      const newPath = path.replace(`/${apiPathSegment}/${target}`, "");
      console.log(`Rewriting path from "${path}" to "${newPath}"`);
      return newPath;
    },

    // Handle headers
    onProxyReq: (proxyReq, req, res) => {
      try {
        // Ignore if favicon.ico request
        if (req.url.includes("favicon.ico")) {
          return;
        }

        // Only set headers if they haven't been sent yet
        if (!proxyReq.headersSent) {
          // Set User-Agent if not already present
          if (!proxyReq.getHeader("User-Agent")) {
            proxyReq.setHeader(
              "User-Agent",
              req.headers["user-agent"] || "Mozilla/5.0",
            );
          }
        }

        // Log the actual request being made
        // req.url here will still contain the API key and target domain initially
        const fullProxyTarget = `https://${target}${proxyReq.path}`;
        console.log(`Proxying request to: ${fullProxyTarget}`);
      } catch (error) {
        console.error("Error in onProxyReq:", error.message);
      }
    },

    // Handle response
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `✅ Response: ${proxyRes.statusCode} from ${
          req.url.split("/")[2] // Index 2 because path is now /apiKey/targetDomain/path
        }`,
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

// Dynamic proxy route with API key validation
app.use("/:apiKeyParam/:target(*)", (req, res, next) => {
  const apiKeyParam = req.params.apiKeyParam; // The API key from the URL
  const fullPath = req.params.target; // The rest of the path, e.g., api.openai.com/v1/...
  const targetDomain = fullPath.split("/")[0]; // Extract target domain from the rest of the path

  // --- API Key Validation ---
  if (!EXPECTED_API_KEY || apiKeyParam !== EXPECTED_API_KEY) {
    console.warn(`Unauthorized access attempt with key: ${apiKeyParam}`);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing API key in the path.",
      usage: "Use format: /YOUR_API_KEY/domain.com/path",
    });
  }

  // Validate target domain
  if (!targetDomain || !targetDomain.includes(".")) {
    return res.status(400).json({
      error: "Invalid target domain",
      usage: "Use format: /YOUR_API_KEY/domain.com/path",
    });
  }

  // Create proxy for this specific target and API key
  const proxy = createProxy(targetDomain, apiKeyParam);
  proxy(req, res, next);
});

// Health check endpoint (accessible without API key)
app.get("/", (req, res) => {
  res.json({
    status: "Reverse Proxy Server Running",
    port: PORT,
    usage: [
      "Secured API Usage:",
      `http://127.0.0.1:${PORT}/YOUR_API_KEY/api.openai.com/v1/chat/completions`,
      `http://127.0.0.1:${PORT}/YOUR_API_KEY/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`,
    ],
    proxy: socksProxy,
    // Warning: Do not expose your actual EXPECTED_API_KEY in production health checks
    apiKeyHint: "Remember to replace 'YOUR_API_KEY' with your actual key.",
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Reverse Proxy Server running on http://127.0.0.1:${PORT}`);
  console.log(`📡 Using SOCKS5 proxy: ${socksProxy}`);
  console.log("\n📋 Usage Examples (remember to replace YOUR_API_KEY):");
  console.log(
    `   OpenAI: http://127.0.0.1:${PORT}/YOUR_API_KEY/api.openai.com/v1/chat/completions`,
  );
  console.log(
    `   Google: http://127.0.0.1:${PORT}/YOUR_API_KEY/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`,
  );
  if (!EXPECTED_API_KEY) {
    console.warn(
      "\n⚠️ WARNING: EXPECTED_API_KEY is not set in your .env file!",
    );
    console.warn("   The server will not be secured. Please set it.");
  } else {
    console.log("\n✅ Proxy server is ready and secured with API key!");
  }
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
