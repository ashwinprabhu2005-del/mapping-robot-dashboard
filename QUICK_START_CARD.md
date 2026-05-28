# QUICK START CARD

```
Daily Startup (After first-time setup is complete):
==========================================================

ON YOUR PC (do this first):
1. Open terminal
2. Type: cd amr_docker_infrastructure
3. Type: ./scripts/start_infrastructure.sh
4. Wait 30 seconds
5. Open browser: http://localhost:5173

ON JETSON NANO (plug in power):
1. Wait 60 seconds for boot
2. Camera starts automatically!
3. OR ssh jetson@YOUR_JETSON_IP and manually run:
   ros2 launch amr_data_publisher depth_camera_only.launch.py

YOU SHOULD SEE:
✓ Dashboard loads at http://localhost:5173
✓ Green "Connected" status in top right corner
✓ Live color camera feed
✓ 3D point cloud building and expanding in real time

COMMON FIXES:
• No camera feed → check USB cable on camera, must be plugged into blue USB 3.0 port
• Not connected → check both devices are connected to the exact same WiFi network
• ROS2 commands not found → run: source /opt/ros/humble/setup.bash

NEED HELP? Check HARDWARE_SETUP_WALKTHROUGH.md
```
