import numpy as np
import cv2
from inference_unet import predict_mask

# Create two different test images
test_image1 = np.zeros((400, 400, 3), dtype=np.uint8)
cv2.circle(test_image1, (200, 200), 50, (255, 255, 255), -1)

test_image2 = np.zeros((400, 400, 3), dtype=np.uint8)
cv2.rectangle(test_image2, (150, 150), (250, 250), (255, 255, 255), -1)

# Test both images
mask1 = predict_mask(test_image1)
mask2 = predict_mask(test_image2)

# Save results
cv2.imwrite("test_mask1.png", mask1)
cv2.imwrite("test_mask2.png", mask2)

# Verify masks are different
difference = np.sum(np.abs(mask1 - mask2))
print(f"Difference between masks: {difference}")