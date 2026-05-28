"""
joystick.launch.py
Launches joy driver + teleop_twist_joy for /dev/input/js0
Publishes geometry_msgs/Twist to /cmd_vel

Usage:
  ros2 launch amr_bot joystick.launch.py
  ros2 launch amr_bot joystick.launch.py joy_dev:=/dev/input/js1   # if js0 doesn't work
"""

import os
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory


def generate_launch_description():

    joy_dev    = LaunchConfiguration('joy_dev',    default='/dev/input/js0')
    use_sim_time = LaunchConfiguration('use_sim_time', default='false')

    config = os.path.join(
        get_package_share_directory('amr_bot'),
        'config', 'joystick.yaml'
    )

    # ── 1. joy node — reads raw joystick events ───────────────────────────────
    joy_node = Node(
        package    = 'joy',
        executable = 'joy_node',
        name       = 'joy_node',
        output     = 'screen',
        parameters = [{
            'dev':              joy_dev,
            'deadzone':         0.1,        # ignore tiny stick wobble
            'autorepeat_rate':  20.0,       # publish at 20 Hz even when idle
            'use_sim_time':     use_sim_time,
        }],
    )

    # ── 2. teleop_twist_joy — converts /joy → /cmd_vel ───────────────────────
    teleop_node = Node(
        package    = 'teleop_twist_joy',
        executable = 'teleop_node',
        name       = 'teleop_twist_joy_node',
        output     = 'screen',
        parameters = [config, {'use_sim_time': use_sim_time}],
        remappings = [
            ('cmd_vel', '/cmd_vel'),    # matches your robot's topic
        ],
    )

    return LaunchDescription([
        DeclareLaunchArgument('joy_dev',      default_value='/dev/input/js0',
                              description='Joystick device path'),
        DeclareLaunchArgument('use_sim_time', default_value='false',
                              description='Use simulation clock'),
        joy_node,
        teleop_node,
    ])
