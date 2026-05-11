# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /app

# CPU 전용 PyTorch 먼저 설치 (GPU 빌드 대비 이미지 크기 ~5x 작음)
RUN pip install --no-cache-dir \
        torch==2.4.1+cpu \
        torchvision==0.19.1+cpu \
        --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py model.py best_model.pth ./

# Cloud Run은 PORT 환경변수를 주입함 (기본 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
