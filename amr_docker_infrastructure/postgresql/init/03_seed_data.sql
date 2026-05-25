-- Seed initial robot (update robot_id to match Jetson config)
INSERT INTO robots (robot_id, name, description, status)
VALUES ('amr_001', 'AMR Robot 1', 'Main autonomous mapping robot', 'offline')
ON CONFLICT (robot_id) DO NOTHING;
