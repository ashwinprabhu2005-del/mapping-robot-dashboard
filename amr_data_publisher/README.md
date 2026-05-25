# AMR Data Publisher

This package is a ROS2 publisher designed to run on the Jetson Nano side of the Autonomous Mobile Robot (AMR). It subscribes to active ROS2 topics, serializes the payloads to JSON, and publishes them over WiFi to an external Docker Host using MQTT.

## Directory Structure
- `amr_data_publisher/`: Core Python nodes and connection modules.
- `config/`: Configurations for connection parameters and rate limits.
- `launch/`: ROS2 launch scripts.
- `scripts/`: Utilities for library installations and broker connectivity checks.
- `test/`: Basic pytest tests for connection loops and serialization.

## Next Steps
See [QUICK_START.md](QUICK_START.md) for setup instructions.
