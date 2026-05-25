# Quick Start Guide

## Installation
1. Move the `amr_data_publisher` directory to your ROS2 workspace `src/` folder (e.g., `~/amr_ws/src/`).
2. Run the dependencies setup script:
   ```bash
   ./scripts/install_mqtt_client.sh
   ```
3. Run colcon to build the package:
   ```bash
   cd ~/amr_ws
   colcon build --packages-select amr_data_publisher
   source install/setup.bash
   ```

## Running
1. Set the Docker Host server IP in `config/publisher_config.yaml`:
   ```yaml
   network:
     docker_host_ip: "YOUR_DOCKER_SERVER_IP"
   ```
2. Test connection to the broker:
   ```bash
   python3 scripts/test_mqtt_connection.py --host YOUR_DOCKER_SERVER_IP
   ```
3. Launch publisher:
   ```bash
   ros2 launch amr_data_publisher full_amr_with_publisher.launch.py
   ```
