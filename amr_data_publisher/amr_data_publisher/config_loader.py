import yaml
import os

def load_config(config_path=None):
    """Load configuration from YAML file."""
    if not config_path:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, '../config/publisher_config.yaml')
        if not os.path.exists(config_path):
            config_path = os.path.abspath(os.path.join(current_dir, '../../share/amr_data_publisher/config/publisher_config.yaml'))
        if not os.path.exists(config_path):
            config_path = '/home/jetson/amr_ws/src/amr_data_publisher/config/publisher_config.yaml'

    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"[Config Loader] Warning: Could not open config file {config_path}: {e}. Using defaults.")
        return {
            'robot': {'id': 'amr_001', 'name': 'AMR Robot 1', 'location': 'Warehouse'},
            'network': {'docker_host_ip': '192.168.1.100', 'mqtt_port': 1883, 'mqtt_username': 'amr_robot', 'mqtt_password': 'amr_password', 'reconnect_interval_sec': 5, 'connection_timeout_sec': 30},
            'publish_rates': {'imu_hz': 10, 'odometry_hz': 10, 'battery_hz': 0.5, 'color_image_hz': 5, 'depth_points_hz': 1, 'cloud_map_hz': 0.5, 'occupancy_grid_hz': 1, 'encoders_hz': 10, 'heartbeat_hz': 1},
            'pointcloud': {'max_points': 50000, 'voxel_size': 0.05, 'compress': True, 'send_colors': True},
            'camera': {'send_color': True, 'send_depth': False, 'jpeg_quality': 40, 'resize_width': 320, 'resize_height': 240},
            'mqtt': {'qos_sensor_data': 0, 'qos_commands': 1, 'qos_maps': 1, 'retain_heartbeat': True}
        }
