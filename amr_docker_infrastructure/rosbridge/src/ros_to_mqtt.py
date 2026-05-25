import rclpy
from rclpy.node import Node
import paho.mqtt.client as mqtt
import json
import time
import os
from geometry_msgs.msg import Twist

class ROSToMQTT(Node):
    def __init__(self):
        super().__init__('ros_to_mqtt_bridge')
        
        mqtt_host = os.environ.get('MQTT_BROKER_HOST', 'mosquitto')
        mqtt_port = int(os.environ.get('MQTT_BROKER_PORT', 1883))
        mqtt_user = os.environ.get('MQTT_USERNAME', 'rosbridge')
        mqtt_pwd = os.environ.get('MQTT_PASSWORD', 'bridge_password')
        
        self.robot_id = 'amr_001'
        
        # ROS2 subscription for commands
        self.cmd_vel_sub = self.create_subscription(
            Twist, '/cmd_vel', self._on_ros_cmd_vel, 10
        )
        
        # MQTT Client initialization
        try:
            self.mqtt = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1, client_id="rosbridge_mqtt_cmd_bridge")
        except AttributeError:
            self.mqtt = mqtt.Client("rosbridge_mqtt_cmd_bridge")
            
        self.mqtt.username_pw_set(mqtt_user, mqtt_pwd)
        self.mqtt.connect(mqtt_host, mqtt_port, keepalive=60)
        self.mqtt.loop_start()
        
        self.get_logger().info("✅ ROS2 to MQTT translator started successfully")
        
    def _on_ros_cmd_vel(self, msg: Twist):
        """Forward velocity commands from Rosbridge to Robot via MQTT."""
        payload = {
            'robot_id': self.robot_id,
            'timestamp': time.time(),
            'data': {
                'linear_x': float(msg.linear.x),
                'angular_z': float(msg.angular.z)
            }
        }
        self.mqtt.publish(f"amr/{self.robot_id}/cmd/velocity", json.dumps(payload), qos=1)

def main(args=None):
    rclpy.init(args=args)
    node = ROSToMQTT()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.get_logger().info("Stopping ROS2 to MQTT bridge translator")
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
