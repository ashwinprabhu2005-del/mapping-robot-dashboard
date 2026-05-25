-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_robots_robot_id ON robots(robot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_robot_id ON slam_sessions(robot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON slam_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_maps_robot_id ON maps(robot_id);
CREATE INDEX IF NOT EXISTS idx_maps_created_at ON maps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zones_map_id ON zones(map_id);
CREATE INDEX IF NOT EXISTS idx_zones_robot_id ON zones(robot_id);
CREATE INDEX IF NOT EXISTS idx_events_robot_id ON robot_events(robot_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON robot_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON robot_events(event_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at ON map_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON map_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_commands_robot_id ON command_history(robot_id);
