#!/bin/bash
# start.sh — Smart network launcher with persistent ledger support.
#
# MODES:
#   ./start.sh          → Restart containers reusing existing persistent ledger volumes
#   ./start.sh --fresh  → Wipe everything (ledger + CA) and start from scratch
#
# On first ever run, you MUST run ./setup-volumes.sh first to create the
# named Docker volumes that persist across restarts.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NET="$SCRIPT_DIR/fabric-samples/test-network"
FRESH=false

for arg in "$@"; do
    [[ "$arg" == "--fresh" ]] && FRESH=true
done

# ─── Helper: check if persistent ledger volumes already have data ─────────────
ledger_has_data() {
    docker volume inspect fabric_ledger_peer0_org1 &>/dev/null && \
    [ "$(docker run --rm -v fabric_ledger_peer0_org1:/data alpine sh -c 'ls /data 2>/dev/null | wc -l')" -gt "0" ]
}

echo "🚀 Starting Hyperledger Fabric Network..."

# ─── Ensure persistent volumes exist ─────────────────────────────────────────
echo ""
echo "🗄️  Ensuring persistent Docker volumes exist..."
bash "$SCRIPT_DIR/setup-volumes.sh"

cd "$TEST_NET"

if $FRESH; then
    # ── FRESH MODE: wipe everything including ledger ──────────────────────────
    echo ""
    echo "⚠️  FRESH MODE: wiping all containers and ledger volumes..."
    ./network.sh down || true
    docker ps -a --format "{{.ID}} {{.Names}}" | grep -E "peer|orderer|ca_" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
    # Remove ledger volumes (they will be recreated empty by setup-volumes.sh above)
    for vol in fabric_ledger_orderer fabric_ledger_peer0_org1 fabric_ledger_peer0_org2 fabric_ledger_peer0_org3; do
        docker volume rm "$vol" 2>/dev/null || true
        docker volume create "$vol"
    done

    echo ""
    echo "🐳 Starting fresh network..."
    ./network.sh up createChannel -c mychannel -ca

    echo ""
    echo "➕ Adding Org3..."
    cd "$TEST_NET/addOrg3"
    ./addOrg3.sh up -c mychannel -ca

    echo ""
    echo "📦 Deploying chaincode..."
    bash "$SCRIPT_DIR/deploycc.sh"

else
    # ── PERSIST MODE: restart containers, keep ledger volumes intact ──────────
    echo ""
    # Stop containers without removing volumes (--volumes flag is intentionally omitted)
    echo "🧹 Stopping existing containers (preserving ledger volumes)..."
    docker ps -a --format "{{.ID}} {{.Names}}" | grep -E "peer|orderer|ca_" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

    if ledger_has_data; then
        echo ""
        echo "✅ Existing ledger data found — restarting peers without redeploying chaincode."
        echo ""
        echo "🐳 Starting network (reusing existing ledger)..."

        # Required by docker-compose-test-net.yaml volume mount
        export DOCKER_SOCK="${DOCKER_SOCK:-/var/run/docker.sock}"

        # Bring up with persistent volume compose override (no createChannel — channel already exists)
        docker compose \
            -f compose/compose-test-net.yaml \
            -f compose/compose-ca.yaml \
            -f compose/compose-ledger-persist.yaml \
            -f compose/docker/docker-compose-test-net.yaml \
            --project-name fabric up -d

        echo ""
        echo "➕ Starting Org3 peer..."
        cd "$TEST_NET/addOrg3"
        docker compose \
            -f compose/compose-ca-org3.yaml \
            -f compose/compose-org3.yaml \
            -f compose/docker/docker-compose-org3.yaml \
            -f compose/compose-ledger-persist-org3.yaml \
            --project-name fabric up -d

    else
        echo ""
        echo "📋 No existing ledger found — running full network setup..."
        ./network.sh up createChannel -c mychannel -ca

        echo ""
        echo "➕ Adding Org3..."
        cd "$TEST_NET/addOrg3"
        ./addOrg3.sh up -c mychannel -ca

        echo ""
        echo "📦 Deploying chaincode..."
        bash "$SCRIPT_DIR/deploycc.sh"
    fi
fi

echo ""
echo "✅ Network started successfully!"
echo ""
echo "   To restart (keep ledger data):  ./start.sh"
echo "   To wipe and start fresh:        ./start.sh --fresh"