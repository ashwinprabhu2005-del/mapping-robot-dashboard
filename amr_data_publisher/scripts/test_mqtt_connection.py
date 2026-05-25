#!/usr/bin/env python3
"""
Test MQTT connection to Docker host.
Run this BEFORE starting the full system.

Usage:
    python3 scripts/test_mqtt_connection.py --host 192.168.1.100
"""
import paho.mqtt.client as mqtt
import yaml, time, argparse, sys

def test_connection(host, port=1883, username="amr_robot", password="amr_password"):
    print(f"\n🔌 Testing MQTT connection to {host}:{port}...")
    
    # Handle Callback API version if paho-mqtt >= 2.0.0 is used
    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1, client_id="test_client")
    except AttributeError:
        client = mqtt.Client("test_client")
        
    client.username_pw_set(username, password)
    connected = False
    
    def on_connect(c, ud, flags, rc):
        nonlocal connected
        if rc == 0:
            connected = True
            print(f"✅ Connected to Docker MQTT broker at {host}:{port}")
        else:
            print(f"❌ Connection failed. Code: {rc}")
    
    client.on_connect = on_connect
    
    try:
        client.connect(host, port, 10)
        client.loop_start()
        time.sleep(3)
        
        if connected:
            # Test publish
            result = client.publish("amr/test/connection", '{"test": "ok"}')
            print(f"✅ Test message published successfully")
            print(f"\n✅ DOCKER CONNECTION READY!")
            print(f"   Now start the full system:")
            print(f"   ros2 launch amr_data_publisher full_amr_with_publisher.launch.py")
        else:
            print(f"\n❌ Could not connect to Docker host!")
            print(f"   Check:")
            print(f"   1. Docker is running on {host}")
            print(f"   2. MQTT broker container is running")
            print(f"   3. Port 1883 is open on Docker host")
            print(f"   4. Firewall allows connection")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test MQTT Broker Connection")
    parser.add_argument("--host", required=True, help="IP of Docker MQTT broker")
    parser.add_argument("--port", type=int, default=1883, help="Port of MQTT broker")
    parser.add_argument("--user", default="amr_robot", help="Username")
    parser.add_argument("--pwd", default="amr_password", help="Password")
    args = parser.parse_args()
    
    test_connection(args.host, args.port, args.user, args.pwd)
