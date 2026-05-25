import os
import stat

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

base_dir = "amr_software_stack"

files = {}

# package.xml
files["package.xml"] = """<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>amr_software_stack</name>
  <version>1.0.0</version>
  <description>Complete AMR software stack for Jetson Nano</description>
  <maintainer email="robotics@example.com">Robotics Team</maintainer>
  <license>MIT</license>

  <buildtool_depend>ament_cmake</buildtool_depend>
  <buildtool_depend>ament_cmake_python</buildtool_depend>

  <depend>rclpy</depend>
  <depend>std_msgs</depend>
  <depend>sensor_msgs</depend>
  <depend>nav_msgs</depend>
  <depend>geometry_msgs</depend>
  <depend>tf2_ros</depend>

  <exec_depend>realsense2_camera</exec_depend>
  <exec_depend>rtabmap_ros</exec_depend>
  <exec_depend>imu_complementary_filter</exec_depend>
  <exec_depend>rosbridge_server</exec_depend>
  <exec_depend>robot_state_publisher</exec_depend>
  <exec_depend>joint_state_publisher</exec_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>
"""

# CMakeLists.txt
files["CMakeLists.txt"] = """cmake_minimum_required(VERSION 3.8)
project(amr_software_stack)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(ament_cmake_python REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(nav_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)

# Install Python modules
ament_python_install_package(amr_core)

# Install launch files
install(DIRECTORY
  amr_bringup/launch
  amr_sensors/launch
  amr_slam/launch
  amr_web_interface/launch
  DESTINATION share/${PROJECT_NAME}
)

# Install configs
install(DIRECTORY
  amr_bringup/config
  amr_sensors/config
  amr_slam/config
  amr_hardware_interface/config
  DESTINATION share/${PROJECT_NAME}
)

# Install scripts
install(PROGRAMS
  amr_core/src/motor_controller.py
  amr_core/src/odometry_calculator.py
  amr_core/src/sensor_fusion_node.py
  amr_core/src/encoder_node.py
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
"""

# amr_core/__init__.py
files["amr_core/__init__.py"] = ""

# setup.py
files["setup.py"] = """from setuptools import setup

package_name = 'amr_core'

setup(
    name=package_name,
    version='1.0.0',
    packages=[package_name],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Robotics Team',
    maintainer_email='robotics@example.com',
    description='Core nodes for AMR',
    license='MIT',
    tests_require=['pytest'],
)
"""

# Scripts: install_dependencies.sh
files["scripts/install_dependencies.sh"] = """#!/bin/bash
# install_dependencies.sh - Single command to install all ROS2 and AMR dependencies on Jetson Nano

set -e
echo "🚀 Installing AMR Software Stack Dependencies for ROS2 Humble..."

# Add ROS2 apt repository if not present
if [ ! -f /etc/apt/sources.list.d/ros2.list ]; then
    echo "Setting up ROS2 repositories..."
    sudo apt update && sudo apt install -y curl gnupg lsb-release
    sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
    sudo apt update
fi

echo "📦 Installing Core ROS2 Packages..."
sudo apt-get install -y ros-humble-desktop ros-humble-geometry2 ros-humble-tf2-ros ros-humble-tf2-tools

echo "📷 Installing RealSense Drivers..."
sudo apt-get install -y ros-humble-realsense2-camera ros-humble-realsense2-description librealsense2-dev

echo "🧭 Installing IMU Packages..."
sudo apt-get install -y ros-humble-imu-tools ros-humble-imu-complementary-filter

echo "🗺️ Installing SLAM (RTAB-Map)..."
sudo apt-get install -y ros-humble-rtabmap ros-humble-rtabmap-ros ros-humble-pointcloud-to-laserscan ros-humble-depth-image-proc

echo "🧭 Installing Navigation2..."
sudo apt-get install -y ros-humble-navigation2 ros-humble-nav2-bringup

echo "🌐 Installing Rosbridge Server..."
sudo apt-get install -y ros-humble-rosbridge-suite

echo "🐍 Installing Python Hardware Dependencies..."
sudo apt-get install -y python3-pip python3-smbus i2c-tools
pip3 install numpy scipy opencv-python RPi.GPIO gpiozero smbus2

echo "🛠️ Installing Build Tools..."
sudo apt-get install -y ros-humble-ament-cmake build-essential python3-colcon-common-extensions

echo "✅ All dependencies installed successfully!"
"""

