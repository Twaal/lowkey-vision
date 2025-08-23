# Cell Object Detection

Code for running and training a cell object detection model for brightfield 
microscopy images using YOLO/tensorflow.

If you use this code, please cite: https://doi.org/10.1371/journal.pone.0291625

Code based on: https://github.com/pythonlessons/TensorFlow-2.x-YOLOv3

## Running the app

The model can be applied to a directory of images with a PyQt5 application 
that you can run using the following command: ``python app.py``

To run model predictions without using a GUI, you can use the script 
``image_detection.py``.

## Installation

### Running on CPU

Before running the app or training the model, make sure that you have installed 
all necessary requirements. Install the anaconda environment with:

```conda env create -f cell-counter-env```

Don't forget to activate the environment afterwards.

### Running on GPU

To use tensorflow on a GPU, you will need to also install CUDA, with:
``conda install -c anaconda --force-reinstall tensorflow-gpu==2.3.0``.
Also, you will need to configure the training code by setting, at the top of ``train.py``
and ``app.py``:

```python
# os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Uncomment to use CPU
os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'  # Uncomment to use GPU
```

This will only work for GPUs on which you can run CUDA 10.1 or higher;
you can check the compatibility of your GPU at https://en.wikipedia.org/wiki/CUDA#GPUs_supported.

## Training

In order to train the model, you first have to prepare an annotated dataset. 
The program [labelimg](https://anaconda.org/conda-forge/labelimg) can be 
used to annotate your dataset. Make sure that 
you have separate folders for the training and testing dataset; also make sure
that the files have all been rescaled to the correct size before annotating
(you can use ``model_data/datasets/ImageRescaler.py`` for this). 

LabelImg will save these annotations as an ``*.xml`` file (Voc type). These files
cannot be used for the actual training by YOLO. They can be converted by running 
``python utils/VocToYolo.py`` from the repo root directory. Three files will be 
generated which can be found in the subfolder ``model_data/``, called

-	cells_test.txt
-	cells_train.txt
-	cells_names.txt

If you want to train from the original yolo v3/v4 weights, download the
weights and put them in the `model_data/` folder. We used the `yolov4.weights`
for our most successful model. The original yolo weights can be found at:

```
https://pjreddie.com/media/files/yolov3.weights
https://pjreddie.com/media/files/yolov3-tiny.weights
https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v3_optimal/yolov4.weights
https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights
```

Now we can perform the actual training by running ``python train.py``.
All training parameters are set in ``yolovlib/configs.py``.
Your custom model will be saved in the folder ``checkpoints/``.

The results of the training can be accessed 
through tensorboard, using the command ``tensorboard –-logdir=log``.
