import os

class Config:
    POSTGRES_USER = os.environ.get('POSTGRES_USER', 'amr_user')
    POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD', 'postgres_password')
    POSTGRES_HOST = os.environ.get('POSTGRES_HOST', 'postgresql')
    POSTGRES_PORT = os.environ.get('POSTGRES_PORT', '5432')
    POSTGRES_DB = os.environ.get('POSTGRES_DB', 'amr_db')
    
    SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    
    INFLUXDB_URL = os.environ.get('INFLUXDB_URL', 'http://influxdb:8086')
    INFLUXDB_TOKEN = os.environ.get('INFLUXDB_TOKEN', 'influx_token')
    INFLUXDB_ORG = os.environ.get('INFLUXDB_ORG', 'amr_org')
    INFLUXDB_BUCKET = os.environ.get('INFLUXDB_BUCKET', 'amr_data')
    
    MQTT_BROKER_HOST = os.environ.get('MQTT_BROKER_HOST', 'mosquitto')
    MQTT_BROKER_PORT = int(os.environ.get('MQTT_BROKER_PORT', 1883))
    MQTT_USERNAME = os.environ.get('MQTT_USERNAME', 'dashboard')
    MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD', 'dashboard_password')

settings = Config()
