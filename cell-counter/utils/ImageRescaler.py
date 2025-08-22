"""A function for rescaling images to 1024x768 pixels using opencv."""

import cv2


def rescale_im(img):
    return cv2.resize(img, dsize=(1024, 768), interpolation=cv2.INTER_CUBIC)
