from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import get_db
from ..models.schemas import MapCreate
import json

router = APIRouter()

@router.get("")
def list_maps(db: Session = Depends(get_db)):
    """List metadata for all saved maps."""
    result = db.execute(text("SELECT id, robot_id, session_id, name, created_at, file_path, file_size_bytes, resolution_m, width_cells, height_cells, origin_x, origin_y, is_active FROM maps ORDER BY created_at DESC"))
    return [dict(r._mapping) for r in result]

@router.get("/{map_id}")
def get_map(map_id: int, db: Session = Depends(get_db)):
    """Get full OccupancyGrid coordinate layout for a specific map."""
    result = db.execute(
        text("SELECT id, robot_id, session_id, name, created_at, resolution_m, width_cells, height_cells, origin_x, origin_y, map_data, is_active FROM maps WHERE id = :map_id"),
        {"map_id": map_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Map not found")
    
    r_dict = dict(result._mapping)
    if isinstance(r_dict['map_data'], str):
        r_dict['map_data'] = json.loads(r_dict['map_data'])
    elif isinstance(r_dict['map_data'], dict):
        pass # Already dictionary
    return r_dict

@router.post("")
def save_map(map_in: MapCreate, db: Session = Depends(get_db)):
    """Store a newly compiled occupancy grid from a mapping session."""
    session_id = map_in.session_id
    if not session_id:
        session_row = db.execute(
            text("SELECT id FROM slam_sessions WHERE robot_id = :robot_id AND status = 'active' ORDER BY started_at DESC LIMIT 1"),
            {"robot_id": map_in.robot_id}
        ).fetchone()
        if session_row:
            session_id = session_row[0]
            
    # Disable previously active maps for this robot
    db.execute(text("UPDATE maps SET is_active = FALSE WHERE robot_id = :robot_id"), {"robot_id": map_in.robot_id})
    
    query = """INSERT INTO maps 
               (robot_id, session_id, name, resolution_m, width_cells, height_cells, origin_x, origin_y, map_data, is_active)
               VALUES (:robot_id, :session_id, :name, :resolution_m, :width_cells, :height_cells, :origin_x, :origin_y, :map_data, :is_active)
               RETURNING id"""
    
    params = {
        "robot_id": map_in.robot_id,
        "session_id": session_id,
        "name": map_in.name,
        "resolution_m": map_in.resolution_m,
        "width_cells": map_in.width_cells,
        "height_cells": map_in.height_cells,
        "origin_x": map_in.origin_x,
        "origin_y": map_in.origin_y,
        "map_data": json.dumps(map_in.map_data),
        "is_active": True
    }
    
    new_id = db.execute(text(query), params).fetchone()[0]
    db.commit()
    return {"id": new_id, "status": "success", "message": "Map saved successfully"}

@router.delete("/{map_id}")
def delete_map(map_id: int, db: Session = Depends(get_db)):
    """Deletes a map record from PostgreSQL."""
    db.execute(text("DELETE FROM maps WHERE id = :map_id"), {"map_id": map_id})
    db.commit()
    return {"status": "success", "message": f"Map {map_id} deleted successfully"}

@router.get("/{map_id}/thumbnail")
def get_map_thumbnail(map_id: int):
    """Serve a placeholder 1x1 green transparent PNG."""
    dummy_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\xbc\x02\x00\x00\x9a\x00\x97\x11\r\x7f\x15\x00\x00\x00\x00IEND\xaeB`\x82'
    return Response(content=dummy_png, media_type="image/png")
