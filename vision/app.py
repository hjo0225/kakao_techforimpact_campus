
"""
2-Stage pipeline:
  1. SSDLite320-MobileNetV3 (COCO pretrained) - object detection
     → filters: bottle(44), wine glass(46), cup(47), bowl(51)
  2. MobileNetV3 (fine-tuned) - binary classification
     → class 0: Reusable / class 1: Single-use
  Fallback: if no container detected, classify the whole image.
"""
import io
import os
 
import torch
import torchvision.models.detection as detection
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import transforms
 
from model import get_model
 
 
app = FastAPI(title="용기낼깡 Vision API", version="1.0")
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# ── Device ──────────────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[boot] using device: {device}")
 
# ── 1. Binary classifier (fine-tuned MobileNetV3) ───────────────────────────
classifier = get_model(num_classes=2, pretrained=False)
 
weights_path = os.environ.get("MODEL_WEIGHTS_PATH", "best_model.pth")
try:
    classifier.load_state_dict(torch.load(weights_path, map_location=device))
    print(f"[boot] classifier weights loaded from {weights_path}")
except FileNotFoundError as exc:
    raise RuntimeError(f"model weights file missing: {weights_path}") from exc
 
classifier = classifier.to(device)
classifier.eval()
 
# ── 2. Object detector (COCO pretrained SSDLite) ────────────────────────────
print("[boot] loading object detection model...")
try:
    _det_weights = detection.SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
    det_model = detection.ssdlite320_mobilenet_v3_large(weights=_det_weights)
except AttributeError:
    det_model = detection.ssdlite320_mobilenet_v3_large(pretrained=True)
 
det_model = det_model.to(device)
det_model.eval()
print("[boot] object detection model loaded.")
 
# COCO label IDs for container-like objects
TARGET_LABELS = {44, 46, 47, 51}  # bottle, wine glass, cup, bowl
COCO_NAMES = {44: "bottle", 46: "wine glass", 47: "cup", 51: "bowl"}
DETECTION_THRESHOLD = 0.3
 
# ── Transforms ──────────────────────────────────────────────────────────────
classifier_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)
det_transform = transforms.ToTensor()
 
 
# ── Helpers ──────────────────────────────────────────────────────────────────
def _classify(pil_img: Image.Image) -> tuple[int, float]:
    """Run binary classifier on a PIL image. Returns (class_idx, confidence%)."""
    tensor = classifier_transform(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = classifier(tensor)
        probs = torch.nn.functional.softmax(outputs, dim=1)
        _, predicted = torch.max(outputs, 1)
        class_idx = int(predicted.item())
        confidence = float(probs[0][class_idx].item() * 100)
    return class_idx, confidence
 
 
def _detect_containers(pil_img: Image.Image) -> list[dict]:
    """Run SSDLite detector and return filtered container boxes."""
    img_tensor = det_transform(pil_img).to(device)
    with torch.no_grad():
        result = det_model([img_tensor])[0]
 
    boxes = result["boxes"].cpu()
    labels = result["labels"].cpu()
    scores = result["scores"].cpu()
 
    valid = []
    for i, score in enumerate(scores):
        label = int(labels[i])
        if score >= DETECTION_THRESHOLD and label in TARGET_LABELS:
            xmin, ymin, xmax, ymax = map(int, boxes[i].tolist())
            valid.append(
                {
                    "label": label,
                    "label_name": COCO_NAMES[label],
                    "box": (
                        max(0, xmin),
                        max(0, ymin),
                        min(pil_img.width, xmax),
                        min(pil_img.height, ymax),
                    ),
                    "det_score": float(score),
                }
            )
    return valid
 
 
# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}
 
 
@app.post("/verify-reusable")
async def verify_reusable(image: UploadFile = File(...)):
    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="empty image payload")
 
    try:
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"invalid image: {exc}") from exc
 
    # 1단계: 객체 탐지
    containers = _detect_containers(pil_img)
 
    if containers:
        # 탐지된 객체 중 가장 det_score가 높은 것 하나만 사용
        best = max(containers, key=lambda x: x["det_score"])
        cropped = pil_img.crop(best["box"])
        class_idx, confidence = _classify(cropped)
        detected_label = best["label_name"]
        fallback = False
    else:
        # 폴백: 이미지 전체 분류
        class_idx, confidence = _classify(pil_img)
        detected_label = None
        fallback = True
 
    return {
        "isReusable": class_idx == 0,
        "classIndex": class_idx,
        "confidence": confidence
    }