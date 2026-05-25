#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import argparse
import struct
import math

def read_sqlite_metadata(base_dir):
    metadata = {
        "name": "Unknown",
        "date": "Unknown",
        "station": "Unknown",
        "pointCount": 0,
        "boundingBox": {"minX": 0, "minY": 0, "minZ": 0, "maxX": 0, "maxY": 0, "maxZ": 0}
    }
    layers = [
        {"id": 0, "name": "Unclassified", "color": [255, 255, 255], "active": True}
    ]
    
    # Try reading trwlayer.lay for classification colors
    lay_path = os.path.join(base_dir, "trwlayer.lay")
    if os.path.exists(lay_path):
        try:
            conn = sqlite3.connect(lay_path)
            c = conn.cursor()
            c.execute("SELECT ID, NAME, RED, GREEN, BLUE FROM LAYER")
            layers = []
            for row in c.fetchall():
                layers.append({
                    "id": row[0],
                    "name": row[1] if row[1] else f"Layer {row[0]}",
                    "color": [row[2], row[3], row[4]],
                    "active": True
                })
            conn.close()
        except Exception as e:
            print(f"Warning: Could not read layers from {lay_path}: {e}")

    # Try reading Database.dmt for metadata
    dmt_path = os.path.join(base_dir, "Database.dmt")
    if os.path.exists(dmt_path):
        try:
            conn = sqlite3.connect(dmt_path)
            c = conn.cursor()
            # Find the main model/entity
            c.execute("SELECT NAME FROM ENTITY WHERE TYPE = 'STATION' OR TYPE = 'PROJECT' LIMIT 1")
            row = c.fetchone()
            if row:
                metadata["name"] = row[0]
            conn.close()
        except Exception as e:
            print(f"Warning: Could not read metadata from {dmt_path}: {e}")

    # Try reading trwdb.db1 for bounding box
    db1_path = os.path.join(base_dir, "trwdb.db1")
    if os.path.exists(db1_path):
        try:
            conn = sqlite3.connect(db1_path)
            c = conn.cursor()
            c.execute("SELECT CENTERX, CENTERY, CENTERZ, XHALFLENGTH, YHALFLENGTH, ZHALFLENGTH FROM LIMITBOX LIMIT 1")
            row = c.fetchone()
            if row:
                cx, cy, cz, hx, hy, hz = row
                metadata["boundingBox"] = {
                    "minX": cx - hx, "maxX": cx + hx,
                    "minY": cy - hy, "maxY": cy + hy,
                    "minZ": cz - hz, "maxZ": cz + hz
                }
            conn.close()
        except Exception as e:
            print(f"Warning: Could not read bounds from {db1_path}: {e}")

    return metadata, layers

