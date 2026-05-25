#!/bin/bash
# Stop all infrastructure containers

echo "Stopping AMR Docker Infrastructure..."
docker compose down
echo "✅ Infrastructure stopped successfully (volumes kept)."
