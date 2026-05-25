from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import get_db
from ..models.schemas import ZoneCreate, ZoneUpdate
from typing import Optional
import json

router = APIRouter()

@router.get("")
def list_zones(map_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List annotated zones, filtered by map_id if provided."""
    if map_id:
        result = db.execute(
            text("SELECT id, map_id, robot_id, name, zone_type, color, position, dimensions, rotation, created_at, created_by, notes, properties FROM zones WHERE map_id = :map_id"),
            {"map_id": map_id}
        )
    else:
        result = db.execute(text("SELECT id, map_id, robot_id, name, zone_type, color, position, dimensions, rotation, created_at, created_by, notes, properties FROM zones"))
        
    zones = []
    for r in result:
        z_dict = dict(r._mapping)
        z_dict['position'] = json.loads(z_dict['position']) if isinstance(z_dict['position'], str) else z_dict['position']
        z_dict['dimensions'] = json.loads(z_dict['dimensions']) if isinstance(z_dict['dimensions'], str) else z_dict['dimensions']
        if z_dict['rotation']:
            z_dict['rotation'] = json.loads(z_dict['rotation']) if isinstance(z_dict['rotation'], str) else z_dict['rotation']
        z_dict['properties'] = json.loads(z_dict['properties']) if isinstance(z_dict['properties'], str) else z_dict['properties']
        zones.append(z_dict)
    return zones

@router.post("")
def create_zone(zone_in: ZoneCreate, db: Session = Depends(get_db)):
    """Add a new annotated zone to PostgreSQL."""
    query = """INSERT INTO zones 
               (map_id, robot_id, name, zone_type, color, position, dimensions, rotation, created_by, notes, properties)
               VALUES (:map_id, :robot_id, :name, :zone_type, :color, :position, :dimensions, :rotation, :created_by, :notes, :properties)
               RETURNING id"""
               
    params = {
        "map_id": zone_in.map_id,
        "robot_id": zone_in.robot_id,
        "name": zone_in.name,
        "zone_type": zone_in.zone_type,
        "color": zone_in.color,
        "position": json.dumps(zone_in.position),
        "dimensions": json.dumps(zone_in.dimensions),
        "rotation": json.dumps(zone_in.rotation) if zone_in.rotation else None,
        "created_by": zone_in.created_by,
        "notes": zone_in.notes,
        "properties": json.dumps(zone_in.properties)
    }
    
    new_id = db.execute(text(query), params).fetchone()[0]
    db.commit()
    return {"id": new_id, "status": "success", "message": "Zone created successfully"}

@router.put("/{zone_id}")
def update_zone(zone_id: int, zone_in: ZoneUpdate, db: Session = Depends(get_db)):
    """Modifies coordinates or metadata for an existing zone."""
    update_fields = []
    params = {"zone_id": zone_id}
    
    for field, value in zone_in.model_dump(exclude_unset=True).items():
        if value is not None:
            if field in ['position', 'dimensions', 'rotation', 'properties']:
                update_fields.append(f"{field} = :{field}")
                params[field] = json.dumps(value)
            else:
                update_fields.append(f"{field} = :{field}")
                params[field] = value
                
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    query = f"UPDATE zones SET {', '.join(update_fields)} WHERE id = :zone_id"
    db.execute(text(query), params)
    db.commit()
    return {"status": "success", "message": f"Zone {zone_id} updated"}

@router.delete("/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    """Deletes a zone definition from PostgreSQL."""
    db.execute(text("DELETE FROM zones WHERE id = :zone_id"), {"zone_id": zone_id})
    db.commit()
    return {"status": "success", "message": f"Zone {zone_id} deleted"}
