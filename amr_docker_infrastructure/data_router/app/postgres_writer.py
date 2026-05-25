import asyncpg
import json
import logging
import datetime

class PostgresWriter:
    def __init__(self, host, port, database, username, password):
        self.dsn = f"postgresql://{username}:{password}@{host}:{port}/{database}"
        self.pool = None
        self.logger = logging.getLogger("PostgresWriter")
    
    async def connect(self):
        """Establish connections pool to PostgreSQL database."""
        try:
            self.pool = await asyncpg.create_pool(self.dsn, min_size=2, max_size=10)
            self.logger.info("✅ Connected to PostgreSQL database pool")
        except Exception as e:
            self.logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            raise e
            
    async def execute(self, query, *args):
        if not self.pool:
            raise RuntimeError("Database pool not connected")
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)
            
    async def fetch(self, query, *args):
        if not self.pool:
            raise RuntimeError("Database pool not connected")
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def get_active_session(self, robot_id):
        """Fetch or create active SLAM session ID for a robot."""
        rows = await self.fetch(
            "SELECT id FROM slam_sessions WHERE robot_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            robot_id
        )
        if rows:
            return rows[0]['id']
            
        # Register new session if none are active
        await self.execute(
            "INSERT INTO slam_sessions (robot_id, session_name, status) VALUES ($1, $2, $3)",
            robot_id, "Default Auto Session", "active"
        )
        rows = await self.fetch(
            "SELECT id FROM slam_sessions WHERE robot_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            robot_id
        )
        return rows[0]['id']

    async def write_map_snapshot(self, robot_id, timestamp, data):
        """Inserts periodic occupancy grid snapshots."""
        try:
            info = data.get('info', {})
            resolution = info.get('resolution', 0.05)
            width = info.get('width', 0)
            height = info.get('height', 0)
            grid_data = data.get('data', [])
            
            dt = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc)
            session_id = await self.get_active_session(robot_id)
            
            await self.execute(
                """INSERT INTO map_snapshots 
                   (robot_id, session_id, captured_at, resolution, width, height, map_data)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                robot_id, session_id, dt, resolution, width, height, json.dumps(grid_data)
            )
            self.logger.info(f"Saved OccupancyGrid snapshot for '{robot_id}' ({width}x{height})")
        except Exception as e:
            self.logger.error(f"Failed to save map snapshot: {e}")

    async def write_heartbeat(self, robot_id, timestamp, data):
        """Updates robot registry with system load and timestamps."""
        try:
            dt = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc)
            status = data.get('status', 'running')
            
            # Upsert active robot
            await self.execute(
                """INSERT INTO robots (robot_id, name, status, last_seen, config)
                   VALUES ($1, $1, $2, $3, $4)
                   ON CONFLICT (robot_id) 
                   DO UPDATE SET status = $2, last_seen = $3, config = $4""",
                robot_id, status, dt, json.dumps(data)
            )
        except Exception as e:
            self.logger.error(f"Failed to record robot heartbeat: {e}")
            
    async def write_event(self, robot_id, timestamp, event_type, message, level="info", x=0.0, y=0.0, event_data=None):
        """Records telemetry alerts and events to log."""
        try:
            dt = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc)
            session_id = await self.get_active_session(robot_id)
            data_json = json.dumps(event_data or {})
            
            await self.execute(
                """INSERT INTO robot_events 
                   (robot_id, session_id, event_type, event_level, message, position_x, position_y, occurred_at, data)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                robot_id, session_id, event_type, level, message, float(x), float(y), dt, data_json
            )
        except Exception as e:
            self.logger.error(f"Failed to write event log: {e}")
