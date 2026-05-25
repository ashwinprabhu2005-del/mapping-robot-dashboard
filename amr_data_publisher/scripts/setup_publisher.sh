#!/bin/bash
# Complete setup on Jetson Nano

echo "Setting up AMR Data Publisher..."

# 1. Install dependencies
./scripts/install_mqtt_client.sh

# 2. Build ROS2 package
cd ~/amr_ws
colcon build --packages-select amr_data_publisher
source install/setup.bash

# 3. Verify installation
echo "Testing installation..."
python3 -c "import paho.mqtt.client; print('MQTT: OK')"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Before running, edit:"
echo "  config/publisher_config.yaml"
echo "  Set: docker_host_ip to your Docker server IP"
echo ""
echo "Then test connection:"
echo "  python3 scripts/test_mqtt_connection.py --host <DOCKER_IP>"
echo ""
echo "Then run:"
echo "  ros2 launch amr_data_publisher full_amr_with_publisher.launch.py"
