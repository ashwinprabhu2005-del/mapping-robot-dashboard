import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import ExecuteProcess, RegisterEventHandler
from launch.event_handlers import OnProcessExit
from launch_ros.actions import Node

def generate_launch_description():
    """
    Mapping launch: starts when user clicks "Start Mapping" in dashboard.
    Runs: rtabmap SLAM + rgbd_odometry + mqtt_publisher
    Camera and rosbridge are assumed to already be running from depth_camera_only.launch.py
    """

    rtabmap_config_dir = os.path.join(get_package_share_directory('amr_data_publisher'), 'config')

    # RTAB-Map SLAM node
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
        remappings=[
            ('rgb/image', '/camera/camera/color/image_raw'),
            ('depth/image', '/camera/camera/aligned_depth_to_color/image_raw'),
            ('rgb/camera_info', '/camera/camera/color/camera_info'),
            ('odom', '/odom'),
        ],
        output='screen'
    )

    # Visual Odometry (no wheel encoder — use RGB-D odometry)
    visual_odometry_node = Node(
        package='rtabmap_odom',
        executable='rgbd_odometry',
        name='rgbd_odometry',
        parameters=[{
            'frame_id': 'camera_link',
            'odom_frame_id': 'odom',
            'publish_tf': True,
            'approx_sync': True,
            'qos_image': 2,
            'qos_camera_info': 2,
        }],
        remappings=[
            ('rgb/image', '/camera/camera/color/image_raw'),
            ('depth/image', '/camera/camera/aligned_depth_to_color/image_raw'),
            ('rgb/camera_info', '/camera/camera/color/camera_info'),
            ('odom', '/odom'),
        ],
        output='screen'
    )

    # MQTT Data Publisher
    publisher_config = os.path.join(get_package_share_directory('amr_data_publisher'), 'config', 'publisher_config.yaml')
    mqtt_publisher_node = Node(
        package='amr_data_publisher',
        executable='mqtt_publisher',
        name='mqtt_publisher',
        parameters=[{'config_file': publisher_config}],
        output='screen'
    )

    # If any mapping node crashes, log it but do not propagate shutdown
    handle_rtabmap_exit = RegisterEventHandler(
        OnProcessExit(
            target_action=rtabmap_node,
            on_exit=[
                ExecuteProcess(
                    cmd=['bash', '-c', 'echo "rtabmap exited"'],
                    output='screen'
                )
            ]
        )
    )

    handle_odom_exit = RegisterEventHandler(
        OnProcessExit(
            target_action=visual_odometry_node,
            on_exit=[
                ExecuteProcess(
                    cmd=['bash', '-c', 'echo "rgbd_odometry exited"'],
                    output='screen'
                )
            ]
        )
    )

    return LaunchDescription([
        visual_odometry_node,
        rtabmap_node,
        mqtt_publisher_node,
        handle_rtabmap_exit,
        handle_odom_exit,
    ])
