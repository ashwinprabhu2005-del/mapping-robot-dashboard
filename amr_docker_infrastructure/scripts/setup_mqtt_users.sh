#!/bin/bash
# Setup MQTT Users for AMR Infrastructure
# Creates users inside the Mosquitto container

echo "Registering credentials in MQTT password file..."
docker compose exec -T mosquitto touch /mosquitto/config/passwd
docker compose exec -T mosquitto mosquitto_passwd -b /mosquitto/config/passwd amr_robot "${MQTT_AMR_ROBOT_PASSWORD:-amr_password}"
docker compose exec -T mosquitto mosquitto_passwd -b /mosquitto/config/passwd data_router "${MQTT_DATA_ROUTER_PASSWORD:-router_password}"
docker compose exec -T mosquitto mosquitto_passwd -b /mosquitto/config/passwd rosbridge "${MQTT_ROSBRIDGE_PASSWORD:-bridge_password}"
docker compose exec -T mosquitto mosquitto_passwd -b /mosquitto/config/passwd dashboard "${MQTT_DASHBOARD_PASSWORD:-dashboard_password}"
echo "MQTT users registered."
