#!/bin/bash
# Test all infrastructure connections work

echo "Testing AMR Infrastructure Connections..."
echo ""

PASS=0
FAIL=0

# Test helper using bash native socket checks
check_port() {
    local host=$1
    local port=$2
    local name=$3
    if (echo > /dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
        echo "  $name (port $port):  ✅ RUNNING"
        ((PASS++))
        return 0
    else
        echo "  $name (port $port):  ❌ NOT RUNNING"
        ((FAIL++))
        return 1
    fi
}

# Check Mosquitto MQTT
check_port "127.0.0.1" 1883 "MQTT Broker"

# Check InfluxDB
check_port "127.0.0.1" 8086 "InfluxDB"

# Check PostgreSQL
check_port "127.0.0.1" 5432 "PostgreSQL"

# Check Rosbridge
check_port "127.0.0.1" 9090 "Rosbridge WebSocket"

# Check API Server
check_port "127.0.0.1" 8000 "FastAPI REST API"

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -eq 0 ]; then
    echo "✅ All services running! Ready for robot connection."
else
    echo "❌ Some services failed to start. Run: docker compose logs"
    exit 1
fi
