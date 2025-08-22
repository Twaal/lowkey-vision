from PyQt5 import QtCore
from PyQt5.QtWidgets import QApplication, QMainWindow, QFileDialog, QPushButton, \
                            QDockWidget, QAction, QLineEdit, QLabel, QDialog
from PyQt5.QtGui import QPixmap, QIcon, QImage
from PyQt5.QtCore import Qt
from yololib.yolov3 import Create_Yolov3
from yololib.yolov4 import Create_Yolo
from yololib.utils import run_prediction, filter_bboxes, get_pred_info
from yololib.configs import *
from utils.ImageRescaler import rescale_im
import sys
import shutil
import glob
import cv2
import numpy as np
import pandas as pd
import os
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Uncomment to use CPU
# os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'  # Uncomment to use GPU


IOU_THRESHOLD = 0.3
SCORE_THRESHOLD = 0.4
MIN_BBOX_SIZE = 200


def cvimg_to_qimg(cvimg):
    """Convert opencv image to pyqt image."""
    height, width, channel = cvimg.shape
    bytesperline = 3 * width
    return QImage(cvimg.data, width, height, bytesperline, QImage.Format_RGB888)


class MyWindow(QMainWindow):
    """Cell counter app."""

    def __init__(self):
        super(MyWindow, self).__init__()
        self.setWindowTitle("Cell Detector")
        # self.showMaximized()
        self.resize(1400, 800)
        self.data_dir = ""
        self.image_paths = []
        self.prediction_bboxes = []
        self.labeled_image_paths = []
        self.output_dirs = ["", "", "", ""]
        self.image_id = None
        self.button_width, self.button_height = 110, 110
        self.icon_width, self.icon_height = 90, 90
        self.showing_predictions = False
        
        # Create central image.
        self.central_image = QLabel(self)
        self.central_image.setAlignment(Qt.AlignCenter)
        self.central_image.setText("Image will appear here")
        self.setCentralWidget(self.central_image)

        # Buttons next to the image
        self.button_open = self.add_button(30, self.browse_dir, 'open directory', 'Open.png')
        self.button_prev = self.add_button(160, self.prev_image, 'previous image', 'Prev.png')
        self.button_next = self.add_button(290, self.next_image, 'next image', 'Next.png')
        self.button_pred = self.add_button(420, self.get_predictions, 'run predictions', 'Predictions.png')
        self.button_show = self.add_button(550, self.show_predictions, 'show predictions', 'Show_Prediction.PNG')
        self.button_hide = self.add_button(680, self.hide_predictions, 'hide predictions', 'Undo.PNG')
        self.button_exit = self.add_button(810, self.close, 'open directory', 'Exit.png')

        # Parameter window
        self.dock = QDockWidget("Post-processing parameters")
        self.dock.setMinimumSize(220, 235)
        self.param_score = self.add_param_field(10, "Confidence score threshold (0.0-1.0)", SCORE_THRESHOLD)
        self.param_uoi = self.add_param_field(70, "UoI threshold (0.0-1.0)", IOU_THRESHOLD)
        self.param_bbox_size = self.add_param_field(130, "Bbox size threshold (0-1000)", MIN_BBOX_SIZE)
        button_set_params = QPushButton("Set parameters", self.dock)
        button_set_params.clicked.connect(self.set_params)
        button_set_params.move(10, 190)

        # Initial values.
        self.score_threshold = SCORE_THRESHOLD
        self.iou_threshold = IOU_THRESHOLD
        self.min_bbox_size = MIN_BBOX_SIZE

        # Button to show params window
        menubar = self.menuBar()
        windowmenu = menubar.addMenu('Window')
        open_params_button = QAction('Show parameter window', self)
        open_params_button.setShortcut('ctrl+P')
        open_params_button.triggered.connect(self.show_dock)
        windowmenu.addAction(open_params_button)

    def refresh(self):
        """Refresh image."""
        if self.showing_predictions:
            self.display_prediction_image()
        else:
            self.show_current_image()

    def set_params(self):
        """Set post-prediction score/iou/bbox size parameters."""
        self.score_threshold = float(self.param_score.text())
        self.iou_threshold = float(self.param_uoi.text())
        self.min_bbox_size = float(self.param_bbox_size.text())
        self.process_predictions()

    def show_dock(self):
        """Show dock."""
        # Reset.
        self.dock.setFloating(False)
        self.dock.hide()
        self.dock.setFloating(True)
        self.dock.show()

    def add_button(self, y, func, tooltip, icon):
        """Buttons on the left side of the main window."""
        button = QPushButton(self)
        button.setGeometry(0, y, self.button_width, self.button_height)
        button.clicked.connect(func)
        button.setFlat(True)
        button.setToolTip(tooltip)
        icon_location = os.path.join(os.getcwd(), "appicons", icon)
        icon = QIcon()
        icon.addPixmap(QPixmap(icon_location))
        button.setIcon(icon)
        button.setIconSize(QtCore.QSize(self.icon_width, self.icon_height))
        button.show()
        return button

    def add_param_field(self, y, label, value):
        """Parameter fields in the parameter popup window."""
        label_p = QLabel(label, self.dock)
        label_p.setGeometry(10, y, 200, 20)
        field_p = QLineEdit(str(value), self.dock)
        field_p.setGeometry(10, y + 25, 200, 20)
        return field_p

    def update_image_paths(self):
        """Update list of image paths from a data directory."""
        if self.data_dir != "":
            files = glob.glob(os.path.join(self.data_dir, '*.tif')) + \
                    glob.glob(os.path.join(self.data_dir, '*.tiff'))
            print('Detected files:', files)
            self.image_paths = files
            self.labeled_image_paths = []
            if len(self.image_paths) > 0:
                self.image_id = 0
            else:
                self.reset_central_image()
        else:
            self.reset_central_image()

    def open_current_image(self):
        """Read and convert the current image."""
        image_path = self.image_paths[self.image_id]
        img = cv2.imread(image_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res_img = rescale_im(img)
        return res_img

    def show_current_image(self):
        """Show the current image in self.central_image."""
        if self.images_selected():
            img = self.open_current_image()
            qimg = cvimg_to_qimg(img)
            pixmap = QPixmap.fromImage(qimg)
            self.central_image.setPixmap(pixmap)
        else:
            self.reset_central_image()

    def make_output_dirs(self):
        """Prepare output directories, if they do not exist yet."""
        if self.data_dir != "":
            self.output_dirs[0] = os.path.join(self.data_dir, 'output')
            self.output_dirs[1] = os.path.join(self.data_dir, 'output', 'rescaled_images')
            self.output_dirs[2] = os.path.join(self.data_dir, 'output', 'labeled_images')
            self.output_dirs[3] = os.path.join(self.data_dir, 'output', 'coordinates')
            for output_dir in self.output_dirs:
                _ = os.mkdir(output_dir) if not os.path.exists(output_dir) else False

    def reset_central_image(self):
        """Reset image in self.central_image."""
        self.data_dir = ""
        self.image_paths = []
        self.labeled_image_paths = []
        self.output_dirs = [None, None, None, None]
        self.image_id = None
        self.central_image.setText("Image will appear here")
        self.central_image.setStyleSheet('color: black')

    def show_warning(self, text):
        """Show warning in red."""
        self.central_image.setText(text)
        self.central_image.setStyleSheet('color: red')

    def images_selected(self):
        """Check if images are selected."""
        return self.image_id is not None

    def browse_dir(self):
        """Browse to a directory."""
        data_dir = QFileDialog.getExistingDirectory(self, 'Open Directory', 'c\\')
        if data_dir != "":
            # Read directory and open first image.
            self.data_dir = data_dir
            self.update_image_paths()
            self.show_current_image()
        else:
            self.reset_central_image()

    def prev_image(self):
        """Go to the previous image."""
        if self.images_selected():
            self.image_id = (self.image_id + 1) % len(self.image_paths)
            self.refresh()
        else:
            self.show_warning("No images selected.")

    def next_image(self):
        """Go to the next image."""
        if self.images_selected():
            self.image_id = (self.image_id - 1) % len(self.image_paths)
            self.refresh()
        else:
            self.show_warning("No images selected.")

    def get_predictions(self):
        """Decide to read or run predictions."""
        if not self.images_selected():
            self.show_warning("No images selected.")
        else:

            # Prepare.
            self.make_output_dirs()
            output_path_master_table = os.path.join(self.output_dirs[0], "master_table.csv")

            # Check if previous predictions exist, by checking for master table.
            if os.path.exists(output_path_master_table):
                dlg = QDialog(self)
                dlg.resize(250, 100)
                dlg.setWindowTitle('Existing master table found')
                lbl = QLabel('Read previous predictions from file?', dlg)
                lbl.move(10, 10)
                btn_yes = QPushButton("Yes", dlg)
                btn_no = QPushButton("No", dlg)
                btn_yes.move(10, 50)
                btn_no.move(100, 50)
                btn_yes.clicked.connect(self.read_predictions)
                btn_yes.clicked.connect(dlg.close)
                btn_no.clicked.connect(self.run_predictions)
                btn_no.clicked.connect(dlg.close)
                dlg.exec()
            else:
                print('No master table found.')
                self.run_predictions()

    def read_predictions(self):
        """Read predictions from previous run."""
        self.labeled_image_paths = []
        self.prediction_bboxes = []
        for image_path in self.image_paths:
            file_name = os.path.basename(image_path)
            output_path_raw_predictions = os.path.join(self.output_dirs[3], file_name + "_raw.npy")
            output_path_labeled = os.path.join(self.output_dirs[2], file_name)
            if os.path.exists(output_path_raw_predictions):
                bboxes_raw = np.load(output_path_raw_predictions)
                self.prediction_bboxes.append(bboxes_raw)
            else:
                self.show_warning("Error: some files missing (" + output_path_raw_predictions + ").")
                return
            if os.path.exists(output_path_labeled):
                self.labeled_image_paths.append(output_path_labeled)
            else:
                self.show_warning("Error: some files missing (" + output_path_labeled + ").")
                return
        self.process_predictions()

    def run_predictions(self):
        """Run predictions with YOLO."""
        input_size = YOLO_INPUT_SIZE
        self.labeled_image_paths = []
        self.prediction_bboxes = []
        if YOLO_TYPE == 'yolov3':
            yolo = Create_Yolov3(input_size=input_size, CLASSES=TRAIN_CLASSES)
        elif YOLO_TYPE == 'yolov4':
            yolo = Create_Yolo(input_size=input_size, CLASSES=TRAIN_CLASSES)
        yolo.load_weights("./"+TRAIN_CHECKPOINTS_FOLDER+"/"+TRAIN_MODEL_NAME)

        # Iterate over files.
        for image_path in self.image_paths:
            file_name = os.path.basename(image_path)
            output_path_rescaled = os.path.join(self.output_dirs[1], file_name)
            output_path_labeled = os.path.join(self.output_dirs[2], file_name)
            output_path_raw_predictions = os.path.join(self.output_dirs[3], file_name + "_raw.npy")
            self.labeled_image_paths.append(output_path_labeled)

            # Rescale image.
            img = cv2.imread(image_path)
            res_img = rescale_im(img)
            cv2.imwrite(output_path_rescaled, res_img)

            # Do predictions.
            bboxes_raw = run_prediction(yolo, output_path_rescaled, input_size)
            np.save(output_path_raw_predictions, bboxes_raw)
            self.prediction_bboxes.append(bboxes_raw)
        self.process_predictions()

    def process_predictions(self):
        """Save predictions to master table and image files."""
        if len(self.prediction_bboxes) == len(self.image_paths) and len(self.prediction_bboxes) > 0:

            output_path_master_table = os.path.join(self.output_dirs[0], "master_table.csv")
            dict_master = {'Filename': [],
                           'Total': [],
                           'Alive': [],
                           'Dead': [],
                           'Aggregate': [],
                           'Viability': []}

            for bboxes_raw, image_path in zip(self.prediction_bboxes, self.image_paths):

                file_name = os.path.basename(image_path)
                output_path_rescaled = os.path.join(self.output_dirs[1], file_name)
                output_path_predictions = os.path.join(self.output_dirs[3], file_name + ".txt")

                output_path_labeled = os.path.join(self.output_dirs[2], file_name)
                bboxes = filter_bboxes(bboxes_raw, score_threshold=self.score_threshold,
                                       iou_threshold=self.iou_threshold, min_bbox_size=self.min_bbox_size)
                if len(bboxes) == 0:
                    if os.path.exists(output_path_labeled):
                        os.remove(output_path_labeled)
                        shutil.copy(output_path_rescaled, output_path_labeled)
                    continue
                info = get_pred_info(output_path_rescaled, bboxes, output_path=output_path_labeled, show=False,
                                     write=True, show_label=False, classes=TRAIN_CLASSES, rectangle_colors='',
                                     txt_output_path=output_path_predictions, return_details=True, show_details=True)
                print(info)

                dict_master['Filename'].append(file_name)
                dict_master['Total'].append(info['Alive'] + info['Dead'] + info['Aggregate'])
                dict_master['Alive'].append(info['Alive'])
                dict_master['Dead'].append(info['Dead'])
                dict_master['Aggregate'].append(info['Aggregate'])
                dict_master['Viability'].append(100 * info['Alive'] / (info['Alive'] + info['Dead']))

            # Write master table.
            df_master = pd.DataFrame(dict_master, columns=['Filename', 'Total', 'Alive',
                                                           'Dead', 'Aggregate', 'Viability'])
            df_master.to_csv(output_path_master_table)
            self.show_dock()
            self.showing_predictions = True
            self.refresh()

    def display_prediction_image(self):
        """Fetch labeled image."""
        if self.image_id is None:
            self.show_warning("No images selected.")
        elif len(self.labeled_image_paths) == 0:
            self.show_warning("No predictions found.")
        else:
            image_predicted = self.labeled_image_paths[self.image_id]
            pixmap = QPixmap(image_predicted)
            self.central_image.setPixmap(QPixmap(pixmap))

    def show_predictions(self):
        """Show labeled image."""
        self.showing_predictions = True
        self.refresh()

    def hide_predictions(self):
        """Hide labeled image."""
        self.showing_predictions = False
        self.refresh()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = MyWindow()
    win.show()
    sys.exit(app.exec_())
