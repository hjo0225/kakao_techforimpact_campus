"""Vision API for reusable/single-use container classification.

This service keeps the response contract expected by the NestJS backend:
POST /verify-reusable -> {isReusable, classIndex, confidence}
"""
import io
import os

import torch
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

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = get_model(num_classes=2, pretrained=False)

weights_path = os.environ.get("MODEL_WEIGHTS_PATH", "best_model.pth")
try:
    model.load_state_dict(torch.load(weights_path, map_location=device))
    print(f"[boot] model weights loaded from {weights_path}")
except FileNotFoundError as exc:
    raise RuntimeError(f"model weights file missing: {weights_path}") from exc

model = model.to(device)
model.eval()

transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


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

    tensor_img = transform(pil_img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor_img)
        probs = torch.nn.functional.softmax(outputs, dim=1)
        _, predicted = torch.max(outputs, 1)
        class_idx = int(predicted.item())
        confidence = float(probs[0][class_idx].item() * 100)

    return {
        "isReusable": class_idx == 0,
        "classIndex": class_idx,
        "confidence": confidence,
    }
