export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Health
    if (url.pathname === "/" || url.pathname === "/health") {
      return json(
        {
          status: "ok",
          app: "api-proxy-edge",
          allowlistEnabled: Boolean(env.ALLOWLIST),
          usage:
            "https://<worker>/<API_KEY>/api.openai.com/v1/chat/completions",
        },
        200,
        request,
      );
    }

    // Path: /API_KEY/targetDomain/...
    const parts = url.pathname.split("/").filter(Boolean);
    const apiKey = parts[0] || "";
    const targetDomain = parts[1] || "";
    const restPath = parts.length > 2 ? "/" + parts.slice(2).join("/") : "/";

    // Multi-key auth from env.EXPECTED_API_KEY = "k1,k2,k3"
    const keys = (env.EXPECTED_API_KEY || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (keys.length === 0 || !keys.includes(apiKey)) {
      return json(
        {
          error: "Unauthorized",
          message: "Invalid or missing API key in the path.",
          usage: "/YOUR_API_KEY/domain.com/path",
        },
        401,
        request,
      );
    }

    // Validate target
    if (!isValidTarget(targetDomain)) {
      return json(
        {
          error: "Invalid target domain",
          usage: "/YOUR_API_KEY/domain.com/path",
        },
        400,
        request,
      );
    }

    // Optional allowlist
    if (env.ALLOWLIST) {
      const allow = env.ALLOWLIST.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!allow.includes(targetDomain)) {
        return json(
          { error: "Target not allowed", targetDomain, allowlist: allow },
          403,
          request,
        );
      }
    }

    // Upstream URL (always HTTPS)
    const upstream = new URL(`https://${targetDomain}${restPath}`);
    upstream.search = url.search;

    // Sanitize headers (prevent IP leak + hop-by-hop cleanup)
    const headers = new Headers(request.headers);

    // hop-by-hop/proxy internal
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("keep-alive");
    headers.delete("transfer-encoding");
    headers.delete("upgrade");
    headers.delete("proxy-connection");

    // prevent real IP leak
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("forwarded");
    headers.delete("cf-connecting-ip");
    headers.delete("true-client-ip");
    headers.delete("x-client-ip");

    // optional safety: don't forward cookies by default
    headers.delete("cookie");

    headers.set("x-proxy", "api-proxy-edge");

    let resp;
    try {
      resp = await fetch(upstream.toString(), {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : request.body,
        redirect: "follow",
      });
    } catch (e) {
      return json(
        { error: "Upstream fetch failed", message: String(e?.message || e) },
        502,
        request,
      );
    }

    // Add CORS headers to response
    const outHeaders = new Headers(resp.headers);
    const cors = corsHeaders(request);
    for (const [k, v] of Object.entries(cors)) outHeaders.set(k, v);

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: outHeaders,
    });
  },
};

function corsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("access-control-request-headers") || "*",
  };
}

function json(obj, status, request) {
  const h = new Headers({ "content-type": "application/json; charset=utf-8" });
  const cors = corsHeaders(request);
  for (const [k, v] of Object.entries(cors)) h.set(k, v);
  return new Response(JSON.stringify(obj, null, 2), { status, headers: h });
}

function isValidTarget(target) {
  if (!target || typeof target !== "string") return false;
  const lower = target.toLowerCase();

  const blocked = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "metadata.google.internal",
  ]);
  if (blocked.has(lower)) return false;

  // block IP literals (simple SSRF mitigation)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) return false;
  if (lower.includes(":")) return false;

  if (!lower.includes(".")) return false;
  if (!/^[a-z0-9.-]+$/.test(lower)) return false;
  if (lower.length > 253) return false;

  return true;
}
