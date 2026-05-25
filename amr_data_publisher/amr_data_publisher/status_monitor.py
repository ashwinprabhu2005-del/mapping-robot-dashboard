import rclpy
from rclpy.node import Node
import time
import json
import os
from .config_loader import load_config
from .connection_manager import ConnectionManager

try:
    import psutil
except ImportError:
    psutil = None

class StatusMonitor(Node):
    def __init__(self):
        super().__init__('amr_status_monitor')
        
        # Load configurations
        self.declare_parameter('config_file', '')
        config_path = self.get_parameter('config_file').value
        self.config = load_config(config_path)
        
        self.robot_id = self.config['robot']['id']
        self.host = self.config['network']['docker_host_ip']
        self.port = self.config['network']['mqtt_port']
        self.username = self.config['network']['mqtt_username']
        self.password = self.config['network']['mqtt_password']
        self.reconnect_interval = self.config['network']['reconnect_interval_sec']
        
        # Initialize Connection Manager
        self.conn_manager = ConnectionManager(
            self.host, self.port, self.username, self.password, self.reconnect_interval
        )
        self.mqtt_client = self.conn_manager.client
        self.conn_manager.connect()
        
        self.start_time = time.time()
        
        # Heartbeat timer (1 Hz)
        self.timer = self.create_timer(1.0, self._publish_heartbeat)
        self.get_logger().info("📊 System Status Monitor initialized")
        
    def _get_cpu_percent(self):
        """Calculates CPU usage, falling back to /proc/stat if psutil is unavailable."""
        if psutil:
            return psutil.cpu_percent()
        try:
            with open('/proc/stat', 'r') as f:
                line = f.readline()
            parts = line.split()
            idle = float(parts[4])
            total = sum(float(x) for x in parts[1:8])
            return 100.0 * (1.0 - idle / total)
        except Exception:
            return 0.0
            
    def _get_memory_info(self):
        """Calculates memory info, falling back to /proc/meminfo if psutil is unavailable."""
        if psutil:
            mem = psutil.virtual_memory()
            return mem.percent, mem.used / (1024 * 1024)
        try:
            meminfo = {}
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    parts = line.split(':')
                    meminfo[parts[0].strip()] = int(parts[1].split()[0])
            total = meminfo['MemTotal']
            free = meminfo['MemFree'] + meminfo['Cached'] + meminfo['Buffers']
            used = total - free
            percent = (used / total) * 100
            return percent, used / 1024
        except Exception:
            return 0.0, 0.0
            
    def _get_temperature(self):
        """Reads thermal zones on Jetson or standard Linux boards."""
        thermal_paths = [
            '/sys/devices/virtual/thermal/thermal_zone0/temp',  # Jetson CPU
            '/sys/class/thermal/thermal_zone0/temp'            # Ubuntu/Raspberry Pi CPU
        ]
        for path in thermal_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        temp = float(f.read().strip())
                    # Convert millidegrees (55000) to degrees (55.0)
                    if temp > 1000:
                        temp /= 1000.0
                    return temp
                except Exception:
                    pass
        return 45.0  # Default fallback temperature
        
    def _publish_heartbeat(self):
        """Publishes system statistics to the heartbeat topic."""
        if not self.conn_manager.connected:
            return
            
        cpu = self._get_cpu_percent()
        mem_pct, mem_used = self._get_memory_info()
        temp = self._get_temperature()
        
        try:
            node_names = self.get_node_names()
            ros_count = len(node_names)
        except Exception:
            node_names = []
            ros_count = 0
            
        payload = {
            'robot_id': self.robot_id,
            'timestamp': time.time(),
            'status': 'running',
            'uptime_seconds': int(time.time() - self.start_time),
            'cpu_percent': round(cpu, 1),
            'memory_percent': round(mem_pct, 1),
            'memory_used_mb': int(mem_used),
            'temperature_c': round(temp, 1),
            'ros2_nodes_active': ros_count,
            'mqtt_connected': True,
            'topics_publishing': [
                "/imu/data", "/odom", "/battery_state", "/cloud_map", "/occupancy_grid"
            ]
        }
        
        topic = f"amr/{self.robot_id}/status/heartbeat"
        self.mqtt_client.publish(topic, json.dumps(payload), qos=1, retain=True)

def main(args=None):
    rclpy.init(args=args)
    node = StatusMonitor()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
