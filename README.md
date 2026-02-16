# 🧭 API Proxy Server (SOCKS5 Optional)

A production-ready **Node.js reverse proxy server** that routes API
traffic:

- 🌍 Directly via server IP (default)
- 🧦 Or through optional SOCKS5 proxy
- 🔐 Protected by path-based API key
- 🐳 Docker-ready
- 🚀 Published to Docker Hub & GHCR
- 📡 Deployable on MikroTik RouterOS v7 Containers

---

# 📦 Docker Images

## Docker Hub

```bash
docker pull whoisgray/api-proxy-server
```

## GitHub Container Registry

```bash
docker pull ghcr.io/whoisgray/api-proxy-server
```

---

# 🚀 Quick Docker Run

## Direct Mode (No Proxy)

```bash
docker run -d   --name api-proxy-server   --restart unless-stopped   -p 42000:42000   -e PORT=42000   -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY   whoisgray/api-proxy-server
```

## With SOCKS5 Proxy (Optional)

```bash
docker run -d   --name api-proxy-server   --restart unless-stopped   -p 42000:42000   -e PORT=42000   -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY   -e SOCKS_PROXY=socks5://user:pass@host:port   whoisgray/api-proxy-server
```

If `SOCKS_PROXY` is not set, traffic goes directly through the server's
public IP.

---

# 📋 Request Format

    http://SERVER_IP:42000/YOUR_API_KEY/TARGET_DOMAIN/API_PATH

Example:

```bash
curl http://127.0.0.1:42000/YOUR_API_KEY/httpbin.org/get
```

---

# 🔥 MikroTik RouterOS v7 Deployment Guide

This runs directly inside MikroTik using built-in Container support.

---

## 1️⃣ Check Router Architecture

```routeros
/system/resource/print
```

Look for:

    architecture-name: arm64   (or x86_64)

---

## 2️⃣ Configure Container Registry

```routeros
/container/config/set registry-url=https://registry-1.docker.io tmpdir=disk1/tmp
```

Explanation: - registry-url → Docker Hub - tmpdir → storage location for
image extraction

---

## 3️⃣ Create Virtual Ethernet (veth)

```routeros
/interface/veth/add name=veth-api address=172.18.0.2/24 gateway=172.18.0.1
```

This gives the container its own internal IP.

---

## 4️⃣ Create Bridge for Containers

```routeros
/interface/bridge/add name=br-cont
/interface/bridge/port/add bridge=br-cont interface=veth-api
/ip/address/add address=172.18.0.1/24 interface=br-cont
```

Creates internal container network.

---

## 5️⃣ Enable Internet Access (NAT)

```routeros
/ip/firewall/nat/add chain=srcnat src-address=172.18.0.0/24 out-interface=WAN action=masquerade
```

Replace `WAN` with your internet interface.

---

## 6️⃣ Define Environment Variables

```routeros
/container/envs/add name=ENV_API_PROXY key=PORT value=42000
/container/envs/add name=ENV_API_PROXY key=EXPECTED_API_KEY value=YOUR_SUPER_SECRET_KEY
```

Optional SOCKS proxy:

```routeros
/container/envs/add name=ENV_API_PROXY key=SOCKS_PROXY value=socks5://user:pass@host:port
```

---

## 7️⃣ Pull & Create Container

```routeros
/container/add   name=api-proxy   remote-image=whoisgray/api-proxy-server:latest   interface=veth-api   root-dir=disk1/images/api-proxy   envlist=ENV_API_PROXY   start-on-boot=yes   logging=yes
```

---

## 8️⃣ Start Container (Important)

```routeros
/container/start api-proxy
```

If it doesn't auto-start, run this manually.

---

## 9️⃣ Port Forward (Optional)

```routeros
/ip/firewall/nat/add chain=dstnat protocol=tcp dst-port=42000 action=dst-nat to-addresses=172.18.0.2 to-ports=42000
```

---

# 🏗 Architecture Flow

1.  Client sends request with secret key in path.
2.  Server validates `EXPECTED_API_KEY`.
3.  Target domain extracted dynamically.
4.  If `SOCKS_PROXY` exists → traffic routed via proxy.
5.  If not → direct HTTPS via server IP.
6.  Response streamed back to client.

---

# 🔐 Security Recommendations

- Use strong random keys
- Restrict WAN access if not needed
- Put behind HTTPS reverse proxy in production
- Monitor logs

---

# 📄 License

MIT License

---

# ⚠ Disclaimer

Use responsibly and in accordance with local regulations and service
provider terms.
