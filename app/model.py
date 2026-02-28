from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path


# Model name for auto-download
MODEL_NAME = "yolov8n.pt"


class TrafficAIModel:
    def __init__(self):
        self.model = YOLO(MODEL_NAME)
        self.model.to("cpu")  # Force CPU to save memory

        # CO₂ emission rates in g/min per vehicle class (COCO class IDs)
        self.emission_rates = {
            2: 69,    # car
            3: 15,    # motorcycle
            5: 350,   # bus
            7: 400    # truck
        }

    def analyze(self, image):
        # Use smaller imgsz (640 instead of 1024) to reduce RAM usage during inference
        results = self.model(image, imgsz=640, conf=0.15, verbose=False)

        total_vehicles = 0
        total_co2 = 0
        vehicle_breakdown = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0}
        class_names = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            if cls_id in self.emission_rates:
                total_vehicles += 1
                total_co2 += self.emission_rates[cls_id]
                vehicle_breakdown[class_names[cls_id]] += 1

        green_time = min(120, max(15, int(3 + total_vehicles * 2.5)))
        energy_score = max(15, 100 - total_vehicles * 4)

        # Determine congestion level
        if total_vehicles == 0:
            status = "CLEAR"
        elif total_vehicles <= 5:
            status = "NORMAL"
        elif total_vehicles <= 15:
            status = "MODERATE"
        else:
            status = "CONGESTED"

        return {
            "vehicles_detected": total_vehicles,
            "co2_rate_g_per_min": total_co2,
            "green_signal_time_seconds": green_time,
            "energy_score_percent": energy_score,
            "system_status": status,
            "vehicle_breakdown": vehicle_breakdown
        }
