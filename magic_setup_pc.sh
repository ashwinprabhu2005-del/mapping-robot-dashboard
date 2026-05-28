#!/bin/bash
# MAGIC SETUP SCRIPT FOR PC (Mac/Windows WSL/Linux)

set -e

echo "=========================================================="
echo " 🪄 STARTING PC MAGIC SETUP... "
echo "=========================================================="

echo "Step 1: Setting up passwords automatically..."
if [ ! -f "amr_docker_infrastructure/.env" ]; then
    cp amr_docker_infrastructure/.env.example amr_docker_infrastructure/.env
    echo "✅ Created secure database passwords."
else
    echo "✅ Passwords already configured."
fi

echo "Step 2: Starting Docker Databases & MQTT Router..."
if ! command -v docker &> /dev/null
then
    echo "❌ ERROR: Docker is not installed or not running!"
    echo "Please download Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

cd amr_docker_infrastructure
chmod +x scripts/setup_mqtt_users.sh
./scripts/setup_mqtt_users.sh > /dev/null 2>&1
chmod +x scripts/start_infrastructure.sh
./scripts/start_infrastructure.sh
cd ..
echo "✅ Docker Services are running in the background!"

echo "Step 3: Setting up the Dashboard..."
if ! command -v npm &> /dev/null
then
    echo "❌ ERROR: Node.js (npm) is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

npm install > /dev/null 2>&1
echo "✅ Dashboard installed."

# Show local IP address so user knows what to type into Jetson
echo "=========================================================="
echo " 🌐 YOUR PC'S IP ADDRESS IS:"
if command -v ifconfig &> /dev/null; then
    ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
elif command -v ipconfig &> /dev/null; then
    ipconfig | findstr IPv4
else
    hostname -I
fi
echo " (Write this down! The Jetson will ask for it.)"
echo "=========================================================="
echo "🚀 STARTING DASHBOARD NOW..."
echo "Keep this window open! Open your browser to: http://localhost:5173"
echo "=========================================================="
npm run dev
