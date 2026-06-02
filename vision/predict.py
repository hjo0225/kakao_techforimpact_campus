import sys
import torch
from torchvision import transforms
from PIL import Image
from model import get_model
import torchvision.models.detection as detection

def get_detection_model():
    try:
        from torchvision.models.detection import SSDLite320_MobileNet_V3_Large_Weights
        weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
        model = detection.ssdlite320_mobilenet_v3_large(weights=weights)
    except ImportError:
        model = detection.ssdlite320_mobilenet_v3_large(pretrained=True)
    return model

def predict(image_path):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # 1. 2-Stage 모델 로드
    # (1) 분류 모델 (MobileNetV3)
    classifier_model = get_model(num_classes=2, pretrained=False)
    has_weights = True
    try:
        classifier_model.load_state_dict(torch.load('best_model.pth', map_location=device))
        print("[SUCCESS] Classifier model weights (best_model.pth) loaded.")
    except (FileNotFoundError, RuntimeError) as e:
        print(f"[WARNING] Could not load 'best_model.pth': {e}")
        print("Using initial weights for classification.")
        has_weights = False
        
    classifier_model = classifier_model.to(device)
    classifier_model.eval()
    
    # (2) 사전 학습된 객체 탐지 모델 (SSD Lite MobileNetV3)
    print("Loading object detection model...")
    det_model = get_detection_model().to(device)
    det_model.eval()
    print("[SUCCESS] Object detection model loaded.")

    # 2. 이미지 로드
    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"[ERROR] Could not load image: {e}")
        return

    # 3. 전처리 정의
    # (1) 분류용 전처리
    classifier_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])
    # (2) 탐지용 전처리 (ToTensor만 수행)
    det_transform = transforms.ToTensor()

    # 4. 1단계: 객체 탐지 (Detection)
    img_det_tensor = det_transform(img).to(device)
    with torch.no_grad():
        # 디텍션 모델은 배치 입력을 기대하므로 리스트로 전달
        detections = det_model([img_det_tensor])[0]

    # COCO 클래스 중 용기류 필터링 (44: bottle, 46: wine glass, 47: cup, 51: bowl)
    target_labels = {44, 46, 47, 51}
    coco_names = {44: "bottle(병)", 46: "wine glass(와인잔)", 47: "cup(컵)", 51: "bowl(그릇)"}
    
    valid_boxes = []
    valid_labels = []
    
    scores = detections['scores'].cpu()
    labels = detections['labels'].cpu()
    boxes = detections['boxes'].cpu()
    
    for idx, score in enumerate(scores):
        if score > 0.3 and int(labels[idx]) in target_labels:
            valid_boxes.append(boxes[idx].tolist())
            valid_labels.append(int(labels[idx]))

    # 5. 2단계: 크롭 및 분류 (Crop & Classification)
    print("\n=== AI Analysis Results ===")
    print(f"Input image: {image_path}")

    if len(valid_boxes) > 0:
        print(f"Total {len(valid_boxes)} container objects detected.")
        
        for i, box in enumerate(valid_boxes):
            xmin, ymin, xmax, ymax = map(int, box)
            # 바운딩 박스 크롭 (안전을 위해 음수 좌표 방지 및 이미지 경계 초과 방지)
            xmin = max(0, xmin)
            ymin = max(0, ymin)
            xmax = min(img.width, xmax)
            ymax = min(img.height, ymax)
            
            cropped_img = img.crop((xmin, ymin, xmax, ymax))
            
            # 분류 예측
            cropped_tensor = classifier_transform(cropped_img).unsqueeze(0).to(device)
            with torch.no_grad():
                outputs = classifier_model(cropped_tensor)
                probs = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, 1)
                class_idx = predicted.item()
                
            class_name = "[Reusable (다회용기)]" if class_idx == 0 else "[Single-Use (일회용기)]"
            detected_type = coco_names.get(valid_labels[i], "container")
            
            print(f"\n[Object #{i+1} - {detected_type}]")
            print(f"  Coordinates: xmin={xmin}, ymin={ymin}, xmax={xmax}, ymax={ymax}")
            print(f"  AI Decision: {class_name}")
            print(f"  Confidence : {confidence.item() * 100:.2f}%")
    else:
        print("[WARNING] No container objects detected. Falling back to whole image classification.")
        # 폴백: 이미지 전체에 대해 분류 적용
        img_tensor = classifier_transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = classifier_model(img_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probs, 1)
            class_idx = predicted.item()
            
        class_name = "[Reusable (다회용기)]" if class_idx == 0 else "[Single-Use (일회용기)]"
        print(f"  AI Decision: {class_name}")
        print(f"  Confidence : {confidence.item() * 100:.2f}%")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python predict.py [테스트할_이미지_경로.jpg]")
    else:
        predict(sys.argv[1])
