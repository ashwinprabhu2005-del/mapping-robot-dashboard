import numpy as np
from sensor_msgs.msg import PointCloud2, PointField
try:
    from sensor_msgs_py import point_cloud2
except ImportError:
    # Fallback if sensor_msgs_py is not present on standard python environment
    point_cloud2 = None

class PointCloudEncoder:
    
    @staticmethod
    def downsample_and_filter(msg: PointCloud2, max_points=50000, voxel_size=0.05) -> PointCloud2:
        """Downsamples a PointCloud2 message using voxelization and size limits."""
        if not point_cloud2:
            return msg
            
        try:
            fields = [f.name for f in msg.fields]
            has_rgb = 'rgb' in fields
            
            field_names = ["x", "y", "z"]
            if has_rgb:
                field_names.append("rgb")
                
            # Read points from message
            points = list(point_cloud2.read_points(msg, field_names=field_names, skip_nans=True))
            if not points:
                return msg
                
            pts_arr = np.array(points, dtype=np.float32)
            
            # Voxel grid downsampling
            if voxel_size > 0 and len(pts_arr) > 0:
                coords = (pts_arr[:, :3] / voxel_size).astype(int)
                # Group coordinates by voxel index and take unique coordinates
                _, idxs = np.unique(coords, axis=0, return_index=True)
                pts_arr = pts_arr[idxs]
                
            # Random downsampling or stepping if limit is still exceeded
            if len(pts_arr) > max_points:
                step = len(pts_arr) // max_points
                pts_arr = pts_arr[::step][:max_points]
                
            # Reconstruct points
            new_points = [tuple(p) for p in pts_arr]
            
            # Declare PointCloud2 Fields
            new_fields = [
                PointField(name='x', offset=0, datatype=PointField.FLOAT32, count=1),
                PointField(name='y', offset=4, datatype=PointField.FLOAT32, count=1),
                PointField(name='z', offset=8, datatype=PointField.FLOAT32, count=1)
            ]
            if has_rgb:
                new_fields.append(PointField(name='rgb', offset=12, datatype=PointField.FLOAT32, count=1))
                
            return point_cloud2.create_cloud(msg.header, new_fields, new_points)
            
        except Exception as e:
            print(f"[PointCloudEncoder] Error during downsampling: {e}")
            return msg
