from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import get_db
import json

router = APIRouter()

@router.get("")
def list_robots(db: Session = Depends(get_db)):
    """List all registered robots."""
    result = db.execute(text("SELECT id, robot_id, name, description, created_at, last_seen, status, config FROM robots"))
    robots = []
    for r in result:
        r_dict = dict(r._mapping)
        if isinstance(r_dict['config'], str):
            r_dict['config'] = json.loads(r_dict['config'])
        robots.append(r_dict)
    return robots

@router.get("/{robot_id}")
def get_robot(robot_id: str, db: Session = Depends(get_db)):
    """Get robot metadata by robot_id."""
    result = db.execute(
        text("SELECT id, robot_id, name, description, created_at, last_seen, status, config FROM robots WHERE robot_id = :robot_id"),
        {"robot_id": robot_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    r_dict = dict(result._mapping)
    if isinstance(r_dict['config'], str):
        r_dict['config'] = json.loads(r_dict['config'])
    return r_dict

@router.get("/{robot_id}/status")
def get_robot_status(robot_id: str, db: Session = Depends(get_db)):
    """Get simple uptime status of robot."""
    result = db.execute(
        text("SELECT status, last_seen FROM robots WHERE robot_id = :robot_id"),
        {"robot_id": robot_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Robot not found")
    return dict(result._mapping)
