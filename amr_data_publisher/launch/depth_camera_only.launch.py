import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, ExecuteProcess, RegisterEventHandler
from launch.event_handlers import OnProcessExit
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_xml.launch_description_sources import XMLLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    # 1. Intel RealSense depth camera driver
    # Exact command requested by user to ensure all params are properly parsed
    realsense_launch = ExecuteProcess(
        cmd=['bash', '-c',
             'source /opt/ros/humble/setup.bash && '
             'ros2 launch realsense2_camera rs_launch.py '
             'enable_color:=true '
             'enable_depth:=true '
             'align_depth.enable:=true '
             'pointcloud.enable:=true '
             'publish_tf:=true'],
        output='screen'
    )

    # Set neon (pointcloud) params after camera node is fully up
    # Source ROS env explicitly so ros2 CLI is available in this subprocess
    set_neon_enable = ExecuteProcess(
        cmd=['bash', '-c',
             'sleep 15 && source /opt/ros/humble/setup.bash && '
             'ros2 param set /camera/camera pointcloud__neon_.enable true && '
             'echo "NEON ENABLE SET OK"'],
        output='screen'
    )

    set_neon_filter = ExecuteProcess(
        cmd=['bash', '-c',
             'sleep 15 && source /opt/ros/humble/setup.bash && '
             'ros2 param set /camera/camera pointcloud__neon_.stream_filter 2 && '
             'echo "NEON FILTER SET OK"'],
        output='screen'
    )

    # 2. RTAB-Map SLAM node
    rtabmap_config_dir = os.path.join(get_package_share_directory('amr_data_publisher'), 'config')
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

    # Visual Odometry Node for RTAB-Map (no wheel odometry available)
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

    # 3. MQTT Data Publisher
    publisher_config = os.path.join(get_package_share_directory('amr_data_publisher'), 'config', 'publisher_config.yaml')
    mqtt_publisher_node = Node(
        package='amr_data_publisher',
        executable='mqtt_publisher',
        name='mqtt_publisher',
        parameters=[{'config_file': publisher_config}],
        output='screen'
    )

    # 4. Rosbridge server (port 9090) for dashboard WebSocket access
    rosbridge_server = IncludeLaunchDescription(
        XMLLaunchDescriptionSource([
            os.path.join(get_package_share_directory('rosbridge_server'), 'launch', 'rosbridge_websocket_launch.xml')
        ])
    )

    # 5. Web Video Server for live camera feed on dashboard
    web_video_server = Node(
        package='web_video_server',
        executable='web_video_server',
        name='web_video_server',
        output='screen'
    )

    # --- Event handlers: if any single node crashes, log it but do NOT shut everything down ---
    # This prevents rtabmap or mqtt crashes from killing the camera and rosbridge
    handle_rtabmap_exit = RegisterEventHandler(
        OnProcessExit(
            target_action=rtabmap_node,
            on_exit=[
                ExecuteProcess(
                    cmd=['bash', '-c', 'echo "rtabmap exited — other nodes continue running"'],
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
                    cmd=['bash', '-c', 'echo "rgbd_odometry exited — other nodes continue running"'],
                    output='screen'
                )
            ]
        )
    )

    handle_mqtt_exit = RegisterEventHandler(
        OnProcessExit(
            target_action=mqtt_publisher_node,
            on_exit=[
                ExecuteProcess(
                    cmd=['bash', '-c', 'echo "mqtt_publisher exited — other nodes continue running"'],
                    output='screen'
                )
            ]
        )
    )

    return LaunchDescription([
        realsense_launch,
        set_neon_enable,
        set_neon_filter,
        visual_odometry_node,
        rtabmap_node,
        mqtt_publisher_node,
        rosbridge_server,
        web_video_server,
        handle_rtabmap_exit,
        handle_odom_exit,
        handle_mqtt_exit,
    ])
