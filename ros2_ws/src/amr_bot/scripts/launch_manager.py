#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_srvs.srv import Trigger
import subprocess
import os
import signal

class LaunchManager(Node):
    def __init__(self):
        super().__init__('launch_manager')
        self.srv_start = self.create_service(Trigger, 'start_mapping', self.start_mapping_callback)
        self.srv_stop = self.create_service(Trigger, 'stop_mapping', self.stop_mapping_callback)
        self.mapping_process = None

    def start_mapping_callback(self, request, response):
        if self.mapping_process is not None:
            # Check if it's actually running
            if self.mapping_process.poll() is None:
                response.success = False
                response.message = 'Mapping is already running'
                return response

        # Command to launch the mapping
        self.get_logger().info('Starting mapping launch file...')
        cmd = ['ros2', 'launch', 'amr_bot', 'rtabmap_mapping.launch.py']
        self.mapping_process = subprocess.Popen(cmd, preexec_fn=os.setsid)
        
        response.success = True
        response.message = 'Mapping started successfully'
        return response

    def stop_mapping_callback(self, request, response):
        # If process already died on its own (e.g. crash), still return success
        # so the dashboard can reset its state correctly.
        if self.mapping_process is None or self.mapping_process.poll() is not None:
            self.get_logger().info('Mapping was not running (already stopped). Returning success.')
            self.mapping_process = None
            response.success = True
            response.message = 'Mapping was already stopped'
            return response

        self.get_logger().info('Stopping mapping launch file...')
        try:
            os.killpg(os.getpgid(self.mapping_process.pid), signal.SIGINT)
            self.mapping_process.wait(timeout=10.0)
        except subprocess.TimeoutExpired:
            self.get_logger().warn('Timeout waiting for mapping to stop, sending SIGKILL')
            try:
                os.killpg(os.getpgid(self.mapping_process.pid), signal.SIGKILL)
                self.mapping_process.wait()
            except Exception as e:
                self.get_logger().error(f'SIGKILL failed: {e}')
        except Exception as e:
            self.get_logger().error(f'Error stopping process: {e}')
        finally:
            self.mapping_process = None

        response.success = True
        response.message = 'Mapping stopped successfully'
        return response

def main(args=None):
    rclpy.init(args=args)
    node = LaunchManager()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
