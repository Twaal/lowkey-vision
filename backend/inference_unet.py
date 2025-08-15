import torch
import numpy as np
import cv2
import os
import time
from unet_model import get_unet_model

# Initialize model (CPU only)
device = torch.device("cpu")
model = get_unet_model(in_channels=1, out_classes=1)

# Load weights
model_path = "models/checkpoints/unet_model_7_2_epoch45.pth"
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model weights not found at {model_path}")

# Load weights with verification
print("Loading checkpoint from:", model_path)
checkpoint = torch.load(model_path, map_location=device)
print("\nCheckpoint contents:", checkpoint.keys())

# Verify model state before loading weights
# print("\nInitial model parameters:")
# for name, param in model.named_parameters():
#     print(f"{name}: mean={param.mean().item():.3f}, std={param.std().item():.3f}")

# Load checkpoint and extract model state dict
model.load_state_dict(checkpoint['model_state_dict'])

# Verify model state after loading weights
print("\nModel parameters after loading:")
for name, param in model.named_parameters():
    print(f"{name}: mean={param.mean().item():.3f}, std={param.std().item():.3f}")

model.eval()  # Make sure it's in eval mode
print("Model mode after eval():", model.training)

def predict_mask(image: np.ndarray) -> np.ndarray:
    # Clear CUDA cache if available
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # Force model to eval mode for each prediction
    model.eval()
    
    # Generate unique debug directory for each run
    timestamp = int(time.time())
    debug_dir = f"debug_images/run_{timestamp}"
    os.makedirs(debug_dir, exist_ok=True)

    # Debug: Print input image shape and save original
    print(f"Input image shape: {image.shape}")
    cv2.imwrite(os.path.join(debug_dir, "1_input_image.png"), image)
    
    # Preprocess and save each step
    img = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cv2.imwrite(os.path.join(debug_dir, "2_grayscale.png"), img)
    
    img = cv2.resize(img, (512, 512))
    cv2.imwrite(os.path.join(debug_dir, "3_resized.png"), img)
    
    img = img / 255.0
    img_normalized = (img * 255).astype(np.uint8)  # For visualization
    cv2.imwrite(os.path.join(debug_dir, "4_normalized.png"), img_normalized)
    
    img = torch.from_numpy(img).float()
    img = img.unsqueeze(0).unsqueeze(0)  # Add batch and channel dims
    print(f"Model input tensor shape: {img.shape}")
    
    # Add input normalization check
    print(f"Input value range: {img.min():.3f} to {img.max():.3f}")
    
    # Inference with value debugging
    with torch.no_grad():
        pred = model(img)
        print(f"Raw prediction shape: {pred.shape}")
        print(f"Raw prediction range: {pred.min().item():.3f} to {pred.max().item():.3f}")
        
        # Add histogram of predictions
        pred_np = pred.squeeze().numpy()
        hist, bins = np.histogram(pred_np, bins=20)
        # print("Prediction histogram:")
        # for i in range(len(hist)):
        #     print(f"  {bins[i]:.2f} to {bins[i+1]:.2f}: {hist[i]}")
            
        pred = torch.sigmoid(pred)
        print(f"After sigmoid range: {pred.min().item():.3f} to {pred.max().item():.3f}")
        
        mask = (pred > 0.5).float()
        print(f"After threshold range: {mask.min().item():.3f} to {mask.max().item():.3f}")
    
    # Postprocess with value checks
    mask = mask.squeeze().numpy()
    print(f"Numpy mask range: {mask.min():.3f} to {mask.max():.3f}")
    
    mask = (mask * 255).astype(np.uint8)
    cv2.imwrite(os.path.join(debug_dir, "5_raw_mask.png"), mask)
    
    mask = cv2.resize(mask, (image.shape[1], image.shape[0]))
    cv2.imwrite(os.path.join(debug_dir, "6_final_mask.png"), mask)
    
    return mask
