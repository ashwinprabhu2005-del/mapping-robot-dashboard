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

let amrProcess = null;
let isShuttingDown = false;
let lastHeartbeat = Date.now();
let watchdogInterval = null;

const cleanAllRosProcesses = () => {
    console.log("Forcefully sweeping all remaining ROS and Gazebo processes...");
    try {
        spawn('bash', ['-c', 'pkill -9 -f "ros2|rtabmap|launch_manager|amr_launch|gzserver|gzclient|rviz2|nav2"'], {
            stdio: 'ignore',
            detached: true
        });
    } catch (e) {
        console.error("Error executing pkill sweep:", e);
    }
};

app.post('/api/launch', (req, res) => {
    const startLaunch = () => {
        console.log('Starting depth_camera_only.launch.py...');
        const workspaceSetup = path.join(__dirname, 'install', 'setup.bash');
        amrProcess = spawn('bash', ['-c', `source /opt/ros/humble/setup.bash && source ${workspaceSetup} && ros2 launch amr_data_publisher depth_camera_only.launch.py`], {
            stdio: 'inherit',
            detached: true
        });

        amrProcess.on('error', (err) => {
            console.error('Failed to start subprocess.', err);
        });

        amrProcess.on('exit', (code, signal) => {
            console.log(`AMR process exited with code ${code} and signal ${signal}`);
            amrProcess = null;
            isShuttingDown = false;
            if (watchdogInterval) {
                clearInterval(watchdogInterval);
                watchdogInterval = null;
            }
            cleanAllRosProcesses();
        });

        lastHeartbeat = Date.now();
        watchdogInterval = setInterval(() => {
            if (amrProcess && !isShuttingDown && (Date.now() - lastHeartbeat > 6000)) {
                console.log("No heartbeat received for 6 seconds. Tab was likely closed. Stopping ROS launch...");
                isShuttingDown = true;
                try {
                    process.kill(-amrProcess.pid, 'SIGINT');
                } catch (e) {}
                setTimeout(cleanAllRosProcesses, 6000); // safety fallback to let RealSense release USB
            }
        }, 2000);

        res.json({ success: true, message: 'Launch started successfully' });
    };

    if (amrProcess) {
        if (isShuttingDown) {
            console.log("Waiting for previous process to shut down before relaunching...");
            // Poll until it's dead
            const checkInterval = setInterval(() => {
                if (!amrProcess) {
                    clearInterval(checkInterval);
                    startLaunch();
                }
            }, 500);
            return;
        } else {
            return res.status(200).json({ success: true, message: 'AMR launch is already running' });
        }
    } else {
        startLaunch();
    }
});

app.post('/api/stop_launch', (req, res) => {
    if (amrProcess && !isShuttingDown) {
        console.log('Stopping ROS launch via manual stop request...');
        isShuttingDown = true;
        try {
            process.kill(-amrProcess.pid, 'SIGINT');
        } catch (e) {
            console.error("Error killing process:", e);
        }
        setTimeout(cleanAllRosProcesses, 6000); // Clean up 6s after SIGINT to let RealSense release USB
    } else {
        cleanAllRosProcesses(); // if not running, still do a safety sweep
    }
    res.json({ success: true });
});

app.post('/api/heartbeat', (req, res) => {
    lastHeartbeat = Date.now();
    res.json({ success: true });
});

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
