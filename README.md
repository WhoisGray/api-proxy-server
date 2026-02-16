# 🧭 API Proxy Server (SOCKS5 Optional)

A lightweight, production-ready **Node.js reverse proxy server**
designed to route API requests directly or through an optional **SOCKS5
proxy**.

Ideal for deploying on **international servers** to access services such
as:

- OpenAI API
- Google AI (Gemini)
- GitHub API
- Any public HTTPS API

Now supports: - ✅ Optional SOCKS5 proxy (auto-detect if provided) - 🔐
Path-based API key authentication - 🐳 Docker & CI/CD ready (Docker
Hub + GHCR) - 🌍 Perfect for overseas VPS deployments

---

# 🚀 Features

- 🔐 **Path-based API Key Authentication**
- 🧦 **Optional SOCKS5 Proxy Support**
- 🌐 **Direct Server IP fallback (no proxy required)**
- 🔄 **Dynamic Domain Routing**
- 🐳 **Docker Ready**
- 📦 **Published on Docker Hub & GHCR**
- 📜 Request logging
- ❗ Robust error handling
- 🌍 CORS enabled

---

# 📦 Docker Images

You can pull directly from:

## Docker Hub

```bash
docker pull whoisgray/api-proxy-server
```

## GitHub Container Registry

```bash
docker pull ghcr.io/whoisgray/api-proxy-server
```

---

# ⚡ Quick Start

## Run with Docker

```bash
docker run -d   --name api-proxy-server   -p 42000:42000   -e PORT=42000   -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY   whoisgray/api-proxy-server
```

## With Optional SOCKS5 Proxy

```bash
docker run -d   --name api-proxy-server   -p 42000:42000   -e PORT=42000   -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY   -e SOCKS_PROXY=socks5://user:pass@host:port   whoisgray/api-proxy-server
```

If `SOCKS_PROXY` is not provided, the server connects directly using the
VPS public IP.

---

# 📋 Usage

## Request Format

    http://SERVER_IP:42000/YOUR_API_KEY/TARGET_DOMAIN/API_PATH

Example:

```bash
curl http://127.0.0.1:42000/YOUR_API_KEY/httpbin.org/get
```

---

# 🔍 Examples

## OpenAI

```bash
curl -X POST http://127.0.0.1:42000/YOUR_API_KEY/api.openai.com/v1/chat/completions   -H "Authorization: Bearer YOUR_OPENAI_KEY"   -H "Content-Type: application/json"   -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello!"}]}'
```

## Google Gemini

```bash
curl -X POST http://127.0.0.1:42000/YOUR_API_KEY/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GOOGLE_KEY -H "Content-Type: application/json" -d '{"contents":[{"parts":[{"text":"Hello!"}]}]}'
```

---

# ⚙️ Environment Variables

Variable Required Description

---

PORT No Default: 42000
EXPECTED_API_KEY Yes Secret key required in path
SOCKS_PROXY No SOCKS5 proxy URL
NODE_ENV No production / development

---

# 🏗 Architecture

1.  Client sends request including API key in path.
2.  Server validates `EXPECTED_API_KEY`.
3.  Target domain extracted dynamically.
4.  If `SOCKS_PROXY` exists → traffic routed through proxy.
5.  If not → direct HTTPS request via server IP.
6.  Response streamed back to client.

---

# 🔐 Security Notes

- Path-based key provides lightweight protection.
- Use strong random keys.
- Restrict firewall access if exposing publicly.
- Use HTTPS (via Nginx/Traefik) in production.
- Avoid logging sensitive production keys.

---

# 🐳 Docker Compose Example

```yaml
version: "3.8"

services:
  api-proxy:
    image: whoisgray/api-proxy-server
    container_name: api-proxy-server
    restart: unless-stopped
    ports:
      - "42000:42000"
    environment:
      PORT: 42000
      EXPECTED_API_KEY: YOUR_SUPER_SECRET_KEY
      # Optional:
      # SOCKS_PROXY: socks5://host:port
```

---

# 🔄 CI/CD

Automatically builds and pushes Docker images to:

- Docker Hub
- GitHub Container Registry

Triggered on: - Push to `main` - Version tags (v\*)

---

# 🛠 Development

```bash
npm install
npm run dev
```

---

# 📄 License

MIT License

---

# ⚠ Disclaimer

Use responsibly and in compliance with service provider terms and local
regulations.
