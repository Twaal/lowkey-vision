
# YOLO options
YOLO_TYPE                   = "yolov4"  # yolov4 or yolov3
YOLO_FRAMEWORK              = "tf"
YOLO_V3_WEIGHTS             = "model_data/yolov3.weights"
YOLO_V4_WEIGHTS             = "model_data/yolov4.weights"
#YOLO_V3_TINY_WEIGHTS        = "model_data/yolov3-tiny.weights"
#YOLO_V4_TINY_WEIGHTS        = "model_data/yolov4-tiny.weights"
YOLO_TRT_QUANTIZE_MODE      = "INT8"
YOLO_COCO_CLASSES           = "model_data/coco.names"
YOLO_STRIDES                = [8, 16, 32]
YOLO_IOU_LOSS_THRESH        = 0.2
YOLO_ANCHOR_PER_SCALE       = 3
YOLO_MAX_BBOX_PER_SCALE     = 300
YOLO_INPUT_SIZE             = 608
if YOLO_TYPE                == "yolov4":
    YOLO_ANCHORS            = [[[12,   16], [19,   36], [40,   28]],
                               [[36,   75], [76,   55], [72,  146]],
                               [[142, 110], [192, 243], [459, 401]]]
if YOLO_TYPE                == "yolov3":
    YOLO_ANCHORS            = [[[10,   13], [16,   30], [33,   23]],
                               [[30,   61], [62,   45], [59,  119]],
                               [[116,  90], [156, 198], [373, 326]]]
# Train options
TRAIN_YOLO_TINY             = False
TRAIN_SAVE_BEST_ONLY        = True  # Saves only best model according validation loss (True recommended).
TRAIN_SAVE_CHECKPOINT       = False  # Saves all best validated checkpoints in training process (False recommended).
TRAIN_CLASSES               = "./model_data/cells_names.txt"
TRAIN_ANNOT_PATH            = "./model_data/cells_train.txt"
TRAIN_LOGDIR                = "log/model4"  # Make sure 'log/' already exists for logging.
TRAIN_CHECKPOINTS_FOLDER    = "checkpoints"
TRAIN_MODEL_NAME            = f"{YOLO_TYPE}_model4"
TRAIN_LOAD_IMAGES_TO_RAM    = True  # With True faster training, but need more RAM.
TRAIN_BATCH_SIZE            = 2
TRAIN_INPUT_SIZE            = 608
TRAIN_DATA_AUG              = True
TRAIN_TRANSFER              = True
TRAIN_FROM_CHECKPOINT       = False  # Set to True to start training from TRAIN_MODEL_NAME checkpoint
TRAIN_LR_INIT               = 2e-4
TRAIN_LR_END                = 1e-6
TRAIN_WARMUP_EPOCHS         = 2
TRAIN_EPOCHS                = 100

# TEST options
TEST_ANNOT_PATH             = "./model_data/cells_test.txt"
TEST_BATCH_SIZE             = 2
TEST_INPUT_SIZE             = 608
TEST_DATA_AUG               = True
TEST_DECTECTED_IMAGE_PATH   = ""
TEST_SCORE_THRESHOLD        = 0.4
TEST_IOU_THRESHOLD          = 0.3

if TRAIN_YOLO_TINY:
    YOLO_STRIDES            = [16, 32]
    YOLO_ANCHORS            = [[[10, 14],  [23, 27],   [37, 58]],
                               [[81,  82], [135, 169], [344, 319]]]
