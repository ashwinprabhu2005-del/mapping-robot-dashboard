import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, ExecuteProcess, RegisterEventHandler
from launch.event_handlers import OnProcessExit
from launch_xml.launch_description_sources import XMLLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    """
    Camera + Telemetry launch: starts on dashboard LOGIN.
    Runs:
      - RealSense camera (color, depth, aligned depth, pointcloud, TF)
      - rgbd_odometry  → publishes /odom + odom->camera_link TF (telemetry)
      - rosbridge_server → dashboard WebSocket
      - web_video_server → live camera stream

    Does NOT start rtabmap or mqtt (those start on 'Start Mapping').
    """

    # 1. Intel RealSense depth camera driver
    realsense_launch = ExecuteProcess(
        cmd=['bash', '-c',
             'source /opt/ros/humble/setup.bash && '
             'ros2 launch realsense2_camera rs_launch.py '
             'enable_color:=true '
             'enable_depth:=true '
             'align_depth.enable:=true '
             'pointcloud.enable:=true '
             'decimation_filter.enable:=true '
             'publish_tf:=true'],
        output='screen'
    )

    # Set pointcloud neon and decimation params after camera is fully up (15s delay)
    # Must source ROS env explicitly since this runs in a non-interactive subprocess
    set_neon_enable = ExecuteProcess(
        cmd=['bash', '-c',
             'sleep 15 && source /opt/ros/humble/setup.bash && '
             'ros2 param set /camera/camera pointcloud__neon_.enable true && '
             'ros2 param set /camera/camera decimation_filter.filter_magnitude 4 && '
             'echo "NEON AND DECIMATION PARAMS SET OK"'],
        output='screen'
    )

    set_neon_filter = ExecuteProcess(
        cmd=['bash', '-c',
             'sleep 15 && source /opt/ros/humble/setup.bash && '
             'ros2 param set /camera/camera pointcloud__neon_.stream_filter 2 && '
             'echo "NEON FILTER SET OK"'],
        output='screen'
    )

    # 2. Visual Odometry — publishes /odom and odom→camera_link TF
    #    Required for dashboard telemetry (position, heading, yaw) even before mapping starts
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

    # If odometry crashes, log it but do not kill camera or rosbridge
    handle_odom_exit = RegisterEventHandler(
        OnProcessExit(
            target_action=visual_odometry_node,
            on_exit=[
                ExecuteProcess(
                    cmd=['bash', '-c', 'echo "rgbd_odometry exited — camera and rosbridge still running"'],
                    output='screen'
                )
            ]
        )
    )

    # 3. Rosbridge server (port 9090) for dashboard WebSocket
    rosbridge_server = IncludeLaunchDescription(
        XMLLaunchDescriptionSource([
            os.path.join(get_package_share_directory('rosbridge_server'), 'launch', 'rosbridge_websocket_launch.xml')
        ])
    )

    # 4. Web Video Server for live MJPEG camera stream
    web_video_server = Node(
        package='web_video_server',
        executable='web_video_server',
        name='web_video_server',
        output='screen'
    )

    return LaunchDescription([
        realsense_launch,
        set_neon_enable,
        set_neon_filter,
        visual_odometry_node,
        rosbridge_server,
        web_video_server,
        handle_odom_exit,
    ])
