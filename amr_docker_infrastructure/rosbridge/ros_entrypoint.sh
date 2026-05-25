#!/bin/bash
set -e

# Source ROS2 Humble environment
source "/opt/ros/humble/setup.bash"

# Launch translation bridge scripts in the background
python3 /bridge/src/mqtt_to_ros.py &
python3 /bridge/src/ros_to_mqtt.py &

exec "$@"
