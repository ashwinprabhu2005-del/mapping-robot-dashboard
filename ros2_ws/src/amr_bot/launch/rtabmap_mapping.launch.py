"""
rtabmap_mapping.launch.py — clean final
Saves on Ctrl+C automatically:
  ~/amr_ws/maps/session_TIMESTAMP/rtabmap.db          (3D database, by rtabmap)
  ~/amr_ws/maps/session_TIMESTAMP/living_room_map.pgm (2D map image, by map_saver_cli)
  ~/amr_ws/maps/session_TIMESTAMP/living_room_map.yaml (2D map metadata)
"""

import os, datetime
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    RegisterEventHandler,
)
from launch.event_handlers import OnShutdown
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory

MAPS_DIR  = os.path.expanduser('~/amr_ws/maps')
_sess_dir = os.path.join(MAPS_DIR, 'active_session')
DB_PATH   = os.path.join(_sess_dir, 'rtabmap.db')
MAP_BASE  = os.path.join(_sess_dir, 'living_room_map')

import shutil
if os.path.exists(_sess_dir):
    try:
        shutil.rmtree(_sess_dir)
    except Exception as e:
        print(f"Warning: Could not clear previous session: {e}")
os.makedirs(_sess_dir, exist_ok=True)
print(f'[mapping] Active session folder: {_sess_dir}')


def generate_launch_description():

    use_sim_time = LaunchConfiguration('use_sim_time', default='true')

    rviz_config = os.path.join(
        get_package_share_directory('amr_bot'),
        'rviz', 'rtabmap_mapping.rviz'
    )

    # 1. RTAB-Map SLAM
    rtabmap_node = Node(
        package    = 'rtabmap_slam',
        executable = 'rtabmap',
        name       = 'rtabmap',
        output     = 'screen',
        parameters = [{
            'use_sim_time':  use_sim_time,
            'database_path': DB_PATH,
            'frame_id':      'base_footprint',
            'odom_frame_id': 'odom',
            'map_frame_id':  'map',
            'subscribe_depth': True,
            'subscribe_rgb':   True,
            'subscribe_scan':  False,
            'subscribe_odom':  True,
            'approx_sync':              True,
            'approx_sync_max_interval': 0.5,
            'topic_queue_size':         50,
            'sync_queue_size':          50,
            'qos_image':       2,
            'qos_camera_info': 2,
            'qos_odom':        1,
            'Mem/IncrementalMemory':    'true',
            'Mem/InitWMWithAllNodes':   'false',
            'Mem/NotLinkedNodesKept':   'true',
            'Mem/STMSize':              '30',
            'Rtabmap/TimeThr':          '0',
            'RGBD/LinearUpdate':        '0.05',
            'RGBD/AngularUpdate':       '0.052',
            'RGBD/OptimizeFromGraphEnd':'false',
            'Optimizer/GravitySigma':   '0',
            'Kp/MaxFeatures':           '500',
            'Vis/MinInliers':           '10',
            'Vis/InlierDistance':       '0.1',
            'Grid/3D':                  'true',
            'Grid/FromDepth':           'true',
            'Grid/Sensor':              '1',
            'Grid/RangeMax':            '4.0',
            'Grid/CellSize':            '0.02',
            'Grid/MinGroundHeight':     '-0.1',
            'Grid/MaxGroundHeight':     '0.05',
            'Grid/MaxObstacleHeight':   '2.5',
            'Grid/NormalsSegmentation': 'true',
            'Grid/ClusterRadius':       '0.1',
            'Grid/MinClusterSize':      '10',
            'Grid/DepthDecimation':     '1',
            'cloud_decimation':         1,
            'cloud_output_voxel_size':  0.01,
            'cloud_max_depth':          4.0,
            'cloud_min_depth':          0.1,
        }],
        remappings = [
            ('rgb/image',       '/camera/image_raw'),
            ('rgb/camera_info', '/camera/camera_info'),
            ('depth/image',     '/camera/depth/image_raw'),
            ('odom',            '/odom'),
        ],
        arguments = ['--delete_db_on_start'],
    )



    # 3. On Ctrl+C: save 2D pgm AND export to PLY+GLB
    # rtabmap auto-saves rtabmap.db itself on shutdown.
    # This script then exports DB→PLY→GLB automatically.
    save_and_export = ExecuteProcess(
        cmd=[
            'bash', '-c',
            (
                f'source /opt/ros/humble/setup.bash && '
                f'source {os.path.expanduser("~/amr_ws/install/setup.bash")} && '
                # Save 2D pgm map
                f'sleep 1 && '
                f'ros2 run nav2_map_server map_saver_cli '
                f'-f {MAP_BASE} '
                f'--ros-args -p use_sim_time:=false && '
                f'echo "2D map saved: {MAP_BASE}.pgm" ; '
                # Export DB to PLY and GLB
                f'echo "Exporting 3D map to PLY and GLB..." && '
                f'python3 {os.path.expanduser("~/amr_ws/src/amr_bot/scripts/export_map.py")} '
                f'--session {_sess_dir}'
            )
        ],
        output='screen',
    )

    on_shutdown = RegisterEventHandler(
        OnShutdown(on_shutdown=[save_and_export])
    )

    return LaunchDescription([
        DeclareLaunchArgument('use_sim_time', default_value='true'),
        rtabmap_node,
    ])
