import torch
import torch.nn as nn
from torchvision import models

def get_model(num_classes=2, pretrained=True, model_type="large"):
    """
    모바일넷v3(MobileNetV3) 기반 이미지 분류 모델
    model_type: 'large' 또는 'small'
    """
    if model_type == "large":
        weights = models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
        model = models.mobilenet_v3_large(weights=weights)
        in_features = model.classifier[3].in_features
        model.classifier[3] = nn.Linear(in_features, num_classes)
    elif model_type == "small":
        weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        model = models.mobilenet_v3_small(weights=weights)
        in_features = model.classifier[3].in_features
        model.classifier[3] = nn.Linear(in_features, num_classes)
    else:
        raise ValueError("model_type은 'large' 또는 'small'이어야 합니다.")
        
    return model
