import json

class DataParser:
    def parse(self, topic: str, payload: str) -> dict:
        """Parses JSON payload and structures it for routing."""
        data = json.loads(payload)
        return {
            'robot_id': data.get('robot_id', 'unknown_robot'),
            'timestamp': float(data.get('timestamp', 0.0)),
            'data': data.get('data', {})
        }
