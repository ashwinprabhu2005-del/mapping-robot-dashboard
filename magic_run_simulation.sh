#!/bin/bash
# MAGIC ONE-CLICK SCRIPT FOR LOCAL PC SIMULATION (NO HARDWARE NEEDED)

set -e

echo "=========================================================="
echo " 🤖 STARTING AUTOMATIC LOCAL PC SIMULATION... "
echo "=========================================================="

# 1. Check for ROS2
if ! command -v ros2 &> /dev/null
then
    echo "❌ ERROR: ROS2 is not installed! You need Ubuntu 22.04 with ROS2 Humble."
    exit 1
fi

# 2. Install dependencies
echo "Step 1: Installing ROS2 Simulation Dependencies (You may be asked for sudo password)..."
sudo apt-get update
sudo apt-get install -y \
    ros-humble-gazebo-ros-pkgs \
    ros-humble-rosbridge-server \
    ros-humble-web-video-server \
    ros-humble-xacro \
    ros-humble-joy \
    ros-humble-teleop-twist-joy \
    ros-humble-robot-state-publisher \
    ros-humble-depth-image-proc \
    ros-humble-tf2-web-republisher

# 3. Build workspace
echo "Step 2: Building the virtual robot workspace..."
cd ros2_ws
colcon build
# We cannot source cleanly in a set -e script without potentially failing if the install script has unbound vars,
# but we will source it before running the launch command.
cd ..

# 4. Install dashboard
echo "Step 3: Setting up the Web Dashboard..."
if ! command -v npm &> /dev/null
then
    echo "❌ ERROR: Node.js (npm) is not installed!"
    exit 1
fi
npm install > /dev/null 2>&1

echo "=========================================================="
echo " 🎉 ALL READY! LAUNCHING BOTH DASHBOARD AND SIMULATOR..."
echo "=========================================================="
echo " 1. The Gazebo 3D World will pop up shortly."
echo " 2. Open your web browser to: http://localhost:5173"
echo " 3. In the Dashboard, uncheck 'Auto Navigation'."
echo " 4. Drive the robot using W-A-S-D in the dashboard!"
echo "=========================================================="
echo " To safely stop everything, press Ctrl+C in this terminal."
echo "=========================================================="

# Start dashboard in background
npm run dev &
DASHBOARD_PID=$!

# Ensure dashboard is killed when script exits
trap "echo 'Shutting down dashboard...'; kill $DASHBOARD_PID 2>/dev/null || true" EXIT

# Start Gazebo in foreground
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
ros2 launch amr_bot amr_launch.py
