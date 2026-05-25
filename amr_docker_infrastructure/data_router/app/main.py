import asyncio
import os
import logging
from mqtt_subscriber import MQTTSubscriber
from postgres_writer import PostgresWriter
from influxdb_writer import InfluxDBWriter
from data_parser import DataParser

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DataRouter")

class DataRouter:
    def __init__(self):
        mqtt_host = os.environ.get('MQTT_BROKER_HOST', 'mosquitto')
        mqtt_port = int(os.environ.get('MQTT_BROKER_PORT', 1883))
        mqtt_user = os.environ.get('MQTT_USERNAME', 'data_router')
        mqtt_pwd = os.environ.get('MQTT_PASSWORD', 'router_password')
        
        pg_host = os.environ.get('POSTGRES_HOST', 'postgresql')
        pg_port = int(os.environ.get('POSTGRES_PORT', 5432))
        pg_db = os.environ.get('POSTGRES_DB', 'amr_db')
        pg_user = os.environ.get('POSTGRES_USER', 'amr_user')
        pg_pwd = os.environ.get('POSTGRES_PASSWORD', 'postgres_password')
        
        influx_url = os.environ.get('INFLUXDB_URL', 'http://influxdb:8086')
        influx_token = os.environ.get('INFLUXDB_TOKEN', 'influx_token')
        influx_org = os.environ.get('INFLUXDB_ORG', 'amr_org')
        influx_bucket = os.environ.get('INFLUXDB_BUCKET', 'amr_data')
        
        self.mqtt = MQTTSubscriber(
            host=mqtt_host,
            port=mqtt_port,
            username=mqtt_user,
            password=mqtt_pwd
        )
        self.postgres = PostgresWriter(
            host=pg_host,
            port=pg_port,
            database=pg_db,
            username=pg_user,
            password=pg_pwd
        )
        self.influx = InfluxDBWriter(
            url=influx_url,
            token=influx_token,
            org=influx_org,
            bucket=influx_bucket
        )
        self.parser = DataParser()
        
    async def start(self):
        # Connect to Postgres and InfluxDB
        await self.postgres.connect()
        await self.influx.connect()
        
        # Map subscriber callbacks
        self.mqtt.subscribe("amr/#", self._handle_message)
        
        # Connect to MQTT
        await self.mqtt.connect()
        logger.info("🚀 Data Router main loop running.")
        
        # Keep process alive
        while True:
            await asyncio.sleep(3600)
            
    async def _handle_message(self, topic: str, payload: str):
        try:
            data = self.parser.parse(topic, payload)
            
            # Match routing targets based on topic structures
            if 'sensors/imu' in topic:
                await self._write_imu(data)
            elif 'sensors/odom' in topic:
                await self._write_odometry(data)
            elif 'sensors/battery' in topic:
                await self._write_battery(data)
            elif 'sensors/encoders' in topic:
                await self._write_encoders(topic, data)
            elif 'slam/occupancy_grid' in topic:
                await self._write_map_snapshot(data)
            elif 'slam/info' in topic:
                await self._write_slam_session(data)
            elif 'status/heartbeat' in topic:
                await self._write_heartbeat(data)
        except Exception as e:
            logger.error(f"Error processing payload on '{topic}': {e}")
            
    async def _write_imu(self, data):
        await self.influx.write_point(
            measurement="imu",
            tags={"robot_id": data['robot_id']},
            fields={
                "accel_x": float(data['data']['linear_acceleration']['x']),
                "accel_y": float(data['data']['linear_acceleration']['y']),
                "accel_z": float(data['data']['linear_acceleration']['z']),
                "gyro_x": float(data['data']['angular_velocity']['x']),
                "gyro_y": float(data['data']['angular_velocity']['y']),
                "gyro_z": float(data['data']['angular_velocity']['z']),
                "orient_x": float(data['data']['orientation']['x']),
                "orient_y": float(data['data']['orientation']['y']),
                "orient_z": float(data['data']['orientation']['z']),
                "orient_w": float(data['data']['orientation']['w']),
            },
            timestamp=data['timestamp']
        )
        
    async def _write_odometry(self, data):
        await self.influx.write_point(
            measurement="odometry",
            tags={"robot_id": data['robot_id']},
            fields={
                "pos_x": float(data['data']['position']['x']),
                "pos_y": float(data['data']['position']['y']),
                "pos_z": float(data['data']['position']['z']),
                "linear_vel": float(data['data']['linear_velocity']['x']),
                "angular_vel": float(data['data']['angular_velocity']['z'])
            },
            timestamp=data['timestamp']
        )
        
    async def _write_battery(self, data):
        await self.influx.write_point(
            measurement="battery",
            tags={"robot_id": data['robot_id']},
            fields={
                "voltage": float(data['data']['voltage']),
                "percentage": float(data['data']['percentage'])
            },
            timestamp=data['timestamp']
        )
        
    async def _write_encoders(self, topic, data):
        wheel_side = topic.split('/')[-1]
        await self.influx.write_point(
            measurement="wheel_encoders",
            tags={"robot_id": data['robot_id'], "wheel": wheel_side},
            fields={
                "ticks": int(data['data']['data'])
            },
            timestamp=data['timestamp']
        )
        
    async def _write_map_snapshot(self, data):
        await self.postgres.write_map_snapshot(data['robot_id'], data['timestamp'], data['data'])
        
    async def _write_slam_session(self, data):
        try:
            robot_id = data['robot_id']
            info = data['data']
            session_id = await self.postgres.get_active_session(robot_id)
            
            await self.postgres.execute(
                """UPDATE slam_sessions 
                   SET keyframes = $1, loop_closures = $2, map_quality = $3
                   WHERE id = $4""",
                int(info.get('keyframes', 0)),
                int(info.get('loop_closures', 0)),
                float(info.get('map_quality', 0.0)),
                session_id
            )
        except Exception as e:
            logger.error(f"Failed to update SLAM session details in Postgres: {e}")
            
    async def _write_heartbeat(self, data):
        # Save state metrics to Postgres
        await self.postgres.write_heartbeat(data['robot_id'], data['timestamp'], data['data'])
        
        # Save time-series CPU/memory load logs to InfluxDB
        await self.influx.write_point(
            measurement="system_health",
            tags={"robot_id": data['robot_id']},
            fields={
                "cpu_percent": float(data['data']['cpu_percent']),
                "memory_percent": float(data['data']['memory_percent']),
                "temperature_c": float(data['data']['temperature_c']),
                "ros_nodes_active": int(data['data']['ros2_nodes_active'])
            },
            timestamp=data['timestamp']
        )

if __name__ == '__main__':
    router = DataRouter()
    asyncio.run(router.start())
