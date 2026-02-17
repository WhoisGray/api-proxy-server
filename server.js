"use strict";

const express = require("express");
const http = require("http");
const https = require("https");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { SocksProxyAgent } = require("socks-proxy-agent");
require("dotenv").config();

const app = express();
app.disable("x-powered-by");

const PORT = Number(process.env.PORT || 42000);

// Optional SOCKS5 proxy (if set => route traffic via SOCKS)
const SOCKS_PROXY = (process.env.SOCKS_PROXY || "").trim();

// Multi-key support (comma-separated)
const EXPECTED_API_KEYS = new Set(
  (process.env.EXPECTED_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
);

// Optional allowlist: "api.openai.com,generativelanguage.googleapis.com,api.github.com"
const ALLOWLIST = (process.env.ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Logging level: error|warn|info|debug
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 30_000);
const MAX_PROXY_CACHE = Number(process.env.MAX_PROXY_CACHE || 200);

// ---- Simple logger
function log(level, msg, meta) {
  const order = { error: 0, warn: 1, info: 2, debug: 3 };
  if ((order[level] ?? 99) > (order[LOG_LEVEL] ?? 2)) return;
  const line = meta ? `${msg} ${JSON.stringify(meta)}` : msg;
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](
    `${new Date().toISOString()} [${level}] ${line}`,
  );
}

// Mask API key in URLs for safe logs
function maskKey(key) {
  if (!key) return "";
  if (key.length <= 6) return "***";
  return `${key.slice(0, 3)}***${key.slice(-3)}`;
}
function safeUrlForLog(req) {
  // replace first path segment (api key) with masked version
  const parts = (req.originalUrl || req.url || "").split("/");
  // parts[0] is "" because url starts with /
  if (parts.length >= 2 && parts[1]) parts[1] = maskKey(parts[1]);
  return parts.join("/");
}

// ---- Keep-Alive agents (performance)
const directHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: Number(process.env.MAX_SOCKETS || 256),
  maxFreeSockets: Number(process.env.MAX_FREE_SOCKETS || 64),
  timeout: UPSTREAM_TIMEOUT_MS,
});

const socksAgent = SOCKS_PROXY ? new SocksProxyAgent(SOCKS_PROXY) : null;
const outboundAgent = socksAgent || directHttpsAgent;

// ---- CORS (simple)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "*",
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---- Request logging (safe)
app.use((req, res, next) => {
  log("info", "REQ", { method: req.method, url: safeUrlForLog(req) });
  next();
});

// ---- Health (no key)
app.get(["/", "/health"], (req, res) => {
  res.json({
    status: "ok",
    port: PORT,
    socksProxyEnabled: Boolean(SOCKS_PROXY),
    allowlistEnabled: ALLOWLIST.length > 0,
    keysLoaded: EXPECTED_API_KEYS.size,
    usage: `http://127.0.0.1:${PORT}/YOUR_API_KEY/api.openai.com/v1/chat/completions`,
  });
});

// ---- Proxy cache per target domain (big perf win)
const proxyCache = new Map();