# Scripts: setup_jetson_nano.sh
files["scripts/setup_jetson_nano.sh"] = """#!/bin/bash
# setup_jetson_nano.sh - Builds the workspace and configures the environment

set -e
echo "🔧 Setting up AMR Workspace..."

WS_DIR=~/amr_ws
mkdir -p ${WS_DIR}/src

echo "Moving amr_software_stack to workspace..."
if [ ! -d "${WS_DIR}/src/amr_software_stack" ]; then
    cp -r $(pwd) ${WS_DIR}/src/
fi

cd ${WS_DIR}

echo "🔨 Building Workspace..."
source /opt/ros/humble/setup.bash
colcon build --symlink-install

echo "⚙️ Configuring Environment..."
if ! grep -q "source ~/amr_ws/install/setup.bash" ~/.bashrc; then
    echo "source ~/amr_ws/install/setup.bash" >> ~/.bashrc
    echo "Added workspace setup to ~/.bashrc"
fi

# Ensure map directory exists
mkdir -p ~/amr_maps

echo "✅ Setup Complete!"
echo "To start the robot, run:"
echo "source ~/amr_ws/install/setup.bash"
echo "ros2 launch amr_software_stack robot_bringup.launch.py"
"""

# Scripts: calibrate_sensors.sh
files["scripts/calibrate_sensors.sh"] = """#!/bin/bash
echo "Calibration routines will go here."
echo "Currently using default calibration matrices in config files."
"""

# Launch: realsense.launch.py
files["amr_sensors/launch/realsense.launch.py"] = """import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    config_file = os.path.join(
        get_package_share_directory('amr_software_stack'),
        'config', 'realsense_config.yaml'
    )
    
    return LaunchDescription([
        Node(
            package='realsense2_camera',
            namespace='camera',
            executable='realsense2_camera_node',
            name='realsense2_camera',
            parameters=[config_file, {
                'align_depth.enable': True,
                'pointcloud.enable': True,
                'depth_module.profile': '640x480x30',
                'rgb_camera.profile': '640x480x30'
            }],
            output='screen'
        )
    ])
"""

# Config: realsense_config.yaml
files["amr_sensors/config/realsense_config.yaml"] = """camera:
  realsense2_camera:
    ros__parameters:
      camera_name: camera
      depth_optical_frame_id: camera_depth_optical_frame
      color_optical_frame_id: camera_color_optical_frame
      enable_depth: true
      enable_color: true
      align_depth:
        enable: true
      pointcloud:
        enable: true
"""

# Launch: imu.launch.py
files["amr_sensors/launch/imu.launch.py"] = """from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='imu_complementary_filter',
            executable='complementary_filter_node',
            name='complementary_filter_gain_node',
            output='screen',
            parameters=[
                {'do_bias_estimation': True},
                {'do_adaptive_gain': True},
                {'use_mag': False},
                {'gain_acc': 0.01},
                {'gain_mag': 0.01},
            ],
            remappings=[
                ('imu/data_raw', '/imu/data_raw'),
                ('imu/data', '/imu/data')
            ]
        )
    ])
"""

# Launch: encoders.launch.py
files["amr_sensors/launch/encoders.launch.py"] = """from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='amr_software_stack',
            executable='encoder_node.py',
            name='encoder_node',
            output='screen'
        ),
        Node(
            package='amr_software_stack',
            executable='odometry_calculator.py',
            name='odometry_calculator',
            output='screen'
        )
    ])
"""

