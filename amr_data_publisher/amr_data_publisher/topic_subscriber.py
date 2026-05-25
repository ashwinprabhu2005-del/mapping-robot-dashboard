from sensor_msgs.msg import Imu, Image, BatteryState, PointCloud2
from nav_msgs.msg import Odometry, OccupancyGrid
from std_msgs.msg import Int64
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy

class TopicSubscriber:
    def __init__(self, node, callbacks):
        self.node = node
        self.callbacks = callbacks
        self.subscriptions = []
        
        # Define standard QoS configurations
        self.sensor_qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=10
        )
        self.reliable_qos = QoSProfile(
            reliability=ReliabilityPolicy.RELIABLE,
            history=HistoryPolicy.KEEP_LAST,
            depth=5
        )
        
        self.setup_subscriptions()
        
    def setup_subscriptions(self):
        # IMU Telemetry
        if 'imu' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(Imu, '/imu/data', self.callbacks['imu'], self.sensor_qos)
            )
            
        # Odometry State
        if 'odom' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(Odometry, '/odom', self.callbacks['odom'], self.sensor_qos)
            )
            
        # Battery State
        if 'battery' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(BatteryState, '/battery_state', self.callbacks['battery'], self.sensor_qos)
            )
            
        # 3D Mapping Point Cloud
        if 'cloud_map' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(PointCloud2, '/cloud_map', self.callbacks['cloud_map'], self.reliable_qos)
            )
            
        # 2D Occupancy Grid
        if 'occupancy_grid' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(OccupancyGrid, '/occupancy_grid', self.callbacks['occupancy_grid'], self.reliable_qos)
            )
            
        # Camera Feed
        if 'image' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(Image, '/camera/color/image_raw', self.callbacks['image'], self.sensor_qos)
            )
            
        # Left Encoder
        if 'encoder_left' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(Int64, '/left_wheel_ticks', self.callbacks['encoder_left'], self.sensor_qos)
            )
            
        # Right Encoder
        if 'encoder_right' in self.callbacks:
            self.subscriptions.append(
                self.node.create_subscription(Int64, '/right_wheel_ticks', self.callbacks['encoder_right'], self.sensor_qos)
            )
            
        self.node.get_logger().info(f"Registered {len(self.subscriptions)} ROS2 subscriptions")
