from influxdb_client import InfluxDBClient
from ..config import settings

class InfluxDBClientManager:
    def __init__(self):
        self.client = InfluxDBClient(
            url=settings.INFLUXDB_URL,
            token=settings.INFLUXDB_TOKEN,
            org=settings.INFLUXDB_ORG
        )
        self.query_api = self.client.query_api()

    def query(self, flux_query):
        """Executes a flux query against the InfluxDB database."""
        return self.query_api.query(org=settings.INFLUXDB_ORG, query=flux_query)

influx_manager = InfluxDBClientManager()
