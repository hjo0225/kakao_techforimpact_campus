import torch
import torch.nn as nn
from torchvision import models

def get_model(num_classes=2, pretrained=True):
    """
    모바일넷(MobileNetV2) 기반 이미지 분류 모델을 가져옵니다.
    비교적 가볍고 빠르기 때문에 모바일/경량 환경에 적합합니다.
    """
    # ImageNet에 사전 훈련된 가중치를 불러옵니다 (학습 속도 및 정확도 향상).
    weights = models.MobileNet_V2_Weights.DEFAULT if pretrained else None
    model = models.mobilenet_v2(weights=weights)
    
    # 모델의 마지막 분류기(classifier) 출력을 일회용기 vs 다회용기 2종류로 변경합니다.
    in_features = model.classifier[1].in_features
    # 재정의: 2개의 클래스 예측을 위한 Linear 레이어
    model.classifier[1] = nn.Linear(in_features, num_classes)
    
    return model
