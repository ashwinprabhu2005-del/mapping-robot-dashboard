import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    # 1. Intel RealSense depth camera driver
    # Publishes /camera/depth/points (3D point cloud)
    # Publishes /camera/color/image_raw (color video)
    # Publishes /camera/imu (if camera has IMU)
    realsense_node = Node(
        package='realsense2_camera',
        namespace='camera',
        executable='realsense2_camera_node',
        name='realsense2_camera',
        parameters=[{
            'enable_depth': True,
            'enable_color': True,
            'enable_infra1': False,
            'enable_infra2': False,
            'enable_gyro': True,
            'enable_accel': True,
            'pointcloud.enable': True,
            'align_depth.enable': True,
            'unite_imu_method': 1 # 1=linear interpolation for IMU
        }],
        output='screen'
    )

    # 2. RTAB-Map SLAM node (configured for visual odometry only)
    rtabmap_config_dir = os.path.join(get_package_share_directory('amr_data_publisher'), 'config')
    rtabmap_node = Node(
        package='rtabmap_ros',
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
        package='rtabmap_ros',
        executable='rgbd_odometry',
        name='rgbd_odometry',
        parameters=[{
            'frame_id': 'camera_link',
            'publish_tf': True
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
        executable='mqtt_publisher_node',
        name='mqtt_publisher',
        parameters=[publisher_config],
        output='screen'
    )

    # 4. Rosbridge server (local, port 9090)
    # For local dashboard access if needed
    rosbridge_server = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            os.path.join(get_package_share_directory('rosbridge_server'), 'launch', 'rosbridge_websocket_launch.xml')
        ])
    )

    return LaunchDescription([
        realsense_node,
        visual_odometry_node,
        rtabmap_node,
        mqtt_publisher_node,
        rosbridge_server
    ])
