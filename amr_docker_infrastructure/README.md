# AMR Docker Host Infrastructure

This directory contains the multi-container configuration for the PC/Server side of the Autonomous Mobile Robot monitoring stack.

## Services
- **mosquitto**: Receives raw MQTT topics from the robot.
- **influxdb**: High-frequency time-series database.
- **postgresql**: Relational database for maps, sessions, events, and annotated zones.
- **data_router**: Routes MQTT telemetry payloads to PostgreSQL and InfluxDB.
- **rosbridge**: Republishes MQTT messages to local ROS2 nodes and exposes a WebSocket server on port 9090.
- **api_server**: FastAPI REST endpoints querying databases and sending commands to MQTT.

## Quick Start
1. Edit the `.env` settings to change passwords.
2. Launch the infrastructure:
   ```bash
   ./scripts/start_infrastructure.sh
   ```
3. Verify connection states:
   ```bash
   ./scripts/test_connections.sh
   ```
