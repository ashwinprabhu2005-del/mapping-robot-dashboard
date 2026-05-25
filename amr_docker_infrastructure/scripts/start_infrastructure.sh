#!/bin/bash
# Start complete AMR Docker infrastructure

echo "Starting AMR Docker Infrastructure..."

# Verify .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "⚠️ .env file not found! Copying .env.example to .env..."
        cp .env.example .env
    else
        echo "❌ .env file and .env.example not found!"
        exit 1
    fi
fi

# Load variables
source .env

# 1. Start MQTT broker first to generate passwords
docker compose up -d mosquitto
echo "Waiting for MQTT broker to boot..."
sleep 3

# 2. Add users to MQTT password file dynamically from .env values
echo "Registering credentials using setup_mqtt_users.sh..."
chmod +x ./scripts/setup_mqtt_users.sh
./scripts/setup_mqtt_users.sh

# 3. Start remaining containers
docker compose up -d

# Wait for services to be healthy
echo "Waiting for services to initialize..."
sleep 10

# Check status
echo ""
echo "Service Cluster Status:"
docker compose ps

echo ""
echo "✅ Infrastructure running!"
echo ""
echo "Services available at:"
echo "  MQTT Broker:    localhost:1883"
echo "  InfluxDB UI:    http://localhost:8086"
echo "  API Server:     http://localhost:8000"
echo "  Rosbridge:      ws://localhost:9090"
echo "  Web Dashboard:  http://localhost:5173"
echo ""
echo "Now configure Jetson Nano to connect to this Docker host"
echo "Set docker_host_ip in publisher_config.yaml"
