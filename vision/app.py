"""CleanBallTrio Vision API — 다회용기/일회용기 분류.

업스트림 NestJS 백엔드가 호출하는 단일 책임 서비스.
- POST /verify-reusable  이미지 업로드 → {isReusable, classIndex, confidence}
- GET  /healthz          헬스체크
"""
import io
import os
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms
from PIL import Image

from model import get_model

app = FastAPI(title="CleanBallTrio Vision API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = get_model(num_classes=2, pretrained=False)

WEIGHTS_PATH = os.environ.get("MODEL_WEIGHTS_PATH", "best_model.pth")
try:
    model.load_state_dict(torch.load(WEIGHTS_PATH, map_location=device))
    print(f"[boot] model weights loaded from {WEIGHTS_PATH}")
except FileNotFoundError as e:
    raise RuntimeError(f"model weights file missing: {WEIGHTS_PATH}") from e

model = model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


@app.get("/health")
def health():
    # NOTE: /healthz는 Google 프런트엔드(Cloud Run GFE)에 의해 가로채여 404 응답이
    # 반환됨. /health 로 우회.
    return {"status": "ok"}


@app.post("/verify-reusable")
async def verify_reusable(image: UploadFile = File(...)):
    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="empty image payload")
    try:
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid image: {e}")

    tensor_img = transform(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(tensor_img)
        probs = torch.nn.functional.softmax(outputs, dim=1)
        _, predicted = torch.max(outputs, 1)
        class_idx = int(predicted.item())
        # train.py 기준: 알파벳순으로 'reusable'=0, 'single_use'=1
        is_reusable = class_idx == 0
        confidence = float(probs[0][class_idx].item() * 100)

    return {
        "isReusable": is_reusable,
        "classIndex": class_idx,
        "confidence": confidence,
    }
