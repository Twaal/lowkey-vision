import cv2
import glob
import os


# Rescale to 1024x768
def rescale_im(img):
    return cv2.resize(img, dsize=(1024, 768), interpolation=cv2.INTER_CUBIC)


# Indicate here the directory with images to rescale.
files = glob.glob(r"C:\Users\lckuijpers\GitLab\cell_object_detection\model_data\datasets\to_rescale\*.tif")

# Indicate here the directory to write to.
out_dir = r"C:\Users\lckuijpers\GitLab\cell_object_detection\model_data\datasets\rescaled"

# Iterate over files.
for f_in in files:
    f_out = os.path.join(out_dir, os.path.basename(f_in))
    print(f_in, f_out)
    img = cv2.imread(f_in)
    res = rescale_im(img)
    cv2.imwrite(f_out.replace(" ", " "), res)