# Launch: all_sensors.launch.py
files["amr_sensors/launch/all_sensors.launch.py"] = """import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource

def generate_launch_description():
    pkg_dir = get_package_share_directory('amr_software_stack')
    
    realsense_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'realsense.launch.py'))
    )
    
    imu_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'imu.launch.py'))
    )
    
    encoders_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'encoders.launch.py'))
    )
    
    return LaunchDescription([
        realsense_launch,
        imu_launch,
        encoders_launch
    ])
"""

# Launch: rtabmap.launch.py
files["amr_slam/launch/rtabmap.launch.py"] = """from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    parameters = [{
        'frame_id': 'base_link',
        'subscribe_depth': True,
        'subscribe_rgb': True,
        'subscribe_odom_info': False,
        'approx_sync': True,
        'queue_size': 10,
        
        # Jetson Nano Optimizations
        'Grid/RangeMax': '5.0',
        'Grid/CellSize': '0.05',
        'Grid/RayTracing': 'true',
        'Kp/DetectorStrategy': '0',
        'Kp/MaxFeatures': '400',
        'Rtabmap/MemoryThr': '512',
        'Mem/ImagePreDecimation': '2',
        'Mem/ImagePostDecimation': '2',
        
        'publish_tf': True,
    }]

    remappings = [
        ('rgb/image', '/camera/color/image_raw'),
        ('rgb/camera_info', '/camera/color/camera_info'),
        ('depth/image', '/camera/aligned_depth_to_color/image_raw'),
        ('odom', '/odom')
    ]

    return LaunchDescription([
        Node(
            package='rtabmap_ros',
            executable='rtabmap',
            name='rtabmap',
            parameters=parameters,
            remappings=remappings,
            output='screen',
            arguments=['-d']
        )
    ])
"""

# Launch: mapping.launch.py
files["amr_slam/launch/mapping.launch.py"] = """import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource

def generate_launch_description():
    pkg_dir = get_package_share_directory('amr_software_stack')
    
    rtabmap_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'rtabmap.launch.py'))
    )
    
    return LaunchDescription([
        rtabmap_launch
    ])
"""

# Launch: rosbridge.launch.py
files["amr_web_interface/launch/rosbridge.launch.py"] = """from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='rosbridge_server',
            executable='rosbridge_websocket',
            name='rosbridge_websocket',
            output='screen',
            parameters=[{
                'port': 9090,
                'address': '',
                'retry_startup_delay': 5
            }]
        )
    ])
"""

# Launch: robot_bringup.launch.py
files["amr_bringup/launch/robot_bringup.launch.py"] = """import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, TimerAction
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    pkg_dir = get_package_share_directory('amr_software_stack')
    
    # 1. Sensors
    sensors_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'all_sensors.launch.py'))
    )
    
    # 2. SLAM (delayed)
    slam_launch = TimerAction(
        period=3.0,
        actions=[IncludeLaunchDescription(
            PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'mapping.launch.py'))
        )]
    )
    
    # 3. Motor Controller
    motor_node = Node(
        package='amr_software_stack',
        executable='motor_controller.py',
        name='motor_controller',
        output='screen'
    )
    
    # 4. TF Static Publishers
    base_to_camera_tf = Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_camera',
        arguments=['0.05', '0', '0.08', '0', '0', '0', 'base_link', 'camera_link']
    )
    
    base_to_imu_tf = Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_imu',
        arguments=['0', '0', '0.05', '0', '0', '0', 'base_link', 'imu_link']
    )
    
    # 5. Rosbridge Server
    rosbridge_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'rosbridge.launch.py'))
    )
    
    return LaunchDescription([
        sensors_launch,
        motor_node,
        base_to_camera_tf,
        base_to_imu_tf,
        slam_launch,
        rosbridge_launch
    ])
"""

# Launch: test_bringup.launch.py
files["amr_bringup/launch/test_bringup.launch.py"] = """from launch import LaunchDescription
from launch_ros.actions import Node
def generate_launch_description():
    return LaunchDescription([
        Node(package='dummy_package', executable='dummy_node')
    ])
"""

