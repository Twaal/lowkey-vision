import torch
import numpy as np
import cv2
from unet_model import get_unet_model

# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
device = torch.device("cpu")
print(f"Inference device: {device}")
model = get_unet_model(in_channels=1, out_classes=1)

checkpoint = torch.load("models/checkpoints/unet_model_7_2_epoch44.pth", map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])

# model.load_state_dict(torch.load("tumor-segmentation/models/checkpoints/unet_model_7_1_epoch1.pth", map_location=device, weights_only=True))
model.to(device)
model.eval()

def preprocess(img: np.ndarray, resize_shape=(512, 512)) -> torch.Tensor:
    # Convert to grayscale (if input is color)
    if img.ndim == 3 and img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img = img.astype(np.float32)

    # # Log transform to compress dynamic range
    # img = np.log1p(img)

    # # Z-score normalization
    # img = (img - img.mean()) / (img.std() + 1e-5)

    # Resize if specified
    if resize_shape:
        target_h, target_w = resize_shape
        img = cv2.resize(img, (target_h, target_w), interpolation=cv2.INTER_AREA)

    # Add channel and batch dims: (1, 1, H, W)
    img = np.expand_dims(img, axis=0)
    img = np.expand_dims(img, axis=0)

    tensor = torch.tensor(img, dtype=torch.float32).to(device)
    return tensor

def postprocess(pred: torch.Tensor, target_size: tuple) -> np.ndarray:
    # Get prediction mask
    pred_np = pred.squeeze().cpu().numpy()
    
    # Resize to original image size
    pred_resized = cv2.resize(pred_np, (target_size[1], target_size[0]), interpolation=cv2.INTER_LINEAR)
    
    # Create binary mask
    binary_mask = (pred_resized > 0.5).astype(np.uint8)
    
    # Clean up small artifacts
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
    min_size = 5
    cleaned_mask = np.zeros_like(binary_mask)
    
    # Keep only significant regions
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_size:
            cleaned_mask[labels == i] = 1
    
    # Create RGB mask with red for tumor regions
    mask_rgb = np.zeros((target_size[0], target_size[1], 3), dtype=np.uint8)
    mask_rgb[cleaned_mask == 1] = [0, 0, 255]  # Red color for tumor regions
    
    return mask_rgb


def predict(img: np.ndarray) -> np.ndarray:
    original_size = img.shape[:2]  # (height, width)
    input_tensor = preprocess(img)
    with torch.no_grad():
        output = model(input_tensor)
    return postprocess(output, original_size)
