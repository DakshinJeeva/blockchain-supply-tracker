#!/bin/bash
# stop.sh — Stops all Fabric containers WITHOUT removing ledger volumes.
# Ledger data is preserved in named Docker volumes and will be reused by start.sh.

set -e

echo "🛑 Stopping Fabric containers (ledger volumes are preserved)..."

docker ps --format "{{.ID}} {{.Names}}" | grep -E "peer|orderer|ca_" | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true
docker ps -a --format "{{.ID}} {{.Names}}" | grep -E "peer|orderer|ca_" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

echo "✅ Network stopped. Ledger data is safe in Docker volumes."
echo "   Run ./start.sh to restart with existing data."
echo "   Run ./start.sh --fresh to wipe and start clean."