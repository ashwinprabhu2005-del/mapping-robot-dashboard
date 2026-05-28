from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load the YOLO11x Segmentation model for ultra-high accuracy
print("Loading YOLO11x-seg (Extra Large) Segmentation model...")
try:
    model = YOLO('yolo11x-seg.pt')
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")

@app.route('/api/detect', methods=['POST'])
def detect_objects():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
            
        # Extract base64 string
        base64_str = data['image']
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
            
        # Decode image
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Get optional confidence threshold from request, default to 0.15
        conf_threshold = data.get('conf', 0.15)
        
        # Define COCO classes: 
        # 0: person, 13: bench (tv stand base), 32: sports ball (red ball), 
        # 56: chair, 57: couch (sofa), 60: dining table (tv stand top), 62: tv,
        # 73: bookcase (cupboard/cabinets), 74: vase, 39: bottle
        target_classes = [0, 13, 32, 56, 57, 60, 62, 73, 74, 39]

        # Run inference with YOLOv8x-seg model, RESTRICTED to target classes
        results = model(image, conf=conf_threshold, classes=target_classes)
        
        # Parse results
        detections = []
        for r in results:
            boxes = r.boxes
            for i, box in enumerate(boxes):
                # Get bounding box coordinates [x1, y1, x2, y2]
                b = box.xyxy[0].tolist()
                # Get class confidence
                c = box.conf[0].item()
                # Get class name
                cls = int(box.cls[0].item())
                name = model.names[cls]
                
                det = {
                    'class': name,
                    'confidence': c,
                    'box': [b[0], b[1], b[2], b[3]]
                }
                
                if r.masks is not None:
                    # Get polygon boundary for the mask (normalized 0-1)
                    polygon = r.masks.xyn[i].tolist()
                    det['polygon'] = polygon
                
                detections.append(det)
                
        return jsonify({
            'success': True,
            'detections': detections,
            'width': image.width,
            'height': image.height
        })
    except Exception as e:
        print(f"Error during detection: {e}")
        return jsonify({'error': str(e)}), 500

def point_in_polygon(x, y, poly):
    n = len(poly)
    inside = False
    if n == 0:
        return False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

@app.route('/api/detect_click', methods=['POST'])
def detect_click():
    try:
        data = request.json
        if 'image' not in data or 'click_x' not in data or 'click_y' not in data:
            return jsonify({'error': 'Missing required parameters'}), 400
            
        base64_str = data['image']
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
            
        click_x = data['click_x'] # 0.0 to 1.0 (normalized)
        click_y = data['click_y'] # 0.0 to 1.0 (normalized)
        conf_threshold = data.get('conf', 0.15)
        
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        img_w, img_h = image.width, image.height
        
        target_classes = [0, 13, 32, 56, 57, 60, 62, 73, 74, 39]
        results = model(image, conf=conf_threshold, classes=target_classes)
        
        best_match = None
        min_dist = float('inf')
        
        # We want to find the detection whose segment mask contains the click point,
        # or the one whose bounding box contains the click point.
        for r in results:
            if r.masks is not None:
                for i, mask_n in enumerate(r.masks.xyn):
                    # Check if normalized coordinates contain click_x, click_y
                    is_inside = point_in_polygon(click_x, click_y, mask_n)
                    
                    box = r.boxes[i]
                    b = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    c = box.conf[0].item()
                    cls = int(box.cls[0].item())
                    name = model.names[cls]
                    
                    if is_inside:
                        best_match = {
                            'class': name,
                            'confidence': c,
                            'box': b,
                            'polygon': mask_n
                        }
                        break
                        
            # Fallback to bounding box containment if no mask match found
            if best_match is None:
                for i, box in enumerate(r.boxes):
                    b = box.xyxy[0].tolist()
                    bx1 = b[0] / img_w
                    by1 = b[1] / img_h
                    bx2 = b[2] / img_w
                    by2 = b[3] / img_h
                    if bx1 <= click_x <= bx2 and by1 <= click_y <= by2:
                        c = box.conf[0].item()
                        cls = int(box.cls[0].item())
                        name = model.names[cls]
                        polygon = r.masks.xyn[i].tolist() if r.masks is not None else []
                        best_match = {
                            'class': name,
                            'confidence': c,
                            'box': b,
                            'polygon': polygon
                        }
                        break
                        
            # Secondary fallback: find closest detection box center to click
            if best_match is None:
                for i, box in enumerate(r.boxes):
                    b = box.xyxy[0].tolist()
                    cx = ((b[0] + b[2]) / 2) / img_w
                    cy = ((b[1] + b[3]) / 2) / img_h
                    dist = np.sqrt((cx - click_x)**2 + (cy - click_y)**2)
                    if dist < min_dist:
                        min_dist = dist
                        c = box.conf[0].item()
                        cls = int(box.cls[0].item())
                        name = model.names[cls]
                        polygon = r.masks.xyn[i].tolist() if r.masks is not None else []
                        best_match = {
                            'class': name,
                            'confidence': c,
                            'box': b,
                            'polygon': polygon
                        }
                        
        if best_match:
            return jsonify({
                'success': True,
                'detection': best_match,
                'width': img_w,
                'height': img_h
            })
        else:
            return jsonify({'success': False, 'error': 'No objects detected near click.'})
            
    except Exception as e:
        print(f"Error during click detection: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
