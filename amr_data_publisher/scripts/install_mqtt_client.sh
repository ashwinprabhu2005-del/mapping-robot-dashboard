#!/bin/bash
echo "Installing MQTT client for Jetson Nano..."

# Install Python MQTT client
pip3 install paho-mqtt --break-system-packages

# Install compression libraries
pip3 install lz4 msgpack --break-system-packages

# Install image processing for compression
pip3 install opencv-python-headless Pillow --break-system-packages

# Install numpy for point cloud processing
pip3 install numpy --break-system-packages

# Verify installation
python3 -c "import paho.mqtt.client; print('MQTT client installed OK')"
python3 -c "import cv2; print('OpenCV installed OK')"
python3 -c "import lz4; print('LZ4 compression installed OK')"

echo ""
echo "✅ MQTT client installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit config/publisher_config.yaml"
echo "2. Set docker_host_ip to your Docker server IP"
echo "3. Run: ros2 launch amr_data_publisher data_publisher.launch.py"
