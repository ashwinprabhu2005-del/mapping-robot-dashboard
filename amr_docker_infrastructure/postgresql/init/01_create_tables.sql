-- AMR Database Schema
-- ==========================================

-- Robot registry
CREATE TABLE IF NOT EXISTS robots (
    id              SERIAL PRIMARY KEY,
    robot_id        VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen       TIMESTAMP WITH TIME ZONE,
    status          VARCHAR(20) DEFAULT 'offline',
    config          JSONB DEFAULT '{}'
);

-- SLAM mapping sessions
CREATE TABLE IF NOT EXISTS slam_sessions (
    id              SERIAL PRIMARY KEY,
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    session_name    VARCHAR(200),
    started_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at        TIMESTAMP WITH TIME ZONE,
    duration_sec    INTEGER,
    keyframes       INTEGER DEFAULT 0,
    loop_closures   INTEGER DEFAULT 0,
    map_quality     FLOAT,
    status          VARCHAR(20) DEFAULT 'active',
    notes           TEXT,
    metadata        JSONB DEFAULT '{}'
);

-- Saved maps
CREATE TABLE IF NOT EXISTS maps (
    id              SERIAL PRIMARY KEY,
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    session_id      INTEGER REFERENCES slam_sessions(id),
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_path       VARCHAR(500),
    file_size_bytes BIGINT,
    resolution_m    FLOAT,
    width_cells     INTEGER,
    height_cells    INTEGER,
    origin_x        FLOAT,
    origin_y        FLOAT,
    map_data        JSONB,           -- OccupancyGrid data
    thumbnail       BYTEA,           -- PNG thumbnail
    tags            TEXT[],
    is_active       BOOLEAN DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}'
);

-- Point cloud snapshots
CREATE TABLE IF NOT EXISTS pointcloud_snapshots (
    id              SERIAL PRIMARY KEY,
    map_id          INTEGER REFERENCES maps(id),
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    captured_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    point_count     INTEGER,
    bounding_box    JSONB,           -- min/max x,y,z
    data_path       VARCHAR(500),    -- path to .pcd file
    file_size_bytes BIGINT
);

-- Annotated zones
CREATE TABLE IF NOT EXISTS zones (
    id              SERIAL PRIMARY KEY,
    map_id          INTEGER REFERENCES maps(id),
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    name            VARCHAR(200) NOT NULL,
    zone_type       VARCHAR(50) NOT NULL,  -- room/corridor/restricted/equipment
    color           VARCHAR(20),
    position        JSONB NOT NULL,        -- x, y, z
    dimensions      JSONB NOT NULL,        -- width, height, depth
    rotation        JSONB,                 -- quaternion
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      VARCHAR(100),
    notes           TEXT,
    properties      JSONB DEFAULT '{}'
);

-- Robot events log
CREATE TABLE IF NOT EXISTS robot_events (
    id              SERIAL PRIMARY KEY,
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    session_id      INTEGER REFERENCES slam_sessions(id),
    event_type      VARCHAR(100) NOT NULL,
    event_level     VARCHAR(20) DEFAULT 'info',  -- info/warning/error/critical
    message         TEXT,
    position_x      FLOAT,
    position_y      FLOAT,
    occurred_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data            JSONB DEFAULT '{}'
);

-- Map snapshots (periodic saves during mapping)
CREATE TABLE IF NOT EXISTS map_snapshots (
    id              SERIAL PRIMARY KEY,
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    session_id      INTEGER REFERENCES slam_sessions(id),
    captured_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolution      FLOAT,
    width           INTEGER,
    height          INTEGER,
    map_data        JSONB
);

-- Command history
CREATE TABLE IF NOT EXISTS command_history (
    id              SERIAL PRIMARY KEY,
    robot_id        VARCHAR(50) REFERENCES robots(robot_id),
    command_type    VARCHAR(100) NOT NULL,
    command_data    JSONB,
    issued_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issued_by       VARCHAR(100) DEFAULT 'dashboard',
    executed        BOOLEAN DEFAULT FALSE,
    result          TEXT
);
