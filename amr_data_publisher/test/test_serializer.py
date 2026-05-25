import pytest
from amr_data_publisher.data_serializer import DataSerializer
from sensor_msgs.msg import Imu
from std_msgs.msg import Int64

def test_imu_serializer():
    msg = Imu()
    msg.angular_velocity.x = 1.0
    msg.angular_velocity.y = 2.0
    msg.angular_velocity.z = 3.0
    msg.linear_acceleration.x = 4.0
    msg.linear_acceleration.y = 5.0
    msg.linear_acceleration.z = 6.0
    msg.orientation.x = 0.0
    msg.orientation.y = 0.0
    msg.orientation.z = 0.0
    msg.orientation.w = 1.0
    
    serialized = DataSerializer.serialize_imu(msg)
    assert serialized['angular_velocity']['x'] == 1.0
    assert serialized['linear_acceleration']['y'] == 5.0
    assert serialized['orientation']['w'] == 1.0

def test_int64_serializer():
    msg = Int64()
    msg.data = 12345
    serialized = DataSerializer.serialize_int64(msg)
    assert serialized['data'] == 12345
