import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// --- Process handles ---
let cameraProcess = null;     // depth camera + rosbridge + web_video_server
let mappingProcess = null;    // rtabmap + odometry + mqtt (started on demand)
let isShuttingDownCamera = false;
let isShuttingDownMapping = false;
let lastHeartbeat = Date.now();
let watchdogInterval = null;

const workspaceSetup = path.join(__dirname, 'install', 'setup.bash');

// Kill all ROS/mapping processes forcefully
const cleanAllRosProcesses = () => {
    console.log("Forcefully sweeping all remaining ROS processes...");
    try {
        spawn('bash', ['-c', 'pkill -9 -f "ros2|rtabmap|launch_manager|amr_launch|gzserver|gzclient|rviz2|nav2|realsense|rosbridge|web_video|mqtt"'], {
            stdio: 'ignore',
            detached: true
        });
    } catch (e) {
        console.error("Error executing pkill sweep:", e);
    }
};

// Kill only SLAM/mapping processes, leave camera and rosbridge running
const cleanMappingProcesses = () => {
    console.log("Sweeping mapping processes (rtabmap, mqtt)...");
    try {
        spawn('bash', ['-c', 'pkill -9 -f "rtabmap|mqtt_publisher"'], {
            stdio: 'ignore',
            detached: true
        });
    } catch (e) {
        console.error("Error executing mapping pkill:", e);
    }
};

// ─── /api/launch — called on LOGIN ───────────────────────────────────────────
// Starts: RealSense camera + rosbridge + web_video_server ONLY
app.post('/api/launch', (req, res) => {
    const startCamera = () => {
        console.log('LOGIN: Sweeping old processes and starting depth_camera_only.launch.py...');
        cleanAllRosProcesses();
        
        // Give 1.5 seconds for port release and cleanup before spawning
        setTimeout(() => {
            cameraProcess = spawn('bash', ['-c',
                `source /opt/ros/humble/setup.bash && source ${workspaceSetup} && ros2 launch amr_data_publisher depth_camera_only.launch.py`
            ], { stdio: 'inherit', detached: true });

            cameraProcess.on('error', (err) => console.error('Camera process error:', err));
            cameraProcess.on('exit', (code, signal) => {
                console.log(`Camera process exited (code=${code}, signal=${signal})`);
                cameraProcess = null;
                isShuttingDownCamera = false;
                if (watchdogInterval) { clearInterval(watchdogInterval); watchdogInterval = null; }
                cleanAllRosProcesses();
            });

            // Watchdog: if heartbeat stops (tab closed), kill camera after 6s
            lastHeartbeat = Date.now();
            watchdogInterval = setInterval(() => {
                if (cameraProcess && !isShuttingDownCamera && (Date.now() - lastHeartbeat > 6000)) {
                    console.log("No heartbeat for 6s. Stopping camera launch...");
                    isShuttingDownCamera = true;
                    // Also stop mapping if running
                    if (mappingProcess && !isShuttingDownMapping) {
                        isShuttingDownMapping = true;
                        try { process.kill(-mappingProcess.pid, 'SIGINT'); } catch (e) {}
                    }
                    try { process.kill(-cameraProcess.pid, 'SIGINT'); } catch (e) {}
                    setTimeout(cleanAllRosProcesses, 6000);
                }
            }, 2000);

            res.json({ success: true, message: 'Camera launch started' });
        }, 1500);
    };

    if (cameraProcess) {
        if (isShuttingDownCamera) {
            const check = setInterval(() => {
                if (!cameraProcess) { clearInterval(check); startCamera(); }
            }, 500);
        } else {
            return res.status(200).json({ success: true, message: 'Camera already running' });
        }
    } else {
        startCamera();
    }
});

// ─── /api/start_mapping — called on "Start Mapping" button ───────────────────
// Starts: rtabmap + rgbd_odometry + mqtt_publisher
app.post('/api/start_mapping', (req, res) => {
    if (mappingProcess && !isShuttingDownMapping) {
        return res.status(200).json({ success: true, message: 'Mapping already running' });
    }

    const startMapping = () => {
        console.log('START MAPPING: Launching mapping.launch.py...');
        mappingProcess = spawn('bash', ['-c',
            `source /opt/ros/humble/setup.bash && source ${workspaceSetup} && ros2 launch amr_data_publisher mapping.launch.py`
        ], { stdio: 'inherit', detached: true });

        mappingProcess.on('error', (err) => console.error('Mapping process error:', err));
        mappingProcess.on('exit', (code, signal) => {
            console.log(`Mapping process exited (code=${code}, signal=${signal})`);
            mappingProcess = null;
            isShuttingDownMapping = false;
            cleanMappingProcesses();
        });

        res.json({ success: true, message: 'Mapping started' });
    };

    if (mappingProcess && isShuttingDownMapping) {
        const check = setInterval(() => {
            if (!mappingProcess) { clearInterval(check); startMapping(); }
        }, 500);
    } else {
        startMapping();
    }
});

// ─── /api/stop_mapping — called on "Finish Mapping" button ───────────────────
// Stops: rtabmap + rgbd_odometry + mqtt — camera + rosbridge keep running
app.post('/api/stop_mapping', (req, res) => {
    if (mappingProcess && !isShuttingDownMapping) {
        console.log('FINISH MAPPING: Stopping mapping processes...');
        isShuttingDownMapping = true;
        try { process.kill(-mappingProcess.pid, 'SIGINT'); } catch (e) {}
        setTimeout(cleanMappingProcesses, 4000);
    } else {
        cleanMappingProcesses(); // safety sweep even if already dead
    }
    res.json({ success: true, message: 'Mapping stopped' });
});

// ─── /api/stop_launch — called on LOGOUT ─────────────────────────────────────
// Stops everything: camera, rosbridge, web_video_server, and any mapping nodes
app.post('/api/stop_launch', (req, res) => {
    console.log('LOGOUT: Stopping all processes...');

    // Stop mapping first if running
    if (mappingProcess && !isShuttingDownMapping) {
        isShuttingDownMapping = true;
        try { process.kill(-mappingProcess.pid, 'SIGINT'); } catch (e) {}
    }

    // Stop camera
    if (cameraProcess && !isShuttingDownCamera) {
        isShuttingDownCamera = true;
        try { process.kill(-cameraProcess.pid, 'SIGINT'); } catch (e) {}
    }

    // Full sweep after 6s to release USB
    setTimeout(cleanAllRosProcesses, 6000);
    res.json({ success: true, message: 'All processes stopped' });
});

// ─── /api/heartbeat — sent periodically by dashboard to keep watchdog alive ──
app.post('/api/heartbeat', (req, res) => {
    lastHeartbeat = Date.now();
    res.json({ success: true });
});

// Catchall: serve React app for any unmatched route
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
