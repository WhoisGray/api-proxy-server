
# =====================================================
#  API Proxy Server + Cloudflare Tunnel
#  MikroTik RouterOS v7 Container Auto Setup Pack
# =====================================================
#
#  ✔ Creates bridge & veth interfaces
#  ✔ Configures NAT for containers
#  ✔ Deploys API Proxy container
#  ✔ Deploys Cloudflare Tunnel container
#  ✔ Starts everything
#  ✔ Safe to re-run (basic existence checks included)
#
#  👉 EDIT THESE VARIABLES BEFORE RUNNING
# =====================================================

:local DISK "disk1"                 # External storage name
:local WAN "ether1"                 # Your WAN interface
:local API_KEYS "key1,key2,key3"    # Comma-separated API keys
:local CF_TOKEN "YOUR_CLOUDFLARE_TOKEN"

# =====================================================
#  Network Configuration
# =====================================================

:local BRIDGE_NAME "br-cont"
:local VETH_API "veth-api"
:local VETH_CF "veth-cf"

:local BRIDGE_IP "172.18.0.1/24"
:local API_IP "172.18.0.2/24"
:local CF_IP "172.18.0.3/24"

# =====================================================
#  Image Configuration
# =====================================================

:local API_IMAGE "whoisgray/api-proxy-server:latest"
:local CF_IMAGE "cloudflare/cloudflared:latest"

:local API_ROOT ($DISK . "/images/api-proxy")
:local CF_ROOT  ($DISK . "/images/cloudflared")
:local TMPDIR   ($DISK . "/tmp")

# =====================================================
#  Container System Setup
# =====================================================

/container/config/set registry-url=https://registry-1.docker.io tmpdir=$TMPDIR

# =====================================================
#  Create Bridge (if not exists)
# =====================================================

:if ([:len [/interface/bridge/find name=$BRIDGE_NAME]] = 0) do={
    /interface/bridge/add name=$BRIDGE_NAME
}

# =====================================================
#  Create VETH Interfaces (if not exists)
# =====================================================

:if ([:len [/interface/veth/find name=$VETH_API]] = 0) do={
    /interface/veth/add name=$VETH_API address=$API_IP gateway=172.18.0.1
}

:if ([:len [/interface/veth/find name=$VETH_CF]] = 0) do={
    /interface/veth/add name=$VETH_CF address=$CF_IP gateway=172.18.0.1
}

# =====================================================
#  Attach VETH to Bridge
# =====================================================

:if ([:len [/interface/bridge/port/find interface=$VETH_API]] = 0) do={
    /interface/bridge/port/add bridge=$BRIDGE_NAME interface=$VETH_API
}

:if ([:len [/interface/bridge/port/find interface=$VETH_CF]] = 0) do={
    /interface/bridge/port/add bridge=$BRIDGE_NAME interface=$VETH_CF
}

# =====================================================
#  Assign Bridge IP (Gateway)
# =====================================================

:if ([:len [/ip/address/find interface=$BRIDGE_NAME]] = 0) do={
    /ip/address/add address=$BRIDGE_IP interface=$BRIDGE_NAME
}

# =====================================================
#  NAT for Container Network
# =====================================================

:if ([:len [/ip/firewall/nat/find chain=srcnat src-address="172.18.0.0/24" out-interface=$WAN]] = 0) do={
    /ip/firewall/nat/add chain=srcnat src-address=172.18.0.0/24 out-interface=$WAN action=masquerade
}

# =====================================================
#  Environment Variables for API Proxy
# =====================================================

/container/envs/remove [find name="ENV_API_PROXY"]

/container/envs/add name=ENV_API_PROXY key=PORT value=42000
/container/envs/add name=ENV_API_PROXY key=EXPECTED_API_KEY value=$API_KEYS

# =====================================================
#  Create API Proxy Container (if not exists)
# =====================================================

:if ([:len [/container/find name="api-proxy"]] = 0) do={
    /container/add         name=api-proxy         remote-image=$API_IMAGE         interface=$VETH_API         root-dir=$API_ROOT         envlist=ENV_API_PROXY         start-on-boot=yes         logging=yes
}

# =====================================================
#  Create Cloudflare Tunnel Container (if not exists)
#  IMPORTANT: Token must be directly inside cmd
# =====================================================

:if ([:len [/container/find name="cloudflared"]] = 0) do={
    /container/add         name=cloudflared         remote-image=$CF_IMAGE         interface=$VETH_CF         root-dir=$CF_ROOT         cmd=("tunnel --no-autoupdate run --token " . $CF_TOKEN)         start-on-boot=yes         logging=yes
}

# =====================================================
#  Start Containers
# =====================================================

/container/start api-proxy
/container/start cloudflared

:put "====================================================="
:put "✅ API Proxy + Cloudflare Tunnel deployed successfully"
:put "👉 API Proxy Internal IP: 172.18.0.2"
:put "👉 Remember to configure Public Hostname in Cloudflare"
:put "====================================================="