function getProxyForTarget(targetDomain, apiKeyParam) {
  const cacheKey = targetDomain;

  const cached = proxyCache.get(cacheKey);
  if (cached) return cached;

  if (proxyCache.size >= MAX_PROXY_CACHE) {
    const firstKey = proxyCache.keys().next().value;
    proxyCache.delete(firstKey);
  }

  const mw = createProxyMiddleware({
    target: `https://${targetDomain}`,
    changeOrigin: true,
    secure: true,
    followRedirects: true,
    agent: outboundAgent,

    // Remove /<apiKey>/<targetDomain> prefix only (anchored)
    pathRewrite: (path) => {
      const prefix = `/${apiKeyParam}/${targetDomain}`;
      const newPath = path.startsWith(prefix)
        ? path.slice(prefix.length)
        : path;
      return newPath.length ? newPath : "/";
    },

    onProxyReq: (proxyReq, req) => {
      // Prevent real client IP leak to upstream
      proxyReq.removeHeader("x-forwarded-for");
      proxyReq.removeHeader("x-real-ip");
      proxyReq.removeHeader("forwarded");
      proxyReq.removeHeader("cf-connecting-ip");
      proxyReq.removeHeader("true-client-ip");
      proxyReq.removeHeader("x-client-ip");

      // Optional: do not forward cookies for a generic proxy
      proxyReq.removeHeader("cookie");

      // Ensure User-Agent exists
      if (!proxyReq.getHeader("user-agent")) {
        proxyReq.setHeader(
          "user-agent",
          req.headers["user-agent"] || "Mozilla/5.0",
        );
      }
    },

    onProxyRes: (proxyRes, req) => {
      log("info", "UPSTREAM", {
        status: proxyRes.statusCode,
        target: targetDomain,
      });
    },

    onError: (err, req, res) => {
      log("error", "PROXY_ERROR", {
        target: targetDomain,
        message: err.message,
      });
      if (!res.headersSent)
        res.status(502).json({ error: "Proxy error", message: err.message });
    },
  });

  proxyCache.set(cacheKey, mw);
  return mw;
}

function isValidTarget(targetDomain) {
  if (!targetDomain || typeof targetDomain !== "string") return false;
  const lower = targetDomain.toLowerCase();

  // Block dangerous/obvious internal targets
  const blocked = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "metadata.google.internal",
  ]);
  if (blocked.has(lower)) return false;

  // Block IP literals (simple SSRF mitigation)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) return false;
  if (lower.includes(":")) return false; // block IPv6 literals

  // Looks like a domain
  if (!lower.includes(".")) return false;
  if (!/^[a-z0-9.-]+$/.test(lower)) return false;
  return true;
}

// ---- Main route: /<apiKey>/<domain>/<path>
app.use("/:apiKeyParam/:target(*)", (req, res, next) => {
  const apiKeyParam = (req.params.apiKeyParam || "").trim();
  const fullPath = req.params.target || "";
  const targetDomain = fullPath.split("/")[0];

  // Auth (multi-key)
  if (EXPECTED_API_KEYS.size === 0 || !EXPECTED_API_KEYS.has(apiKeyParam)) {
    log("warn", "UNAUTHORIZED", { url: safeUrlForLog(req) });
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing API key in the path.",
      usage: "Use format: /YOUR_API_KEY/domain.com/path",
    });
  }

  // Validate target
  if (!isValidTarget(targetDomain)) {
    return res.status(400).json({
      error: "Invalid target domain",
      usage: "Use format: /YOUR_API_KEY/domain.com/path",
    });
  }

  // Allowlist (optional)
  if (ALLOWLIST.length > 0 && !ALLOWLIST.includes(targetDomain)) {
    return res.status(403).json({
      error: "Target not allowed",
      targetDomain,
      allowlist: ALLOWLIST,
    });
  }

  // Proxy (cached)
  const proxy = getProxyForTarget(targetDomain, apiKeyParam);
  return proxy(req, res, next);
});

// ---- Start server with sane timeouts
const server = http.createServer(app);
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65_000);
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 70_000);
server.setTimeout(Number(process.env.SERVER_SOCKET_TIMEOUT_MS || 120_000));

server.listen(PORT, "0.0.0.0", () => {
  log("info", `🚀 API Proxy Server running on :${PORT}`, {
    socksProxyEnabled: Boolean(SOCKS_PROXY),
    allowlist: ALLOWLIST,
    keysLoaded: EXPECTED_API_KEYS.size,
  });

  if (EXPECTED_API_KEYS.size === 0) {
    log("warn", "⚠️ EXPECTED_API_KEY is empty! Proxy is NOT secured.");
  } else {
    log(
      "info",
      "✅ Multi-key auth enabled (comma-separated EXPECTED_API_KEY).",
    );
  }
});

// Graceful shutdown
function shutdown(signal) {
  log("info", `Shutting down (${signal})...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
