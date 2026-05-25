import rclpy
from rclpy.node import Node
import paho.mqtt.client as mqtt
import json
import base64
import numpy as np
import cv2
import os
import time

from sensor_msgs.msg import Imu, Image, BatteryState, PointCloud2, PointField
from nav_msgs.msg import Odometry, OccupancyGrid
from geometry_msgs.msg import Twist

class MQTTtoROS(Node):
    def __init__(self):
        super().__init__('mqtt_to_ros_bridge')
        
        mqtt_host = os.environ.get('MQTT_BROKER_HOST', 'mosquitto')
        mqtt_port = int(os.environ.get('MQTT_BROKER_PORT', 1883))
        mqtt_user = os.environ.get('MQTT_USERNAME', 'rosbridge')
        mqtt_pwd = os.environ.get('MQTT_PASSWORD', 'bridge_password')
        
        self.robot_id = 'amr_001'
        
        # ROS2 publishers
        self.publishers_map = {
            'imu': self.create_publisher(Imu, '/imu/data', 10),
            'odom': self.create_publisher(Odometry, '/odom', 10),
            'battery': self.create_publisher(BatteryState, '/battery_state', 10),
            'cloud_map': self.create_publisher(PointCloud2, '/cloud_map', 10),
            'occupancy_grid': self.create_publisher(OccupancyGrid, '/occupancy_grid', 10),
            'image': self.create_publisher(Image, '/camera/color/image_raw', 10),
        }
        
        # ROS2 subscription for commands (Moved to ros_to_mqtt.py)
        # MQTT Client initialization
        try:
            self.mqtt = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1, client_id="rosbridge_mqtt_bridge")
        except AttributeError:
            self.mqtt = mqtt.Client("rosbridge_mqtt_bridge")
            
        self.mqtt.username_pw_set(mqtt_user, mqtt_pwd)
        self.mqtt.on_connect = self._on_mqtt_connect
        self.mqtt.on_message = self._on_mqtt_message
        
        self.mqtt.connect(mqtt_host, mqtt_port, keepalive=60)
        self.mqtt.loop_start()
        
        self.get_logger().info("✅ MQTT to ROS2 translator started successfully")
        
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.get_logger().info("Connected to MQTT broker in Rosbridge")
            self.mqtt.subscribe("amr/+/sensors/#")
            self.mqtt.subscribe("amr/+/camera/#")
            self.mqtt.subscribe("amr/+/slam/#")
        else:
            self.get_logger().error(f"MQTT connection failed with code {rc}")
            
    def _on_mqtt_message(self, client, userdata, message):
        topic = message.topic
        try:
            payload = json.loads(message.payload.decode('utf-8'))
            
            # Update robot_id dynamically based on topic
            parts = topic.split('/')
            if len(parts) >= 2:
                self.robot_id = parts[1]
                
            if 'sensors/imu' in topic:
                self._publish_imu(payload)
            elif 'sensors/odom' in topic:
                self._publish_odometry(payload)
            elif 'sensors/battery' in topic:
                self._publish_battery(payload)
            elif 'slam/cloud_map' in topic:
                self._publish_pointcloud(payload)
            elif 'slam/occupancy_grid' in topic:
                self._publish_occupancy_grid(payload)
            elif 'camera/color_image' in topic:
                self._publish_image(payload)
        except Exception as e:
            self.get_logger().error(f"Failed to bridge MQTT topic '{topic}': {e}")
            

    def _publish_imu(self, payload):
        msg = Imu()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "imu_link"
        
        d = payload['data']
        msg.angular_velocity.x = float(d['angular_velocity']['x'])
        msg.angular_velocity.y = float(d['angular_velocity']['y'])
        msg.angular_velocity.z = float(d['angular_velocity']['z'])
        msg.linear_acceleration.x = float(d['linear_acceleration']['x'])
        msg.linear_acceleration.y = float(d['linear_acceleration']['y'])
        msg.linear_acceleration.z = float(d['linear_acceleration']['z'])
        msg.orientation.x = float(d['orientation']['x'])
        msg.orientation.y = float(d['orientation']['y'])
        msg.orientation.z = float(d['orientation']['z'])
        msg.orientation.w = float(d['orientation']['w'])
        
        self.publishers_map['imu'].publish(msg)

    def _publish_odometry(self, payload):
        msg = Odometry()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "odom"
        msg.child_frame_id = "base_link"
        
        d = payload['data']
        msg.pose.pose.position.x = float(d['position']['x'])
        msg.pose.pose.position.y = float(d['position']['y'])
        msg.pose.pose.position.z = float(d['position']['z'])
        msg.pose.pose.orientation.x = float(d['orientation']['x'])
        msg.pose.pose.orientation.y = float(d['orientation']['y'])
        msg.pose.pose.orientation.z = float(d['orientation']['z'])
        msg.pose.pose.orientation.w = float(d['orientation']['w'])
        msg.twist.twist.linear.x = float(d['linear_velocity']['x'])
        msg.twist.twist.angular.z = float(d['angular_velocity']['z'])
        
        self.publishers_map['odom'].publish(msg)

    def _publish_battery(self, payload):
        msg = BatteryState()
        msg.header.stamp = self.get_clock().now().to_msg()
        
        d = payload['data']
        msg.voltage = float(d['voltage'])
        msg.percentage = float(d['percentage'])
        msg.current = float(d['current'])
        msg.charge = float(d['charge'])
        msg.capacity = float(d['capacity'])
        msg.power_supply_status = int(d['power_supply_status'])
        
        self.publishers_map['battery'].publish(msg)

    def _publish_pointcloud(self, payload):
        msg = PointCloud2()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "map"
        
        d = payload['data']
        msg.width = int(d['width'])
        msg.height = int(d['height'])
        msg.point_step = int(d['point_step'])
        msg.row_step = int(d['row_step'])
        msg.is_dense = bool(d['is_dense'])
        msg.is_bigendian = bool(d['is_bigendian'])
        
        msg.fields = []
        for f in d['fields']:
            pf = PointField()
            pf.name = f['name']
            pf.offset = int(f['offset'])
            pf.datatype = int(f['datatype'])
            pf.count = int(f['count'])
            msg.fields.append(pf)
            
        msg.data = base64.b64decode(d['data'])
        self.publishers_map['cloud_map'].publish(msg)

    def _publish_occupancy_grid(self, payload):
        msg = OccupancyGrid()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "map"
        
        d = payload['data']
        info = d['info']
        msg.info.resolution = float(info['resolution'])
        msg.info.width = int(info['width'])
        msg.info.height = int(info['height'])
        
        msg.info.origin.position.x = float(info['origin']['position']['x'])
        msg.info.origin.position.y = float(info['origin']['position']['y'])
        msg.info.origin.position.z = float(info['origin']['position']['z'])
        
        msg.info.origin.orientation.x = float(info['origin']['orientation']['x'])
        msg.info.origin.orientation.y = float(info['origin']['orientation']['y'])
        msg.info.origin.orientation.z = float(info['origin']['orientation']['z'])
        msg.info.origin.orientation.w = float(info['origin']['orientation']['w'])
        
        msg.data = [int(v) for v in d['data']]
        self.publishers_map['occupancy_grid'].publish(msg)

    def _publish_image(self, payload):
        d = payload['data']
        if d.get('encoding') == 'jpeg':
            jpg_bytes = base64.b64decode(d['data'])
            np_arr = np.frombuffer(jpg_bytes, dtype=np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            msg = Image()
            msg.header.stamp = self.get_clock().now().to_msg()
            msg.header.frame_id = "camera_link"
            msg.height = img.shape[0]
            msg.width = img.shape[1]
            msg.encoding = "bgr8"
            msg.is_bigendian = 0
            msg.step = img.shape[1] * 3
            msg.data = img.tobytes()
            self.publishers_map['image'].publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = MQTTtoROS()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.get_logger().info("Stopping MQTT to ROS2 bridge translator")
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
