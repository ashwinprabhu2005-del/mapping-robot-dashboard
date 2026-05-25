#!/bin/bash
echo "Setting up InfluxDB..."

# Wait for InfluxDB to be ready
until curl -s http://localhost:8086/ping > /dev/null; do
  echo "Waiting for InfluxDB to start..."
  sleep 2
done

# Perform setup
influx setup \
  --username admin \
  --password "${INFLUXDB_PASSWORD}" \
  --org amr_org \
  --bucket amr_data \
  --retention 30d \
  --token "${INFLUXDB_TOKEN}" \
  --force

# Create additional buckets
influx bucket create \
  --name amr_maps \
  --retention 365d \
  --org amr_org \
  --token "${INFLUXDB_TOKEN}"

influx bucket create \
  --name amr_events \
  --retention 365d \
  --org amr_org \
  --token "${INFLUXDB_TOKEN}"

echo "✅ InfluxDB setup complete"
echo "Buckets created:"
echo "  amr_data   (sensor telemetry, 30d retention)"
echo "  amr_maps   (map data, 365d retention)"
echo "  amr_events (events, 365d retention)"
