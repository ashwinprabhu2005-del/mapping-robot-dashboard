import rclpy
from rclpy.node import Node
import json
import time
from geometry_msgs.msg import Twist
from .config_loader import load_config
from .connection_manager import ConnectionManager
from .data_serializer import DataSerializer
from .pointcloud_encoder import PointCloudEncoder
from .topic_subscriber import TopicSubscriber

class AMRDataPublisher(Node):
    def __init__(self):
        super().__init__('amr_data_publisher')
        
        # Load configs
        self.declare_parameter('config_file', '')
        config_path = self.get_parameter('config_file').value
        self.config = load_config(config_path)
        
        self.robot_id = self.config['robot']['id']
        self.host = self.config['network']['docker_host_ip']
        self.port = self.config['network']['mqtt_port']
        self.username = self.config['network']['mqtt_username']
        self.password = self.config['network']['mqtt_password']
        self.reconnect_interval = self.config['network']['reconnect_interval_sec']
        
        # Publication Rate Limiting
        self.last_pub_times = {}
        self.min_pub_periods = {
            'imu': 1.0 / self.config['publish_rates']['imu_hz'],
            'odom': 1.0 / self.config['publish_rates']['odometry_hz'],
            'battery': 1.0 / self.config['publish_rates']['battery_hz'],
            'image': 1.0 / self.config['publish_rates']['color_image_hz'],
            'cloud_map': 1.0 / self.config['publish_rates']['cloud_map_hz'],
            'occupancy_grid': 1.0 / self.config['publish_rates']['occupancy_grid_hz'],
            'encoders': 1.0 / self.config['publish_rates']['encoders_hz'],
        }
        
        # Initialize MQTT Connection
        self.conn_manager = ConnectionManager(
            self.host, self.port, self.username, self.password, self.reconnect_interval
        )
        self.mqtt_client = self.conn_manager.client
        self.mqtt_client.on_message = self._on_mqtt_message
        
        # Connect client to broker
        self.conn_manager.connect()
        
        # Subscriptions on MQTT Broker for incoming commands
        self.mqtt_client.subscribe(f"amr/{self.robot_id}/cmd/velocity", qos=1)
        self.mqtt_client.subscribe(f"amr/{self.robot_id}/cmd/trigger_map", qos=1)
        self.mqtt_client.subscribe(f"amr/{self.robot_id}/cmd/save_map", qos=1)
        
        # Local publisher for Twist commands to drive the robot
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        
        # Map ROS2 topic events to callbacks
        callbacks = {
            'imu': self._imu_callback,
            'odom': self._odom_callback,
            'battery': self._battery_callback,
            'cloud_map': self._cloud_map_callback,
            'occupancy_grid': self._occupancy_grid_callback,
            'image': self._image_callback,
            'encoder_left': self._encoder_left_callback,
            'encoder_right': self._encoder_right_callback,
        }
        
        # Start subscribing to local topics
        self.subscriber_manager = TopicSubscriber(self, callbacks)
        
        self.get_logger().info(f"🚀 AMR Data Publisher node initialized for robot '{self.robot_id}'")
        
    def _rate_limit_check(self, key):
        """Rate limit helper to avoid saturating MQTT bandwidth."""
        now = time.time()
        last_time = self.last_pub_times.get(key, 0)
        min_period = self.min_pub_periods.get(key, 0)
        if now - last_time >= min_period:
            self.last_pub_times[key] = now
            return True
        return False
        
    def _publish_to_mqtt(self, topic, data_dict, qos=0, retain=False):
        """Build payload envelope and publish to MQTT."""
        if not self.conn_manager.connected:
            return
        payload = json.dumps({
            'robot_id': self.robot_id,
            'timestamp': time.time(),
            'data': data_dict
        })
        self.mqtt_client.publish(topic, payload, qos=qos, retain=retain)
        
    def _imu_callback(self, msg):
        if self._rate_limit_check('imu'):
            data = DataSerializer.serialize_imu(msg)
            self._publish_to_mqtt(f"amr/{self.robot_id}/sensors/imu", data, qos=self.config['mqtt']['qos_sensor_data'])
            
    def _odom_callback(self, msg):
        if self._rate_limit_check('odom'):
            data = DataSerializer.serialize_odometry(msg)
            self._publish_to_mqtt(f"amr/{self.robot_id}/sensors/odom", data, qos=self.config['mqtt']['qos_sensor_data'])
            
    def _battery_callback(self, msg):
        if self._rate_limit_check('battery'):
            data = DataSerializer.serialize_battery(msg)
            self._publish_to_mqtt(f"amr/{self.robot_id}/sensors/battery", data, qos=self.config['mqtt']['qos_sensor_data'])
            
    def _cloud_map_callback(self, msg):
        if self._rate_limit_check('cloud_map'):
            # Filter and downsample point cloud coordinates
            downsampled = PointCloudEncoder.downsample_and_filter(
                msg,
                max_points=self.config['pointcloud']['max_points'],
                voxel_size=self.config['pointcloud']['voxel_size']
            )
            data = DataSerializer.serialize_pointcloud(downsampled)
            self._publish_to_mqtt(f"amr/{self.robot_id}/slam/cloud_map", data, qos=self.config['mqtt']['qos_maps'])
            
    def _occupancy_grid_callback(self, msg):
        if self._rate_limit_check('occupancy_grid'):
            data = DataSerializer.serialize_occupancy_grid(msg)
            self._publish_to_mqtt(f"amr/{self.robot_id}/slam/occupancy_grid", data, qos=self.config['mqtt']['qos_maps'])
            
    def _image_callback(self, msg):
        if self._rate_limit_check('image'):
            data = DataSerializer.serialize_image(msg, jpeg_quality=self.config['camera']['jpeg_quality'])
            self._publish_to_mqtt(f"amr/{self.robot_id}/camera/color_image", data, qos=self.config['mqtt']['qos_sensor_data'])
            
    def _encoder_left_callback(self, msg):
        if self._rate_limit_check('encoders'):
            data = DataSerializer.serialize_int64(msg)
            self._publish_to_mqtt(f"amr/{self.robot_id}/sensors/encoders/left", data, qos=self.config['mqtt']['qos_sensor_data'])
            
    def _encoder_right_callback(self, msg):
        if self._rate_limit_check('encoders'):
            data = DataSerializer.serialize_int64(msg)
            self._publish_to_mqtt(f"amr/{self.robot_id}/sensors/encoders/right", data, qos=self.config['mqtt']['qos_sensor_data'])

    def _on_mqtt_message(self, client, userdata, message):
        """Processes control commands arriving from the MQTT server."""
        topic = message.topic
        try:
            payload = json.loads(message.payload.decode('utf-8'))
            self.get_node_logger().debug(f"Received MQTT topic '{topic}' command: {payload}")
            
            if f"amr/{self.robot_id}/cmd/velocity" in topic:
                # Forward Twist coordinates to physical base
                cmd_data = payload.get('data', payload)
                twist = Twist()
                twist.linear.x = float(cmd_data.get('linear_x', 0.0))
                twist.angular.z = float(cmd_data.get('angular_z', 0.0))
                self.cmd_vel_pub.publish(twist)
                
            elif f"amr/{self.robot_id}/cmd/trigger_map" in topic:
                self.get_logger().info("Received trigger map command. Initializing mapping run.")
                
            elif f"amr/{self.robot_id}/cmd/save_map" in topic:
                self.get_logger().info("Received save map command. Committing snapshot.")
                
        except Exception as e:
            self.get_logger().error(f"Error handling MQTT command: {e}")

def main(args=None):
    rclpy.init(args=args)
    node = AMRDataPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.get_logger().info("Stopping AMR Data Publisher")
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