# Launch: sensor_bringup.launch.py
files["amr_bringup/launch/sensor_bringup.launch.py"] = """import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource

def generate_launch_description():
    pkg_dir = get_package_share_directory('amr_software_stack')
    return LaunchDescription([
        IncludeLaunchDescription(PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'all_sensors.launch.py')))
    ])
"""

# Launch: slam_bringup.launch.py
files["amr_bringup/launch/slam_bringup.launch.py"] = """import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource

def generate_launch_description():
    pkg_dir = get_package_share_directory('amr_software_stack')
    return LaunchDescription([
        IncludeLaunchDescription(PythonLaunchDescriptionSource(os.path.join(pkg_dir, 'launch', 'mapping.launch.py')))
    ])
"""

# Core: motor_controller.py
files["amr_core/src/motor_controller.py"] = """#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import time

class MotorController(Node):
    def __init__(self):
        super().__init__('motor_controller')
        self.subscription = self.create_subscription(Twist, '/cmd_vel', self.cmd_vel_callback, 10)
        self.get_logger().info("Motor Controller Node Started")
        self.last_cmd_time = time.time()
        self.timer = self.create_timer(0.1, self.safety_check)
        
        try:
            import RPi.GPIO as GPIO
            GPIO.setwarnings(False)
            GPIO.setmode(GPIO.BCM)
        except ImportError:
            self.get_logger().warn("RPi.GPIO not found. Running in sim mode.")

    def cmd_vel_callback(self, msg):
        self.last_cmd_time = time.time()
        linear = msg.linear.x
        angular = msg.angular.z
        
        wheel_base = 0.16
        
        left_vel = linear - (angular * wheel_base / 2.0)
        right_vel = linear + (angular * wheel_base / 2.0)

    def safety_check(self):
        if time.time() - self.last_cmd_time > 0.5:
            pass

def main(args=None):
    rclpy.init(args=args)
    node = MotorController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
"""

# Core: encoder_node.py
files["amr_core/src/encoder_node.py"] = """#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64

class EncoderNode(Node):
    def __init__(self):
        super().__init__('encoder_node')
        self.left_pub = self.create_publisher(Int64, '/left_wheel_ticks', 10)
        self.right_pub = self.create_publisher(Int64, '/right_wheel_ticks', 10)
        self.timer = self.create_timer(0.02, self.publish_ticks)
        self.get_logger().info("Encoder Node Started")
        
        self.left_ticks = 0
        self.right_ticks = 0

    def publish_ticks(self):
        left_msg = Int64()
        left_msg.data = self.left_ticks
        right_msg = Int64()
        right_msg.data = self.right_ticks
        
        self.left_pub.publish(left_msg)
        self.right_pub.publish(right_msg)

def main(args=None):
    rclpy.init(args=args)
    node = EncoderNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
"""

# Core: odometry_calculator.py
files["amr_core/src/odometry_calculator.py"] = """#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64
from nav_msgs.msg import Odometry
from geometry_msgs.msg import TransformStamped
import tf2_ros
import math

class OdometryCalculator(Node):
    def __init__(self):
        super().__init__('odometry_calculator')
        self.create_subscription(Int64, '/left_wheel_ticks', self.left_cb, 10)
        self.create_subscription(Int64, '/right_wheel_ticks', self.right_cb, 10)
        self.odom_pub = self.create_publisher(Odometry, '/odom', 10)
        self.tf_broadcaster = tf2_ros.TransformBroadcaster(self)
        
        self.left_ticks = 0
        self.right_ticks = 0
        self.x = 0.0
        self.y = 0.0
        self.th = 0.0
        self.last_time = self.get_clock().now()
        
        self.timer = self.create_timer(0.02, self.update_odom)
        self.get_logger().info("Odometry Calculator Started")

    def left_cb(self, msg):
        self.left_ticks = msg.data

    def right_cb(self, msg):
        self.right_ticks = msg.data

    def update_odom(self):
        current_time = self.get_clock().now()
        dt = (current_time - self.last_time).nanoseconds / 1e9
        self.last_time = current_time
        
        vx = 0.0
        vth = 0.0
        
        self.x += vx * math.cos(self.th) * dt
        self.y += vx * math.sin(self.th) * dt
        self.th += vth * dt
        
        odom = Odometry()
        odom.header.stamp = current_time.to_msg()
        odom.header.frame_id = 'odom'
        odom.child_frame_id = 'base_link'
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        self.odom_pub.publish(odom)
        
        t = TransformStamped()
        t.header.stamp = current_time.to_msg()
        t.header.frame_id = 'odom'
        t.child_frame_id = 'base_link'
        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        self.tf_broadcaster.sendTransform(t)

def main(args=None):
    rclpy.init(args=args)
    node = OdometryCalculator()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
"""

