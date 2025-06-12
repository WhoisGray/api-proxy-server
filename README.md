# 🧭 SOCKS5 Reverse Proxy Server

A lightweight Node.js reverse proxy server that routes API requests through a SOCKS5 proxy, designed to bypass geographical restrictions for services like **OpenAI API** and **Google AI**, now with **path-based API key authentication**.

---

## 🌟 Features

- 🔐 **Path-based API Key Authentication**: Secure your proxy by requiring a secret key in the URL path.
- 🧦 **SOCKS5 Proxy Support**: Route all requests through your SOCKS5 proxy.
- 🚀 **Dynamic Routing**: Support any domain with simple URL structure.
- 🔄 **CORS Enabled**: No cross-origin issues.
- 🐳 **Docker Ready**: Easy deployment with Docker.
- 📜 **Request Logging**: Monitor all proxied requests.
- ❗ **Error Handling**: Robust error management.

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/WhoisGray/api-proxy-server.git
cd socks5-reverse-proxy

# Create a .env file with your API key
echo "EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY_HERE" > .env

# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t socks5-proxy .
docker run -p 42000:42000 -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY_HERE socks5-proxy
```

### Using Node.js

```bash
# Install dependencies
npm install

# Set your secret key
echo "EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY_HERE" > .env

# Start the server
npm start

# For development
npm run dev
```

---

## 📋 Usage

### Base URL Format

All requests must include your secret API key as the first path segment:

```
http://127.0.0.1:42000/YOUR_API_KEY/TARGET_DOMAIN/API_PATH
```

Replace `YOUR_API_KEY` with your actual `EXPECTED_API_KEY` from `.env`.

### 🔍 Examples

#### OpenAI API

```bash
curl -X POST http://127.0.0.1:42000/YOUR_API_KEY/api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo","messages": [{"role": "user","content": "Hello!"}]}'
```

#### Google AI (Gemini)

```bash
curl -X POST http://127.0.0.1:42000/YOUR_API_KEY/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GOOGLE_API_KEY \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"parts": [{"text": "Hello!"}]}]}'
```

#### GitHub API

```bash
curl http://127.0.0.1:42000/YOUR_API_KEY/api.github.com/user \
  -H "Authorization: token YOUR_TOKEN"
```

---

## 🔧 Configuration

| Variable           | Default                    | Description                                  |
| ------------------ | -------------------------- | -------------------------------------------- |
| `PORT`             | `42000`                    | Server port                                  |
| `SOCKS_PROXY`      | `socks5://127.0.0.1:18086` | SOCKS5 proxy URL                             |
| `EXPECTED_API_KEY` | _(none)_                   | 🔐 Required: Your API key for authentication |
| `NODE_ENV`         | `development`              | Environment mode                             |

Edit `server.js` to change default SOCKS5 proxy, or use:

```bash
export SOCKS_PROXY=socks5://your-proxy-host:port
npm start
```

---

## 🐳 Docker Configuration

```bash
docker build -t socks5-proxy .

docker run -d \
  --name socks5-proxy \
  -p 42000:42000 \
  -e SOCKS_PROXY=socks5://host.docker.internal:18086 \
  -e EXPECTED_API_KEY=YOUR_SUPER_SECRET_KEY_HERE \
  socks5-proxy
```

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 🔌 Integration Examples

### n8n

Set custom base URL like:

- OpenAI: `http://127.0.0.1:42000/YOUR_API_KEY/api.openai.com`
- Google AI: `http://127.0.0.1:42000/YOUR_API_KEY/generativelanguage.googleapis.com`

### Python Requests

```python
import requests

PROXY_API_KEY = "YOUR_SUPER_SECRET_KEY_HERE"

response = requests.post(
    f'http://127.0.0.1:42000/{PROXY_API_KEY}/api.openai.com/v1/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_OPENAI_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'model': 'gpt-3.5-turbo',
        'messages': [{'role': 'user', 'content': 'Hello!'}]
    }
)
```

---

### Logs

```text
2024-06-12T10:30:45.123Z - POST /YOUR_API_KEY/api.openai.com/v1/chat/completions
✅ Response: 200 from api.openai.com
```

---

## 🛡️ Security Notes

- ✅ API Key in Path: basic authentication layer.
- 🐳 Runs as non-root in Docker.
- 🧾 All requests logged.
- 🌐 CORS enabled (adjust for production).
- 🔒 Use HTTPS in production.

---

## 🛠️ Development

**Project Structure**

```
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env
└── README.md
```

```bash
npm install
npm run dev
```

Test with:

```bash
curl http://127.0.0.1:42000/YOUR_API_KEY/httpbin.org/get
```

---

## 🤝 Contributing

- 🍴 Fork
- 🌿 Create feature branch
- 🛠️ Code & test
- ✅ Submit PR

---

## 📄 License

MIT License - see LICENSE

---

## 🆘 Troubleshooting

- ❌ 401 Unauthorized → check `EXPECTED_API_KEY`
- ❌ Connection refused → check SOCKS5 proxy
- ❌ DNS issues → verify domain & connectivity
- 🐳 Docker tips → use `host.docker.internal`

---

## 📬 Support

- 📧 [GitHub Issues](https://github.com/WhoisGray/api-proxy-server/issues)
- 🧠 Read documentation
- ⚠️ Use responsibly and legally!
