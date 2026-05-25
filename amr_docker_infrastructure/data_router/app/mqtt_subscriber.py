import paho.mqtt.client as mqtt
import logging
import asyncio

class MQTTSubscriber:
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        
        # Paho Client compatibility
        try:
            self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
        except AttributeError:
            self.client = mqtt.Client()
            
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
            
        self.logger = logging.getLogger("MQTTSubscriber")
        self.callbacks = {}
        self.loop = None
        
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.logger.info(f"✅ Connected to Mosquitto broker at {self.host}:{self.port}")
            # Register existing subscriptions
            for topic in self.callbacks:
                self.client.subscribe(topic)
                self.logger.info(f"Subscribed to topic: {topic}")
        else:
            self.logger.error(f"❌ Failed to connect to Mosquitto broker: return code {rc}")
            
    def _on_message(self, client, userdata, message):
        topic = message.topic
        try:
            payload = message.payload.decode('utf-8')
        except UnicodeDecodeError:
            self.logger.warning(f"Discarding binary payload on topic {topic}")
            return
            
        # Match incoming topic against patterns
        for pattern, callback in self.callbacks.items():
            if mqtt.topic_matches_sub(pattern, topic):
                if self.loop:
                    asyncio.run_coroutine_threadsafe(callback(topic, payload), self.loop)
                
    def subscribe(self, topic_pattern, callback):
        self.callbacks[topic_pattern] = callback
        
    async def connect(self):
        self.loop = asyncio.get_running_loop()
        self.logger.info(f"Connecting to broker {self.host}...")
        self.client.connect_async(self.host, self.port, keepalive=60)
        self.client.loop_start()
