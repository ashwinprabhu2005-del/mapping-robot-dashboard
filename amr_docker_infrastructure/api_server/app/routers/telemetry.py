from fastapi import APIRouter, Depends, HTTPException, Query
from ..models.influx import influx_manager
from typing import Optional

router = APIRouter()

@router.get("/position")
def get_position_history(robot_id: str, start: str = "1h"):
    """Query position path trace from InfluxDB."""
    query = f'''
    from(bucket: "amr_data")
      |> range(start: -{start})
      |> filter(fn: (r) => r["_measurement"] == "odometry")
      |> filter(fn: (r) => r["robot_id"] == "{robot_id}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> keep(columns: ["_time", "pos_x", "pos_y", "pos_z", "linear_vel", "angular_vel"])
    '''
    try:
        tables = influx_manager.query(query)
        result = []
        for table in tables:
            for record in table.records:
                result.append({
                    "time": record.get_time().isoformat() if record.get_time() else None,
                    "x": record.values.get("pos_x"),
                    "y": record.values.get("pos_y"),
                    "z": record.values.get("pos_z", 0.0),
                    "linear_vel": record.values.get("linear_vel"),
                    "angular_vel": record.values.get("angular_vel")
                })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"InfluxDB query failed: {e}")

@router.get("/imu")
def get_imu_history(robot_id: str, start: str = "10m"):
    """Query IMU readings for graph plotting."""
    query = f'''
    from(bucket: "amr_data")
      |> range(start: -{start})
      |> filter(fn: (r) => r["_measurement"] == "imu")
      |> filter(fn: (r) => r["robot_id"] == "{robot_id}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    '''
    try:
        tables = influx_manager.query(query)
        result = []
        for table in tables:
            for record in table.records:
                result.append({
                    "time": record.get_time().isoformat() if record.get_time() else None,
                    "accel_x": record.values.get("accel_x"),
                    "accel_y": record.values.get("accel_y"),
                    "accel_z": record.values.get("accel_z"),
                    "gyro_x": record.values.get("gyro_x"),
                    "gyro_y": record.values.get("gyro_y"),
                    "gyro_z": record.values.get("gyro_z")
                })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"InfluxDB query failed: {e}")

@router.get("/battery")
def get_battery_history(robot_id: str, start: str = "24h"):
    """Query battery percentage logs over time."""
    query = f'''
    from(bucket: "amr_data")
      |> range(start: -{start})
      |> filter(fn: (r) => r["_measurement"] == "battery")
      |> filter(fn: (r) => r["robot_id"] == "{robot_id}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    '''
    try:
        tables = influx_manager.query(query)
        result = []
        for table in tables:
            for record in table.records:
                result.append({
                    "time": record.get_time().isoformat() if record.get_time() else None,
                    "voltage": record.values.get("voltage"),
                    "percentage": record.values.get("percentage")
                })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"InfluxDB query failed: {e}")

@router.get("/summary")
def get_telemetry_summary(robot_id: str):
    """Retrieves the latest value of all telemetry metrics."""
    query = f'''
    from(bucket: "amr_data")
      |> range(start: -5m)
      |> filter(fn: (r) => r["robot_id"] == "{robot_id}")
      |> last()
    '''
    try:
        tables = influx_manager.query(query)
        summary = {"robot_id": robot_id}
        for table in tables:
            for record in table.records:
                measurement = record.get_measurement()
                field = record.get_field()
                value = record.get_value()
                if measurement not in summary:
                    summary[measurement] = {}
                summary[measurement][field] = value
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load telemetry summary: {e}")
