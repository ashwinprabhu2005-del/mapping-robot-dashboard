"""
amr_launch.py — Primary Dashboard Launch

Launches:
1. Gazebo + Robot
2. RTAB-Map SLAM (High-Res Cloud)
3. ROSbridge Server
4. Web Video Server
5. Joystick Control (joy + teleop_twist_joy → /cmd_vel)

Joystick usage:
  Hold LB/L1           → enable movement (deadman switch)
  Left stick vertical  → forward / backward
  Left stick horiz.    → turn left / right
  Hold RB/R1 + LB      → turbo speed
"""

import os, datetime
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, TimerAction, ExecuteProcess
from launch.substitutions import LaunchConfiguration
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_xml.launch_description_sources import XMLLaunchDescriptionSource
from launch_ros.actions import Node

MAPS_DIR  = os.path.expanduser('~/amr_ws/maps')
_stamp    = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
_sess_dir = os.path.join(MAPS_DIR, f'session_{_stamp}')
DB_PATH   = os.path.join(_sess_dir, 'rtabmap.db')
MAP_BASE  = os.path.join(_sess_dir, 'living_room_map')

"""os.makedirs(_sess_dir, exist_ok=True)
print(f'[amr_launch] Session folder: {_sess_dir}')"""

def generate_launch_description():
    pkg_share  = get_package_share_directory('amr_bot')
    pkg_gazebo = get_package_share_directory('gazebo_ros')
    pkg_rosbridge = get_package_share_directory('rosbridge_server')

    urdf_file  = os.path.join(pkg_share, 'urdf',   'amr_bot.urdf')
    world_file = os.path.join(pkg_share, 'worlds', 'living_room.sdf')

    with open(urdf_file, 'r') as fh:
        robot_description = fh.read()

    # 1. Gazebo Classic
    gazebo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(pkg_gazebo, 'launch', 'gazebo.launch.py')
        ),
        launch_arguments={
            'world':   world_file,
            'verbose': 'false',
            'pause':   'false',
            'gui':     'false',
        }.items(),
    )

    # 2. Robot State Publisher
    robot_state_publisher = Node(
        package    = 'robot_state_publisher',
        executable = 'robot_state_publisher',
        name       = 'robot_state_publisher',
        output     = 'screen',
        parameters = [{'robot_description': robot_description, 'use_sim_time': True}],
    )

    # 3. Spawn robot
    spawn_robot = TimerAction(
        period = 3.0,
        actions = [
            Node(
                package    = 'gazebo_ros',
                executable = 'spawn_entity.py',
                name       = 'spawn_entity',
                output     = 'screen',
                arguments  = [
                    '-entity', 'amr_bot',
                    '-file',   urdf_file,
                    '-x', '-2.0',
                    '-y', '-1.5',
                    '-z',  '0.05',
                    '-Y',  '0.0',
                ],
            )
        ],
    )

    # 4. TF2 Web Republisher
    tf2_web_republisher = Node(
        package    = 'tf2_web_republisher',
        executable = 'tf2_web_republisher_node',
        name       = 'tf2_web_republisher',
        output     = 'screen',
    )

    # 5. Launch Manager (Service to start/stop mapping)
    launch_manager_node = ExecuteProcess(
        cmd=['python3', os.path.expanduser('~/amr_ws/src/amr_bot/scripts/launch_manager.py')],
        output='screen'
    )

    # 6. ROSbridge Server
    rosbridge_server = IncludeLaunchDescription(
        XMLLaunchDescriptionSource(
            os.path.join(pkg_rosbridge, 'launch', 'rosbridge_websocket_launch.xml'
        )
    )
)
    # 7. Web Video Server
    web_video_server = Node(
        package='web_video_server',
        executable='web_video_server',
        name='web_video_server',
        output='screen'
    )

    # 8. Joystick — joy driver (reads /dev/input/js0)
    joy_config = os.path.join(pkg_share, 'config', 'joystick.yaml')

    joy_node = Node(
        package    = 'joy',
        executable = 'joy_node',
        name       = 'joy_node',
        output     = 'screen',
        parameters = [{
            'dev':            '/dev/input/js0',
            'deadzone':       0.1,
            'autorepeat_rate': 20.0,
            'use_sim_time':   True,
        }],
    )

    # 9. teleop_twist_joy — converts /joy → /cmd_vel
    teleop_joy_node = Node(
        package    = 'teleop_twist_joy',
        executable = 'teleop_node',
        name       = 'teleop_twist_joy_node',
        output     = 'screen',
        parameters = [joy_config, {'use_sim_time': True}],
        remappings = [('cmd_vel', '/cmd_vel')],
    )

    # 10. depth_image_proc: always publish /camera/points for live 3D navigation view
    point_cloud_node = Node(
        package    = 'depth_image_proc',
        executable = 'point_cloud_xyzrgb_node',
        name       = 'depth_to_pointcloud',
        output     = 'screen',
        parameters = [{
            'use_sim_time': True,
            'queue_size': 5,
        }],
        remappings = [
            ('rgb/image_rect_color',  '/camera/image_raw'),
            ('rgb/camera_info',       '/camera/camera_info'),
            ('depth_registered/image_rect', '/camera/depth/image_raw'),
            ('points',                '/camera/points'),
        ],
    )

    return LaunchDescription([
        gazebo,
        robot_state_publisher,
        spawn_robot,
        tf2_web_republisher,
        launch_manager_node,
        rosbridge_server,
        web_video_server,
        joy_node,
        teleop_joy_node,
        point_cloud_node,
    ])
