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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
