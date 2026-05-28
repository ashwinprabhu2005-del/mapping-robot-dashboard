#!/bin/bash
# Install everything for Jetson Nano + Depth Camera
# 1. ROS2 Humble
# 2. Intel RealSense SDK (librealsense2) - Jetson version
# 3. RealSense ROS2 driver (realsense2_camera)
# 4. RTAB-Map for ROS2 (rtabmap_ros)
# 5. Python MQTT client (paho-mqtt)
# 6. Rosbridge server

set -e

echo "=========================================================="
echo " Starting Installation for Jetson Nano Depth Camera Stack "
echo "=========================================================="

echo "Step 1: Installing ROS2 Humble (if not already installed)..."
if ! command -v ros2 &> /dev/null
then
    sudo apt update && sudo apt install -y locales
    sudo locale-gen en_US en_US.UTF-8
    sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
    export LANG=en_US.UTF-8
    sudo apt install -y software-properties-common
    sudo add-apt-repository universe -y
    sudo apt update && sudo apt install curl -y
    sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
    sudo apt update
    sudo apt install -y ros-humble-desktop ros-dev-tools
else
    echo "ROS2 is already installed. Skipping."
fi

echo "Step 2: Installing Intel RealSense SDK for Jetson (ARM64)..."
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-key F6E65AC044F831AC80A06380C8B3A55A6F3EFCDE || sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-key F6E65AC044F831AC80A06380C8B3A55A6F3EFCDE
sudo add-apt-repository "deb https://librealsense.intel.com/Debian/apt-repo $(lsb_release -cs) main" -u -y
sudo apt-get install -y librealsense2-utils librealsense2-dev

echo "Step 3: Installing RealSense ROS2 Driver..."
sudo apt-get install -y ros-humble-realsense2-camera

echo "Step 4: Installing RTAB-Map for ROS2..."
sudo apt-get install -y ros-humble-rtabmap-ros

echo "Step 5: Installing Python MQTT client..."
sudo apt-get install -y python3-pip
pip3 install paho-mqtt

echo "Step 6: Installing Rosbridge Server..."
sudo apt-get install -y ros-humble-rosbridge-suite

echo "Step 7: Setting up USB permissions for the depth camera..."
# Add rules for RealSense
echo 'SUBSYSTEMS=="usb", ATTRS{idVendor}=="8086", ATTRS{idProduct}=="0b3a", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/99-realsense-libusb.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

echo "Step 8: Adding user to 'video' and 'dialout' groups..."
sudo usermod -aG video $USER
sudo usermod -aG dialout $USER
sudo usermod -aG plugdev $USER

echo "=========================================================="
echo " Installation Complete! "
echo " Please LOG OUT and LOG IN again to apply group permissions."
echo "=========================================================="