def extract_points_from_las(las_file, downsample_limit=500000):
    try:
        import laspy
        import numpy as np
    except ImportError:
        print("Error: laspy and numpy are required to read LAS files. Run: pip install laspy numpy")
        return None

    try:
        las = laspy.read(las_file)
        
        # Downsample if needed
        total_points = len(las.points)
        print(f"Found {total_points} points in LAS.")
        
        step = max(1, total_points // downsample_limit)
        
        points = {
            "x": (las.x[::step]).tolist(),
            "y": (las.y[::step]).tolist(),
            "z": (las.z[::step]).tolist(),
        }
        
        # Extract colors if available
        if hasattr(las, 'red') and hasattr(las, 'green') and hasattr(las, 'blue'):
            # LAS colors are often 16-bit, normalize to 8-bit
            points["r"] = (np.array(las.red[::step]) >> 8).tolist()
            points["g"] = (np.array(las.green[::step]) >> 8).tolist()
            points["b"] = (np.array(las.blue[::step]) >> 8).tolist()
            
        return points
    except Exception as e:
        print(f"Failed to read LAS with laspy: {e}")
        return None

def extract_points_from_rwcx(rwcx_file, downsample_limit=500000):
    print("Attempting to extract points from .rwcx...")
    
    # Attempt 1: Open3D
    try:
        import open3d as o3d
        import numpy as np
        print("Trying Open3D...")
        pcd = o3d.io.read_point_cloud(rwcx_file)
        if len(pcd.points) > 0:
            print("Successfully read with Open3D.")
            points_array = np.asarray(pcd.points)
            step = max(1, len(points_array) // downsample_limit)
            points_dict = {
                "x": points_array[::step, 0].tolist(),
                "y": points_array[::step, 1].tolist(),
                "z": points_array[::step, 2].tolist(),
            }
            if pcd.has_colors():
                colors_array = np.asarray(pcd.colors) * 255.0
                points_dict["r"] = colors_array[::step, 0].astype(int).tolist()
                points_dict["g"] = colors_array[::step, 1].astype(int).tolist()
                points_dict["b"] = colors_array[::step, 2].astype(int).tolist()
            return points_dict
    except Exception as e:
        print(f"Open3D approach failed: {e}")

    # Attempt 2: laspy (some rwcx are renamed laz/las)
    points = extract_points_from_las(rwcx_file, downsample_limit)
    if points and len(points["x"]) > 0:
        return points

    # Attempt 3: Brute-force binary float scanning
    print("Falling back to brute-force binary extraction...")
    try:
        x_list, y_list, z_list = [], [], []
        with open(rwcx_file, 'rb') as f:
            data = f.read()
        
        # Scan for sequences of 3 floats
        # This is a very rough heuristic
        offset = 0
        while offset < len(data) - 12:
            try:
                x, y, z = struct.unpack_from('<fff', data, offset)
                # Check for reasonable bounds (-1000 to +1000)
                if not math.isnan(x) and not math.isinf(x) and -1000 < x < 1000 and \
                   not math.isnan(y) and not math.isinf(y) and -1000 < y < 1000 and \
                   not math.isnan(z) and not math.isinf(z) and -50 < z < 50:
                    x_list.append(x)
                    y_list.append(y)
                    z_list.append(z)
                    offset += 12 # Skip to next point
                else:
                    offset += 1 # Advance by 1 byte to find next valid alignment
            except struct.error:
                break

        total_points = len(x_list)
        if total_points > 0:
            print(f"Brute-force found {total_points} potential points.")
            step = max(1, total_points // downsample_limit)
            return {
                "x": x_list[::step],
                "y": y_list[::step],
                "z": z_list[::step]
            }
    except Exception as e:
        print(f"Brute-force extraction failed: {e}")

    print("Error: Could not extract points from .rwcx file. Please export to LAS from RealWorks.")
    return None

def main():
    parser = argparse.ArgumentParser(description="Convert Trimble RealWorks or LAS scans to JSON for the dashboard.")
    parser.add_argument("--rwcx", help="Path to .rwcx scan file")
    parser.add_argument("--las", help="Path to .las or .laz scan file")
    parser.add_argument("--output", required=True, help="Path to output museum_scan.json file")
    
    args = parser.parse_args()

    if not args.rwcx and not args.las:
        print("Error: Must provide either --rwcx or --las")
        sys.exit(1)

    input_file = args.rwcx if args.rwcx else args.las
    base_dir = os.path.dirname(os.path.abspath(input_file))
    
    print(f"Reading metadata from databases in {base_dir}...")
    metadata, layers = read_sqlite_metadata(base_dir)

    print("Reading scan points...")
    if args.rwcx:
        metadata["station"] = os.path.basename(args.rwcx).split(".")[0]
        points = extract_points_from_rwcx(args.rwcx)
    else:
        metadata["station"] = os.path.basename(args.las).split(".")[0]
        points = extract_points_from_las(args.las)

    if not points:
        sys.exit(1)

    metadata["pointCount"] = len(points["x"])
    
    output_data = {
        "metadata": metadata,
        "layers": layers,
        "points": points
    }

    print(f"Writing {len(points['x'])} points to {args.output}...")
    with open(args.output, 'w') as f:
        json.dump(output_data, f)
        
    print(f"Done! Run the dashboard and load {args.output}")

if __name__ == "__main__":
    main()
