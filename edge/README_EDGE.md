# ☁️ API Proxy Server – Cloudflare Worker (Edge Version)

High-performance **Edge reverse proxy** built for Cloudflare Workers.

This version is designed for:

- 🌍 Global low-latency routing via Cloudflare Edge
- 🔑 Multi-tenant API keys (comma-separated)
- 🔒 IP leak protection (removes forwarded headers)
- 🚀 Zero open ports required
- 🛡 Optional target allowlist
- ⚡ Direct HTTPS routing (no SOCKS support on Edge)

---

# 🔑 Multi-Key Authentication

Set your API keys as a secret (comma-separated):

```bash
wrangler secret put EXPECTED_API_KEY
```

Example value:

```
key1,key2,key3
```

Optional allowlist (set in wrangler.toml):

```toml
[vars]
ALLOWLIST = "api.openai.com,generativelanguage.googleapis.com"
```

---

# 🌍 Usage Format

```
https://your-worker-domain/API_KEY/targetdomain.com/path
```

Example:

```bash
curl https://proxy.example.com/key1/httpbin.org/get
```

---

# 🔒 Security Features

- Removes:
  - X-Forwarded-For
  - CF-Connecting-IP
  - X-Real-IP
  - Forwarded
  - True-Client-IP
- Blocks:
  - localhost
  - 127.0.0.1
  - internal/private IP targets
- Optional domain allowlist
- No cookie forwarding by default

Designed to prevent open-proxy abuse and IP leakage.

---

# 🚀 Deployment

1️⃣ Install Wrangler

```bash
npm install -g wrangler
```

2️⃣ Login

```bash
wrangler login
```

3️⃣ Deploy

```bash
wrangler deploy
```

---

# 📁 Project Structure

```
edge/
├── worker.js
├── wrangler.toml
└── README_EDGE.md
```

---

# ⚠️ Important Notes

- Edge version supports only direct HTTPS (no SOCKS5 support).
- Best used behind a custom domain.
- For heavy policy control or SOCKS routing, use the main Docker version.

---

# 🏆 What This Provides

✔ Global edge proxy  
✔ Multi-key support  
✔ IP leak prevention  
✔ Optional allowlist  
✔ Zero infrastructure required

A lightweight, secure, globally distributed proxy layer.

---

MIT License