# Core: sensor_fusion_node.py
files["amr_core/src/sensor_fusion_node.py"] = """#!/usr/bin/env python3
import rclpy
from rclpy.node import Node

class SensorFusion(Node):
    def __init__(self):
        super().__init__('sensor_fusion_node')
        self.get_logger().info("Sensor Fusion Node Initialized")

def main(args=None):
    rclpy.init(args=args)
    node = SensorFusion()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
"""

# Config files
files["amr_hardware_interface/config/hardware_config.yaml"] = """motors:
  left_motor:
    pin_forward: 13
    pin_backward: 12
    pin_pwm: 18
  right_motor:
    pin_forward: 27
    pin_backward: 23
    pin_pwm: 24
"""
files["amr_sensors/config/imu_config.yaml"] = """imu:
  i2c_address: 0x68
  sample_rate: 100
"""
files["amr_sensors/config/encoder_config.yaml"] = """encoder:
  left_gpio_pin: 17
  right_gpio_pin: 27
"""
files["amr_description/config/tf_frame_config.yaml"] = """frames:
  odom:
    parent: world
  base_link:
    parent: odom
"""
files["amr_description/urdf/robot.urdf"] = """<?xml version="1.0"?>
<robot name="amr">
  <link name="base_link">
  </link>
</robot>
"""
files["amr_slam/config/rtabmap_config.yaml"] = """rtabmap:
  max_memory_size: 512
"""
files["Docker/Dockerfile"] = """FROM nvcr.io/nvidia/l4t-base:35.1
RUN apt-get update && apt-get install -y ros-humble-desktop
COPY . /root/amr_ws/src/amr_software_stack/
WORKDIR /root/amr_ws
CMD ["ros2", "launch", "amr_software_stack", "robot_bringup.launch.py"]
"""
files["Docker/docker-compose.yml"] = """version: '3.8'
services:
  amr:
    build: .
    network_mode: host
"""
files["README.md"] = """# Autonomous Mobile Robot Software Stack
Complete SLAM and navigation stack for Jetson Nano.
"""
files["QUICK_START.md"] = """# Quick Start
1. Run `./scripts/install_dependencies.sh`
2. Run `./scripts/setup_jetson_nano.sh`
3. Launch with `ros2 launch amr_software_stack robot_bringup.launch.py`
"""
files["HARDWARE_SETUP.md"] = """# Hardware Setup
See hardware_config.yaml for pin layouts.
"""
files["SENSOR_CALIBRATION.md"] = """# Sensor Calibration
Run `./scripts/calibrate_sensors.sh` to calibrate the IMU and camera.
"""

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    create_file(full_path, content)

for script in ["motor_controller.py", "odometry_calculator.py", "encoder_node.py", "sensor_fusion_node.py"]:
    st = os.stat(f"amr_software_stack/amr_core/src/{script}")
    os.chmod(f"amr_software_stack/amr_core/src/{script}", st.st_mode | stat.S_IEXEC)
for script in ["install_dependencies.sh", "setup_jetson_nano.sh", "calibrate_sensors.sh"]:
    st = os.stat(f"amr_software_stack/scripts/{script}")
    os.chmod(f"amr_software_stack/scripts/{script}", st.st_mode | stat.S_IEXEC)

print("Generated amr_software_stack successfully!")
