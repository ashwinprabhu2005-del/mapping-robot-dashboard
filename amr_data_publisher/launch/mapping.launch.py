import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import ExecuteProcess, RegisterEventHandler
from launch.event_handlers import OnProcessExit
from launch_ros.actions import Node

def generate_launch_description():
    """
    Mapping launch: starts when user clicks "Start Mapping" in dashboard.
    Runs: rtabmap SLAM + mqtt_publisher ONLY.
    rgbd_odometry is already running from depth_camera_only.launch.py (always on login).
    Camera and rosbridge are also assumed to already be running.
    """

    rtabmap_config_dir = os.path.join(get_package_share_directory('amr_data_publisher'), 'config')

    # RTAB-Map SLAM node — consumes /odom (from rgbd_odometry already running) and camera images
    rtabmap_node = Node(
        package='rtabmap_slam',
        executable='rtabmap',
        name='rtabmap',
        parameters=[
            os.path.join(rtabmap_config_dir, 'rtabmap_config.yaml'),
            {
                'frame_id': 'camera_link',
                'odom_frame_id': 'odom',
                'map_frame_id': 'map',
                'subscribe_depth': True,
                'subscribe_rgb': True,
                'approx_sync': True,
            }
        ],
        arguments=['--delete_db_on_start'],
        remappings=[
            ('rgb/image', '/camera/camera/color/image_raw'),
            ('depth/image', '/camera/camera/aligned_depth_to_color/image_raw'),
            ('rgb/camera_info', '/camera/camera/color/camera_info'),
            ('odom', '/odom'),
        ],
        output='screen'
    )

    # MQTT Data Publisher — sends map/telemetry data to host
    publisher_config = os.path.join(get_package_share_directory('amr_data_publisher'), 'config', 'publisher_config.yaml')
    mqtt_publisher_node = Node(
        package='amr_data_publisher',
        executable='mqtt_publisher',
        name='mqtt_publisher',
        parameters=[{'config_file': publisher_config}],
        output='screen'
    )

    # If rtabmap crashes, log it but do NOT kill mqtt or anything else
    handle_rtabmap_exit = RegisterEventHandler(
        OnProcessExit(
            target_action=rtabmap_node,
            on_exit=[
                ExecuteProcess(
                    cmd=['bash', '-c', 'echo "rtabmap exited — other nodes continue"'],
                    output='screen'
                )
            ]
        )
    )

    return LaunchDescription([
        rtabmap_node,
        mqtt_publisher_node,
        handle_rtabmap_exit,
    ])
