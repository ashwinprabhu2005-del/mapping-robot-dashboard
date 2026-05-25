import base64
import json
import numpy as np
import cv2
from sensor_msgs.msg import Imu, Image, BatteryState, PointCloud2
from nav_msgs.msg import Odometry, OccupancyGrid
from std_msgs.msg import Int64

class DataSerializer:
    
    @staticmethod
    def serialize_imu(msg: Imu) -> dict:
        """Convert IMU message to JSON-serializable dict."""
        return {
            'angular_velocity': {
                'x': float(msg.angular_velocity.x),
                'y': float(msg.angular_velocity.y),
                'z': float(msg.angular_velocity.z)
            },
            'linear_acceleration': {
                'x': float(msg.linear_acceleration.x),
                'y': float(msg.linear_acceleration.y),
                'z': float(msg.linear_acceleration.z)
            },
            'orientation': {
                'x': float(msg.orientation.x),
                'y': float(msg.orientation.y),
                'z': float(msg.orientation.z),
                'w': float(msg.orientation.w)
            }
        }
    
    @staticmethod
    def serialize_odometry(msg: Odometry) -> dict:
        """Convert Odometry message to JSON."""
        return {
            'position': {
                'x': float(msg.pose.pose.position.x),
                'y': float(msg.pose.pose.position.y),
                'z': float(msg.pose.pose.position.z)
            },
            'orientation': {
                'x': float(msg.pose.pose.orientation.x),
                'y': float(msg.pose.pose.orientation.y),
                'z': float(msg.pose.pose.orientation.z),
                'w': float(msg.pose.pose.orientation.w)
            },
            'linear_velocity': {
                'x': float(msg.twist.twist.linear.x),
                'y': float(msg.twist.twist.linear.y),
                'z': float(msg.twist.twist.linear.z)
            },
            'angular_velocity': {
                'x': float(msg.twist.twist.angular.x),
                'y': float(msg.twist.twist.angular.y),
                'z': float(msg.twist.twist.angular.z)
            }
        }
    
    @staticmethod
    def serialize_image(msg: Image, jpeg_quality=40) -> dict:
        """Convert Image to base64-encoded JPEG."""
        try:
            # Reconstruct image from bytes data
            height = msg.height
            width = msg.width
            
            # Match pixel encoding to image channels
            if msg.encoding in ['rgb8', 'bgr8']:
                channels = 3
                np_arr = np.frombuffer(msg.data, dtype=np.uint8).reshape((height, width, channels))
                if msg.encoding == 'rgb8':
                    # Convert to BGR for OpenCV compression
                    np_arr = cv2.cvtColor(np_arr, cv2.COLOR_RGB2BGR)
            elif msg.encoding in ['mono8']:
                channels = 1
                np_arr = np.frombuffer(msg.data, dtype=np.uint8).reshape((height, width))
            else:
                # Raw fallback if unsupported encoding
                raise ValueError(f"Unsupported encoding: {msg.encoding}")

            # Compress as JPEG to save network bandwidth
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
            success, encoded_img = cv2.imencode('.jpg', np_arr, encode_param)
            
            if success:
                return {
                    'width': width,
                    'height': height,
                    'encoding': 'jpeg',
                    'data': base64.b64encode(encoded_img).decode('utf-8'),
                    'format': 'jpeg'
                }
        except Exception as e:
            print(f"[Serializer] Failed to compress image using OpenCV: {e}. Falling back to raw base64.")

        # Fallback to raw base64 bytes
        return {
            'width': msg.width,
            'height': msg.height,
            'encoding': msg.encoding,
            'data': base64.b64encode(bytes(msg.data)).decode('utf-8'),
            'format': 'raw'
        }
    
    @staticmethod
    def serialize_pointcloud(msg: PointCloud2) -> dict:
        """Convert PointCloud2 message to JSON dict."""
        return {
            'width': int(msg.width),
            'height': int(msg.height),
            'point_step': int(msg.point_step),
            'row_step': int(msg.row_step),
            'fields': [{'name': f.name, 'offset': int(f.offset), 'datatype': int(f.datatype), 'count': int(f.count)} for f in msg.fields],
            'data': base64.b64encode(bytes(msg.data)).decode('utf-8'),
            'is_dense': bool(msg.is_dense),
            'is_bigendian': bool(msg.is_bigendian)
        }
    
    @staticmethod
    def serialize_occupancy_grid(msg: OccupancyGrid) -> dict:
        """Convert OccupancyGrid to JSON."""
        return {
            'info': {
                'resolution': float(msg.info.resolution),
                'width': int(msg.info.width),
                'height': int(msg.info.height),
                'origin': {
                    'position': {
                        'x': float(msg.info.origin.position.x),
                        'y': float(msg.info.origin.position.y),
                        'z': float(msg.info.origin.position.z)
                    },
                    'orientation': {
                        'x': float(msg.info.origin.orientation.x),
                        'y': float(msg.info.origin.orientation.y),
                        'z': float(msg.info.origin.orientation.z),
                        'w': float(msg.info.origin.orientation.w)
                    }
                }
            },
            'data': list(msg.data)
        }
    
    @staticmethod
    def serialize_battery(msg: BatteryState) -> dict:
        """Convert BatteryState to JSON."""
        return {
            'voltage': float(msg.voltage),
            'percentage': float(msg.percentage),
            'current': float(msg.current),
            'charge': float(msg.charge),
            'capacity': float(msg.capacity),
            'power_supply_status': int(msg.power_supply_status)
        }

    @staticmethod
    def serialize_int64(msg: Int64) -> dict:
        """Convert Int64 message to JSON."""
        return {
            'data': int(msg.data)
        }
