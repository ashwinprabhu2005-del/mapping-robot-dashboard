import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'

const killSimulationPlugin = () => ({
  name: 'kill-simulation',
  configureServer(server) {
    server.middlewares.use('/api/stop_launch', (req, res) => {
      if (req.method === 'POST') {
        console.log('Logout Triggered: Forcefully sweeping all remaining ROS and Gazebo processes...');
        try {
          spawn('bash', ['-c', 'pkill -9 -f "ros2|rtabmap|launch_manager|amr_launch|gzserver|gzclient|rviz2|nav2|magic_run_simulation.sh|robot_state_publisher|tf2_web_republisher|rosbridge_server|web_video_server"'], {
            stdio: 'ignore',
            detached: true
          });
        } catch (e) {
          console.error("Error executing pkill sweep:", e);
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
        
        // Optionally, close vite server too if they truly want to stop EVERYTHING.
        // But usually we just kill the ROS simulation in the background so it's a clean slate.
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), killSimulationPlugin()],
})
