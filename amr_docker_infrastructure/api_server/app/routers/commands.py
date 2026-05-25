from fastapi import APIRouter, HTTPException
import paho.mqtt.publish as publish
from ..models.schemas import VelocityCommand, TriggerMapCommand, SaveMapCommand
from ..config import settings
import json
import time

router = APIRouter()

def publish_mqtt(topic, payload):
    """Sends a single MQTT message using transient connection."""
    auth = None
    if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
        auth = {
            'username': settings.MQTT_USERNAME,
            'password': settings.MQTT_PASSWORD
        }
    try:
        publish.single(
            topic=topic,
            payload=json.dumps(payload),
            hostname=settings.MQTT_BROKER_HOST,
            port=settings.MQTT_BROKER_PORT,
            auth=auth
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MQTT publication failed: {e}")

@router.post("/velocity")
def send_velocity_command(cmd: VelocityCommand):
    """Publishes a driving velocity command to the robot."""
    topic = f"amr/{cmd.robot_id}/cmd/velocity"
    payload = {
        "robot_id": cmd.robot_id,
        "timestamp": time.time(),
        "data": {
            "linear_x": cmd.linear_x,
            "angular_z": cmd.angular_z
        }
    }
    publish_mqtt(topic, payload)
    return {"status": "success", "message": "Velocity command sent"}

@router.post("/trigger_map")
def send_trigger_map_command(cmd: TriggerMapCommand):
    """Signals the SLAM system to start mapping."""
    topic = f"amr/{cmd.robot_id}/cmd/trigger_map"
    payload = {
        "robot_id": cmd.robot_id,
        "timestamp": time.time(),
        "data": {"command": "trigger_map"}
    }
    publish_mqtt(topic, payload)
    return {"status": "success", "message": "Trigger map command sent"}

@router.post("/save_map")
def send_save_map_command(cmd: SaveMapCommand):
    """Signals the SLAM system to commit and save the current map."""
    topic = f"amr/{cmd.robot_id}/cmd/save_map"
    payload = {
        "robot_id": cmd.robot_id,
        "timestamp": time.time(),
        "data": {
            "map_name": cmd.map_name
        }
    }
    publish_mqtt(topic, payload)
    return {"status": "success", "message": "Save map command sent"}
