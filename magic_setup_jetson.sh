#!/bin/bash
# MAGIC SETUP SCRIPT FOR JETSON ORIN NANO

set -e

echo "=========================================================="
echo " 🪄 STARTING JETSON MAGIC SETUP... "
echo "=========================================================="

# 1. Ask for IP Address immediately
read -p "What is your PC's IP Address (e.g. 192.168.1.5)? " PC_IP
if [ -z "$PC_IP" ]; then
    echo "❌ Error: You must enter an IP address!"
    exit 1
fi

echo "✅ Registering PC IP Address: $PC_IP"
# Inject into config file
CONFIG_FILE="amr_data_publisher/config/publisher_config.yaml"
if [ -f "$CONFIG_FILE" ]; then
    sed -i "s/docker_host_ip: .*/docker_host_ip: \"$PC_IP\"/g" $CONFIG_FILE
fi

# 2. Run the main installation script (ROS2, RealSense, RTAB-Map)
echo "=========================================================="
echo " ⏳ Downloading & Installing Camera Software..."
echo " This will take ~20 minutes. Go grab a coffee! ☕"
echo "=========================================================="
chmod +x amr_data_publisher/scripts/install_depth_camera_jetson.sh
./amr_data_publisher/scripts/install_depth_camera_jetson.sh

# 3. Build the code and install Node.js dependencies
echo "=========================================================="
echo " 🔨 Building the Software & Installing Server..."
echo "=========================================================="
source /opt/ros/humble/setup.bash || echo "ROS2 Humble not found. Assuming it is installed differently."
colcon build

# Install Node dependencies for the lifecycle server
if ! command -v npm &> /dev/null; then
    echo "Installing Node.js and NPM..."
    sudo apt-get update && sudo apt-get install -y nodejs npm
fi
npm install express cors

# 4. Setup Auto-Start Service
echo "=========================================================="
echo " ⚙️ Configuring Automatic Start on Boot..."
echo "=========================================================="

SERVICE_FILE="/etc/systemd/system/depth-camera.service"
sudo bash -c "cat > $SERVICE_FILE" << EOL
[Unit]
Description=Depth Camera ROS2 Publisher
After=network.target

[Service]
User=$USER
WorkingDirectory=$(pwd)
ExecStartPre=/bin/bash -c 'source /opt/ros/humble/setup.bash'
ExecStart=/usr/bin/node $(pwd)/ros_lifecycle_server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl daemon-reload
sudo systemctl enable depth-camera.service

JETSON_IP=$(hostname -I | awk '{print $1}')
echo "🎉 MAGIC SETUP COMPLETE! "
echo "=========================================================="
echo "1. Log out and log back in (to apply USB camera permissions)."
echo "2. The Jetson will automatically run the Backend Server on boot!"
echo ""
echo "🚀 HOW TO LAUNCH THE CAMERA:"
echo "Go to your PC Dashboard (http://localhost:5173)."
echo "Log in using:"
echo "  User ID (Host IP):  $JETSON_IP"
echo "  Password:           admin"
echo "=========================================================="
