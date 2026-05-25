"""Write time-series data to InfluxDB."""
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import ASYNCHRONOUS
import logging

class InfluxDBWriter:
    def __init__(self, url, token, org, bucket):
        self.url = url
        self.token = token
        self.org = org
        self.bucket = bucket
        self.client = None
        self.write_api = None
        self.logger = logging.getLogger("InfluxDBWriter")
    
    async def connect(self):
        try:
            self.client = InfluxDBClient(
                url=self.url,
                token=self.token,
                org=self.org
            )
            self.write_api = self.client.write_api(write_options=ASYNCHRONOUS)
            self.logger.info(f"✅ Connected to InfluxDB at {self.url}")
        except Exception as e:
            self.logger.error(f"❌ Failed to connect to InfluxDB: {e}")
            raise e
    
    async def write_point(self, measurement, tags, fields, timestamp=None):
        """Write a single data point to InfluxDB."""
        if not self.write_api:
            raise RuntimeError("InfluxDB not connected")
            
        point = Point(measurement)
        
        for tag_key, tag_value in tags.items():
            point = point.tag(tag_key, str(tag_value))
        
        for field_key, field_value in fields.items():
            if isinstance(field_value, (int, float)):
                point = point.field(field_key, float(field_value))
            else:
                point = point.field(field_key, str(field_value))
        
        if timestamp:
            point = point.time(int(timestamp * 1e9))  # nanoseconds
        
        self.write_api.write(
            bucket=self.bucket,
            org=self.org,
            record=point
        )
