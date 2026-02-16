# 🧭 API Proxy Server (SOCKS5 Optional) + Cloudflare Tunnel + MikroTik Guide

Production-ready **Node.js reverse proxy** built for:

- 🌍 Direct overseas VPS usage (no proxy required)
- 🧦 Optional SOCKS5 routing
- 🔐 Path-based API key protection
- 🐳 Docker (Docker Hub + GHCR)
- ☁️ Cloudflare Tunnel integration
- 🧱 MikroTik RouterOS v7 Containers

This guide is fully **copy‑paste ready** and battle-tested.

---

# 📦 Docker Images

### Docker Hub

```bash
docker pull whoisgray/api-proxy-server:latest
```

### GitHub Container Registry

```bash
docker pull ghcr.io/whoisgray/api-proxy-server:latest
```

---

# 🚀 Quick Start (Normal Docker)

## Direct Mode (Recommended)

```bash
docker run -d   --name api-proxy-server   --restart unless-stopped   -p 42000:42000   -e PORT=42000   -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY   whoisgray/api-proxy-server:latest
```

## SOCKS5 Mode (Optional)

```bash
docker run -d   --name api-proxy-server   --restart unless-stopped   -p 42000:42000   -e PORT=42000   -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY   -e SOCKS_PROXY=socks5://user:pass@host:port   whoisgray/api-proxy-server:latest
```

If `SOCKS_PROXY` is not set → traffic goes directly through server IP.

---

# 📋 Usage Format

```
http://SERVER_IP:42000/YOUR_API_KEY/TARGET_DOMAIN/API_PATH
```

Example:

```bash
curl http://127.0.0.1:42000/YOUR_API_KEY/httpbin.org/get
```

---

# 🔥 MikroTik RouterOS v7 – FULL SETUP

> Recommended to use external storage (USB/SSD). Replace `disk1` if needed.

---

## 1️⃣ Check Architecture

```routeros
/system/resource/print
```

Look for:

```
architecture-name: arm64  (or x86_64)
```

---

## 2️⃣ Configure Container System

```routeros
/container/config/set registry-url=https://registry-1.docker.io tmpdir=disk1/tmp
```

---

## 3️⃣ Create Container Network

### Create bridge

```routeros
/interface/bridge/add name=br-cont
```

### Create veth for API Proxy

```routeros
/interface/veth/add name=veth-api address=172.18.0.2/24 gateway=172.18.0.1
```

### Create veth for Cloudflare Tunnel

```routeros
/interface/veth/add name=veth-cf address=172.18.0.3/24 gateway=172.18.0.1
```

### Attach to bridge

```routeros
/interface/bridge/port/add bridge=br-cont interface=veth-api
/interface/bridge/port/add bridge=br-cont interface=veth-cf
/ip/address/add address=172.18.0.1/24 interface=br-cont
```

---

## 4️⃣ Allow Internet Access (NAT)

Replace `WAN` with your internet interface:

```routeros
/ip/firewall/nat/add chain=srcnat src-address=172.18.0.0/24 out-interface=WAN action=masquerade
```

---

## 5️⃣ Environment Variables for API Proxy

```routeros
/container/envs/add name=ENV_API_PROXY key=PORT value=42000
/container/envs/add name=ENV_API_PROXY key=EXPECTED_API_KEY value=YOUR_SUPER_SECRET_KEY
```

Optional SOCKS:

```routeros
/container/envs/add name=ENV_API_PROXY key=SOCKS_PROXY value=socks5://user:pass@host:port
```

---

## 6️⃣ Create API Proxy Container

```routeros
/container/add   name=api-proxy   remote-image=whoisgray/api-proxy-server:latest   interface=veth-api   root-dir=disk1/images/api-proxy   envlist=ENV_API_PROXY   start-on-boot=yes   logging=yes
```

Start it manually (important):

```routeros
/container/start api-proxy
```

---

# ☁️ Cloudflare Tunnel Setup (Second Container)

## 1️⃣ Create Tunnel in Cloudflare

Go to:
Zero Trust → Networks → Tunnels → Create Tunnel

Copy your **Tunnel Token**.

---

## 2️⃣ Create Cloudflare Container (IMPORTANT FIX INCLUDED)

⚠️ MikroTik does NOT expand environment variables inside `cmd`.

So DO NOT use `$TUNNEL_TOKEN`.

Use the token directly like this:

```routeros
/container/add   name=cloudflared   remote-image=cloudflare/cloudflared:latest   interface=veth-cf   root-dir=disk1/images/cloudflared   cmd="tunnel --no-autoupdate run --token YOUR_REAL_TOKEN_HERE"   start-on-boot=yes   logging=yes
```

Start it:

```routeros
/container/start cloudflared
```

---

## 3️⃣ Configure Public Hostname

In Cloudflare Tunnel settings:

- Hostname: `proxy.yourdomain.com`
- Service Type: HTTP
- URL:

```
http://172.18.0.2:42000
```

---

# ✅ Final Test

From anywhere on internet:

```bash
curl "https://proxy.yourdomain.com/YOUR_API_KEY/httpbin.org/get"
```

If JSON returns → everything is working.

---

# 🔐 Security Tips

- Use strong random API keys
- Prefer Cloudflare Tunnel over exposing port 42000
- Restrict MikroTik management ports
- Avoid logging secrets in production

---

# 🏆 What We Built

✔ Dockerized reverse proxy  
✔ Optional SOCKS5 routing  
✔ Multi-arch ready  
✔ Runs on MikroTik  
✔ Secured behind Cloudflare Tunnel  
✔ Public domain without opening ports

Absolute production-grade setup.

---

# 📄 License

MIT
