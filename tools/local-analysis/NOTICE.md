# Local analysis model provenance

The local tools consume separately downloaded data models; neither model weights nor upstream Python packages/code are bundled here.

- YOLOX is published by Megvii and contributors under Apache-2.0: https://github.com/Megvii-BaseDetection/YOLOX/blob/main/LICENSE . The tensor channel order, letterbox placement, output-grid decoding and COCO class ordering follow the official ONNX deployment contract: https://github.com/Megvii-BaseDetection/YOLOX/tree/main/demo/ONNXRuntime . Detection post-processing and the intentionally simple track matcher are implemented locally with NumPy/Pillow.
- OpenCV Zoo CRNN directory/model license: https://github.com/opencv/opencv_zoo/blob/main/models/text_recognition_crnn/LICENSE . Its input is grayscale 100×32, normalized around 127.5; output uses CTC blank plus digits/lowercase letters: https://github.com/opencv/opencv_zoo/blob/main/models/text_recognition_crnn/crnn.py . Local preprocessing/decoding follows that published tensor contract.

The pilot does not use Ultralytics packages/models, third-party paid inference, cloud media uploads or real player face identification. Temporary person track IDs are not personal identity claims.
