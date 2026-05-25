from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Robot registry schemas
class RobotBase(BaseModel):
    robot_id: str
    name: str
    description: Optional[str] = None
    status: Optional[str] = 'offline'

class Robot(RobotBase):
    id: int
    created_at: datetime
    last_seen: Optional[datetime] = None
    config: Dict[str, Any] = {}

    class Config:
        from_attributes = True

# Saved Map schemas
class MapBase(BaseModel):
    robot_id: str
    name: str
    resolution_m: float
    width_cells: int
    height_cells: int
    origin_x: float
    origin_y: float
    map_data: Dict[str, Any]  # OccupancyGrid values

class MapCreate(MapBase):
    session_id: Optional[int] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None

class Map(MapBase):
    id: int
    created_at: datetime
    is_active: bool
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True

# Annotated Zone schemas
class ZoneBase(BaseModel):
    map_id: Optional[int] = None
    robot_id: str
    name: str
    zone_type: str  # room/corridor/restricted/equipment
    color: Optional[str] = None
    position: Dict[str, float]      # {'x': ..., 'y': ..., 'z': ...}
    dimensions: Dict[str, float]    # {'width': ..., 'height': ..., 'depth': ...}
    rotation: Optional[Dict[str, float]] = None # {'x': ..., 'y': ..., 'z': ..., 'w': ...}
    notes: Optional[str] = None
    properties: Dict[str, Any] = {}

class ZoneCreate(ZoneBase):
    created_by: Optional[str] = 'dashboard'

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    zone_type: Optional[str] = None
    color: Optional[str] = None
    position: Optional[Dict[str, float]] = None
    dimensions: Optional[Dict[str, float]] = None
    rotation: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None

class Zone(ZoneBase):
    id: int
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True

# Robot commands schemas
class VelocityCommand(BaseModel):
    robot_id: str
    linear_x: float
    angular_z: float

class TriggerMapCommand(BaseModel):
    robot_id: str

class SaveMapCommand(BaseModel):
    robot_id: str
    map_name: str
