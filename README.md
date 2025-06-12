# SOCKS5 Reverse Proxy Server

A lightweight Node.js reverse proxy server that routes API requests through SOCKS5 proxy, designed to bypass geographical restrictions for services like OpenAI API and Google AI.

## 🌟 Features

- **SOCKS5 Proxy Support**: Route all requests through your SOCKS5 proxy
- **Dynamic Routing**: Support any domain with simple URL structure
- **CORS Enabled**: No cross-origin issues
- **Docker Ready**: Easy deployment with Docker
- **Request Logging**: Monitor all proxied requests
- **Health Checks**: Built-in monitoring
- **Error Handling**: Robust error management

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/WhoisGray/api-proxy-server.git
cd socks5-reverse-proxy

# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t socks5-proxy .
docker run -p 42000:42000 socks5-proxy
```

### Using Node.js

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development
npm run dev
```

## 📋 Usage

### Base URL Format

```
http://127.0.0.1:42000/TARGET_DOMAIN/API_PATH
```

### Examples

#### OpenAI API

```bash
# Original URL: https://api.openai.com/v1/chat/completions
# Proxy URL: http://127.0.0.1:42000/api.openai.com/v1/chat/completions

curl -X POST http://127.0.0.1:42000/api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Google AI (Gemini)

```bash
# Original URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
# Proxy URL: http://127.0.0.1:42000/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent

curl -X POST http://127.0.0.1:42000/generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}]
  }'
```

#### Any Other API

```bash
# Example: GitHub API
curl http://127.0.0.1:42000/api.github.com/user \
  -H "Authorization: token YOUR_TOKEN"
```

## 🔧 Configuration

### Environment Variables

| Variable      | Default                    | Description      |
| ------------- | -------------------------- | ---------------- |
| `PORT`        | `42000`                    | Server port      |
| `SOCKS_PROXY` | `socks5://127.0.0.1:18086` | SOCKS5 proxy URL |
| `NODE_ENV`    | `development`              | Environment mode |

### Modify SOCKS5 Proxy

Edit the `server.js` file:

```javascript
const socksProxy = "socks5://127.0.0.1:18086"; // Change this
```

Or use environment variable:

```bash
export SOCKS_PROXY=socks5://your-proxy-host:port
npm start
```

## 🐳 Docker Configuration

### Build Image

```bash
docker build -t socks5-proxy .
```

### Run Container

```bash
docker run -d \
  --name socks5-proxy \
  -p 42000:42000 \
  -e SOCKS_PROXY=socks5://host.docker.internal:18086 \
  socks5-proxy
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔌 Integration Examples

### n8n Workflow

Configure your n8n nodes:

- **OpenAI Base URL**: `http://127.0.0.1:42000/api.openai.com`
- **Google AI Base URL**: `http://127.0.0.1:42000/generativelanguage.googleapis.com`

### Python Requests

```python
import requests

# OpenAI API through proxy
response = requests.post(
    'http://127.0.0.1:42000/api.openai.com/v1/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'model': 'gpt-3.5-turbo',
        'messages': [{'role': 'user', 'content': 'Hello!'}]
    }
)
```

## 📊 Monitoring

### Health Check

```bash
curl http://127.0.0.1:42000/
```

### Logs

The server logs all requests with timestamps:

```
2024-06-12T10:30:45.123Z - POST /api.openai.com/v1/chat/completions
Proxying to: https://api.openai.com/v1/chat/completions
```

## 🛡️ Security Notes

- The server runs as a non-root user in Docker
- All requests are logged for monitoring
- CORS is enabled for development (configure for production)
- Use HTTPS in production environments

## 🔧 Development

### Project Structure

```
├── server.js          # Main application
├── package.json       # Dependencies
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose setup
└── README.md         # Documentation
```

### Running Tests

```bash
# Install dev dependencies
npm install

# Run the server
npm run dev

# Test the proxy
curl http://127.0.0.1:42000/httpbin.org/get
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**Connection refused**

- Check if SOCKS5 proxy is running on specified port
- Verify proxy credentials if required

**DNS resolution errors**

- Ensure the target domain is accessible
- Check network connectivity

**Docker networking**

- Use `host.docker.internal` instead of `127.0.0.1` for proxy address
- Verify port mappings in docker-compose.yml

### Support

- 📧 Create an issue on GitHub
- 💬 Check existing issues for solutions
- 📚 Read the documentation carefully

---

**⚠️ Disclaimer**: This tool is for legitimate use cases only. Ensure compliance with terms of service of the APIs you're accessing and local regulations regarding proxy usage.
