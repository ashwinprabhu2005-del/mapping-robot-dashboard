import paho.mqtt.client as mqtt
import time
import threading
import logging

class ConnectionManager:
    def __init__(self, host, port, username, password, reconnect_interval=5):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.reconnect_interval = reconnect_interval
        
        # In newer paho-mqtt version, Client() requires callback_api_version
        try:
            self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
        except AttributeError:
            self.client = mqtt.Client()
            
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
            
        self.connected = False
        self.disconnect_time = None
        self.reconnect_attempts = 0
        self.logger = logging.getLogger("ConnectionManager")
        
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        
        # Start connection monitor thread
        self.monitor_thread = threading.Thread(target=self._monitor_connection, daemon=True)
        
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            self.disconnect_time = None
            self.reconnect_attempts = 0
            self.logger.info(f"✅ Connected to MQTT broker at {self.host}:{self.port}")
        else:
            self.connected = False
            self.logger.error(f"❌ Connection to MQTT broker failed with code {rc}")
            
    def _on_disconnect(self, client, userdata, rc):
        self.connected = False
        self.disconnect_time = time.time()
        self.logger.warning(f"⚠️ Disconnected from MQTT broker (code: {rc})")
        
    def connect(self) -> bool:
        try:
            self.logger.info(f"Connecting to MQTT broker at {self.host}:{self.port}...")
            self.client.connect_async(self.host, self.port, keepalive=60)
            self.client.loop_start()
            self.monitor_thread.start()
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize connection: {e}")
            return False
            
    def _monitor_connection(self):
        """Monitors connection state and logs alert if offline for >30s."""
        alert_sent = False
        while True:
            time.sleep(1)
            if not self.connected and self.disconnect_time:
                offline_duration = time.time() - self.disconnect_time
                if offline_duration > 30 and not alert_sent:
                    self.logger.error(f"🚨 CRITICAL ALERT: MQTT Broker offline for {offline_duration:.1f}s. Check connectivity to {self.host}!")
                    alert_sent = True
            elif self.connected:
                alert_sent = False

    def get_status(self) -> dict:
        return {
            "connected": self.connected,
            "host": self.host,
            "port": self.port,
            "offline_duration": (time.time() - self.disconnect_time) if (not self.connected and self.disconnect_time) else 0
        }
