import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, ExecuteProcess
from launch_xml.launch_description_sources import XMLLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    """
    Camera-only launch: starts on dashboard LOGIN.
    Runs: RealSense camera + rosbridge + web_video_server
    Does NOT start rtabmap, odometry, or mqtt.
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
             'publish_tf:=true'],
        output='screen'
    )

    # Set pointcloud neon params after camera is fully up (15s delay)
    # Must source ROS env explicitly since this runs in a subprocess
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

    # 2. Rosbridge server (port 9090) for dashboard WebSocket
    rosbridge_server = IncludeLaunchDescription(
        XMLLaunchDescriptionSource([
            os.path.join(get_package_share_directory('rosbridge_server'), 'launch', 'rosbridge_websocket_launch.xml')
        ])
    )

    # 3. Web Video Server for live camera feed
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
        rosbridge_server,
        web_video_server,
    ])
