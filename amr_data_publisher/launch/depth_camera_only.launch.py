import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, ExecuteProcess
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_xml.launch_description_sources import XMLLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    # 1. Intel RealSense depth camera driver
    # Publishes /camera/depth/points (3D point cloud)
    # Publishes /camera/color/image_raw (color video)
    # Publishes /camera/imu (if camera has IMU)
    realsense_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            os.path.join(get_package_share_directory('realsense2_camera'), 'launch', 'rs_launch.py')
        ]),
        launch_arguments={
            'enable_color': 'true',
            'enable_depth': 'true',
            'align_depth.enable': 'true',
            'pointcloud.enable': 'true',
            'publish_tf': 'true'
        }.items()
    )

    set_neon_enable = ExecuteProcess(
        cmd=['bash', '-c', 'sleep 5 && ros2 param set /camera/camera pointcloud__neon_.enable true'],
        output='screen'
    )

    set_neon_filter = ExecuteProcess(
        cmd=['bash', '-c', 'sleep 5 && ros2 param set /camera/camera pointcloud__neon_.stream_filter 2'],
        output='screen'
    )

    # 2. RTAB-Map SLAM node (configured for visual odometry only)
    rtabmap_config_dir = os.path.join(get_package_share_directory('amr_data_publisher'), 'config')
    rtabmap_node = Node(
        package='rtabmap_slam',
        executable='rtabmap',
        name='rtabmap',
        parameters=[
            os.path.join(rtabmap_config_dir, 'rtabmap_config.yaml')
        ],
        remappings=[
            ('rgb/image', '/camera/color/image_raw'),
            ('depth/image', '/camera/aligned_depth_to_color/image_raw'),
            ('rgb/camera_info', '/camera/color/camera_info'),
            ('odom', '/odom') # visual odometry generated internally by RTAB-Map or separate rgbd_odometry node
        ],
        output='screen'
    )

    # Visual Odometry Node for RTAB-Map (Since no wheel odometry exists)
    visual_odometry_node = Node(
        package='rtabmap_odom',
        executable='rgbd_odometry',
        name='rgbd_odometry',
        parameters=[{
            'frame_id': 'camera_link',
            'publish_tf': True,
            'approx_sync': True,
            'qos_image': 2,
            'qos_camera_info': 2
        }],
        remappings=[
            ('rgb/image', '/camera/color/image_raw'),
            ('depth/image', '/camera/aligned_depth_to_color/image_raw'),
            ('rgb/camera_info', '/camera/color/camera_info'),
            ('odom', '/odom')
        ],
        output='screen'
    )

    # 3. MQTT Data Publisher
    # Sends all above data to Docker host
    publisher_config = os.path.join(get_package_share_directory('amr_data_publisher'), 'config', 'publisher_config.yaml')
    mqtt_publisher_node = Node(
        package='amr_data_publisher',
        executable='mqtt_publisher',
        name='mqtt_publisher',
        parameters=[{'config_file': publisher_config}],
        output='screen'
    )

    # 4. Rosbridge server (local, port 9090)
    # For local dashboard access if needed
    rosbridge_server = IncludeLaunchDescription(
        XMLLaunchDescriptionSource([
            os.path.join(get_package_share_directory('rosbridge_server'), 'launch', 'rosbridge_websocket_launch.xml')
        ])
    )

    # 5. Web Video Server (for live camera feed on dashboard)
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
        rtabmap_node,
        mqtt_publisher_node,
        rosbridge_server,
        web_video_server
    ])
