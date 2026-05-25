import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, GroupAction, LogInfo
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node
from launch.substitutions import PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare

def generate_launch_description():
    pkg_share = get_package_share_directory('amr_data_publisher')
    config_file = os.path.join(pkg_share, 'config', 'publisher_config.yaml')
    
    # Include robot bringup from the core AMR software stack (amr_bringup package)
    try:
        robot_bringup_launch = IncludeLaunchDescription(
            PythonLaunchDescriptionSource([
                PathJoinSubstitution([
                    FindPackageShare('amr_bringup'),
                    'launch',
                    'robot_bringup.launch.py'
                ])
            ])
        )
    except Exception:
        # Graceful fallback log info if FindPackageShare cannot resolve amr_bringup
        robot_bringup_launch = LogInfo(msg="Warning: amr_bringup package not found. Launching only publisher and monitor nodes.")

    return LaunchDescription([
        # Core Robot SLAM and Sensors
        robot_bringup_launch,
        
        # MQTT Telemetry Publisher
        Node(
            package='amr_data_publisher',
            executable='mqtt_publisher',
            name='amr_mqtt_publisher',
            parameters=[{'config_file': config_file}],
            output='screen'
        ),
        
        # System Health Monitor
        Node(
            package='amr_data_publisher',
            executable='status_monitor',
            name='amr_status_monitor',
            parameters=[{'config_file': config_file}],
            output='screen'
        ),
    ])
