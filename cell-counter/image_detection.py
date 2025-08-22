import os
from yololib.yolov3 import Create_Yolov3
from yololib.yolov4 import Create_Yolo
from yololib.utils import detect_image
from yololib.configs import YOLO_INPUT_SIZE, TRAIN_CLASSES, TRAIN_CHECKPOINTS_FOLDER, TRAIN_MODEL_NAME, YOLO_TYPE
from utils.ImageRescaler import rescale_im
import cv2
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

# Set input and other parameters
image_path = "./example/example_image.tif"
image_path_rescaled = "./example/example_image_rescaled.tif"
image_path_labeled = "./example/example_image_labeled.tif"
txt_path_predictions = "./example/predictions.txt"
input_size = YOLO_INPUT_SIZE

# Read image, rescale and save
img = cv2.imread(image_path)
res_img = rescale_im(img)
cv2.imwrite(image_path_rescaled, res_img)

# Run prediction and show result
if YOLO_TYPE == 'yolov3':
    yolo = Create_Yolov3(input_size=input_size, CLASSES=TRAIN_CLASSES)
elif YOLO_TYPE == 'yolov4':
    yolo = Create_Yolo(input_size=input_size, CLASSES=TRAIN_CLASSES)
yolo.load_weights("./"+TRAIN_CHECKPOINTS_FOLDER+"/"+TRAIN_MODEL_NAME)
print(yolo.summary())
detect_image(yolo, image_path_rescaled, image_path_labeled, input_size=input_size, show=True, write=True,
             show_label=False, classes=TRAIN_CLASSES, rectangle_colors='', iou_threshold=0.35, score_threshold=0.4,
             min_bbox_size=150, txt_output_path=txt_path_predictions)
