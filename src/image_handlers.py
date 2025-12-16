#!../../.venv python3

import os
import struct
import sys

import fpzip
import numpy as np
import torch
import torchvision
from PIL import Image
from torchvision.transforms import v2 as transforms

from .data_types import *

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "comfy"))

MAX_RESOLUTION = 16384

CCV_TENSOR_CPU_MEMORY = 0x1
CCV_TENSOR_GPU_MEMORY = 0x2

CCV_TENSOR_FORMAT_NCHW = 0x01
CCV_TENSOR_FORMAT_NHWC = 0x02
CCV_TENSOR_FORMAT_CHWN = 0x04

CCV_8U = 0x01000
CCV_32S = 0x02000
CCV_32F = 0x04000
CCV_64S = 0x08000
CCV_64F = 0x10000
CCV_16F = 0x20000
CCV_QX = 0x40000  # QX is a catch-all for quantized models (anything less than or equal to 1-byte). We can still squeeze in 1 more primitive type, which probably will be 8F or BF16. (0xFF000 are for data types).
CCV_16BF = 0x80000


def clamp(value):
    return max(min(int(value if np.isfinite(value) else 0), 255), 0)


def get_image_data(response_image: bytes):
    int_buffer = np.frombuffer(response_image, dtype=np.uint32, count=17)
    height, width, channels = int_buffer[6:9]
    length = width * height * channels * 2
    is_compressed = int_buffer[0] == 1012247

    if is_compressed:
        uncompressed: np.ndarray = fpzip.decompress(response_image[68:], order="C")
        buffer = uncompressed.astype(np.float16).tobytes()
    else:
        buffer = response_image[68:]

    return np.frombuffer(buffer, dtype=np.float16, count=length // 2)


def convert_response_image(response_image: bytes):
    int_buffer = np.frombuffer(response_image, dtype=np.uint32, count=17)
    height, width, channels = int_buffer[6:9]

    data = get_image_data(response_image)

    if np.isnan(data[0]):
        print("NaN detected in data")
        return None
    data = np.clip((data + 1) * 127, 0, 255).astype(np.uint8)

    return {
        "data": data,
        "width": width,
        "height": height,
        "channels": channels,
    }


def decode_preview(preview, version):
    int_buffer = np.frombuffer(preview, dtype=np.uint32, count=17)
    image_height, image_width, channels = int_buffer[6:9]

    if channels not in [3, 4, 16]:
        return None

    fp16 = get_image_data(preview)

    image = None
    version = version.lower() if type(version) is str else version

    if version in ["v1", "v2", "svdi2v"]:
        bytes_array = np.zeros((image_height, image_width, channels), dtype=np.uint8)
        for i in range(image_height * image_width):
            v0, v1, v2, v3 = fp16[i * 4 : i * 4 + 4]
            r = 49.5210 * v0 + 29.0283 * v1 - 23.9673 * v2 - 39.4981 * v3 + 99.9368
            g = 41.1373 * v0 + 42.4951 * v1 + 24.7349 * v2 - 50.8279 * v3 + 99.8421
            b = 40.2919 * v0 + 18.9304 * v1 + 30.0236 * v2 - 81.9976 * v3 + 99.5384

            bytes_array[i // image_width, i % image_width] = [
                clamp(r),
                clamp(g),
                clamp(b),
                255,
            ]
        image = Image.fromarray(bytes_array, "RGBA")

    if version[:3] == "sd3":
        bytes_array = bytearray(image_width * image_height * 4)
        for i in range(image_height * image_width):
            v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 = fp16[
                i * 16 : (i + 1) * 16
            ]
            r = (
                -0.0922 * v0
                + 0.0311 * v1
                + 0.1994 * v2
                + 0.0856 * v3
                + 0.0587 * v4
                - 0.0006 * v5
                + 0.0978 * v6
                - 0.0042 * v7
                - 0.0194 * v8
                - 0.0488 * v9
                + 0.0922 * v10
                - 0.0278 * v11
                + 0.0332 * v12
                - 0.0069 * v13
                - 0.0596 * v14
                - 0.1448 * v15
                + 0.2394
            ) * 127.5 + 127.5
            g = (
                -0.0175 * v0
                + 0.0633 * v1
                + 0.0927 * v2
                + 0.0339 * v3
                + 0.0272 * v4
                + 0.1104 * v5
                + 0.0306 * v6
                + 0.1038 * v7
                + 0.0020 * v8
                + 0.0130 * v9
                + 0.0988 * v10
                + 0.0524 * v11
                + 0.0456 * v12
                - 0.0030 * v13
                - 0.0465 * v14
                - 0.1463 * v15
                + 0.2135
            ) * 127.5 + 127.5
            b = (
                0.0749 * v0
                + 0.0954 * v1
                + 0.0458 * v2
                + 0.0902 * v3
                - 0.0496 * v4
                + 0.0309 * v5
                + 0.0427 * v6
                + 0.1358 * v7
                + 0.0669 * v8
                - 0.0268 * v9
                + 0.0951 * v10
                - 0.0542 * v11
                + 0.0895 * v12
                - 0.0810 * v13
                - 0.0293 * v14
                - 0.1189 * v15
                + 0.1925
            ) * 127.5 + 127.5

            bytes_array[i * 4] = clamp(r)
            bytes_array[i * 4 + 1] = clamp(g)
            bytes_array[i * 4 + 2] = clamp(b)
            bytes_array[i * 4 + 3] = 255
        image = Image.frombytes("RGBA", (image_width, image_height), bytes(bytes_array))

    if version[:4] == "sdxl" or version in ["ssd1b", "pixart", "auraflow"]:
        bytes_array = np.zeros((image_height * image_width * 4,), dtype=np.uint8)
        for i in range(image_height * image_width):
            v0, v1, v2, v3 = fp16[i * 4 : (i + 1) * 4]
            r = 47.195 * v0 - 29.114 * v1 + 11.883 * v2 - 38.063 * v3 + 141.64
            g = 53.237 * v0 - 1.4623 * v1 + 12.991 * v2 - 28.043 * v3 + 127.46
            b = 58.182 * v0 + 4.3734 * v1 - 3.3735 * v2 - 26.722 * v3 + 114.5

            bytes_array[i * 4] = clamp(r)
            bytes_array[i * 4 + 1] = clamp(g)
            bytes_array[i * 4 + 2] = clamp(b)
            bytes_array[i * 4 + 3] = 255
        image = Image.frombytes("RGBA", (image_width, image_height), bytes_array)

    if (
        version.startswith("flux")
        or version.startswith("hidream")
        or version.startswith("zimage")
    ):
        bytes_array = np.zeros((image_height * image_width * 4,), dtype=np.uint8)
        for i in range(image_height * image_width):
            v = fp16[i * 16 : i * 16 + 16]
            r = (
                -0.0346 * v[0]
                + 0.0034 * v[1]
                + 0.0275 * v[2]
                - 0.0174 * v[3]
                + 0.0859 * v[4]
                + 0.0004 * v[5]
                + 0.0405 * v[6]
                - 0.0236 * v[7]
                - 0.0245 * v[8]
                + 0.1008 * v[9]
                - 0.0515 * v[10]
                + 0.0428 * v[11]
                + 0.0817 * v[12]
                - 0.1264 * v[13]
                - 0.0280 * v[14]
                - 0.1262 * v[15]
                - 0.0329
            ) * 127.5 + 127.5
            g = (
                0.0244 * v[0]
                + 0.0210 * v[1]
                - 0.0668 * v[2]
                + 0.0160 * v[3]
                + 0.0721 * v[4]
                + 0.0383 * v[5]
                + 0.0861 * v[6]
                - 0.0185 * v[7]
                + 0.0250 * v[8]
                + 0.0755 * v[9]
                + 0.0201 * v[10]
                - 0.0012 * v[11]
                + 0.0765 * v[12]
                - 0.0522 * v[13]
                - 0.0881 * v[14]
                - 0.0982 * v[15]
                - 0.0718
            ) * 127.5 + 127.5
            b = (
                0.0681 * v[0]
                + 0.0687 * v[1]
                - 0.0433 * v[2]
                + 0.0617 * v[3]
                + 0.0329 * v[4]
                + 0.0115 * v[5]
                + 0.0915 * v[6]
                - 0.0259 * v[7]
                + 0.1180 * v[8]
                - 0.0421 * v[9]
                + 0.0011 * v[10]
                - 0.0036 * v[11]
                + 0.0749 * v[12]
                - 0.1103 * v[13]
                - 0.0499 * v[14]
                - 0.0778 * v[15]
                - 0.0851
            ) * 127.5 + 127.5

            bytes_array[i * 4] = clamp(r)
            bytes_array[i * 4 + 1] = clamp(g)
            bytes_array[i * 4 + 2] = clamp(b)
            bytes_array[i * 4 + 3] = 255
        image = Image.fromarray(
            bytes_array.reshape((image_height, image_width, 4)), "RGBA"
        )

    if version[:6] == "wan2.1" or version[:4] == "qwen":
        bytes_array = np.zeros((image_height * image_width * 4,), dtype=np.uint8)
        for i in range(image_height * image_width):
            v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 = fp16[
                i * 16 : (i + 1) * 16
            ]
            r = (
                -0.1299 * v0
                + 0.0671 * v1
                + 0.3568 * v2
                + 0.0372 * v3
                + 0.0313 * v4
                + 0.0296 * v5
                - 0.3477 * v6
                + 0.0166 * v7
                - 0.0412 * v8
                - 0.1293 * v9
                + 0.0680 * v10
                + 0.0032 * v11
                - 0.1251 * v12
                + 0.0060 * v13
                + 0.3477 * v14
                + 0.1984 * v15
                - 0.1835
            ) * 127.5 + 127.5
            g = (
                -0.1692 * v0
                + 0.0406 * v1
                + 0.2548 * v2
                + 0.2344 * v3
                + 0.0189 * v4
                - 0.0956 * v5
                - 0.4059 * v6
                + 0.1902 * v7
                + 0.0267 * v8
                + 0.0740 * v9
                + 0.3019 * v10
                + 0.0581 * v11
                + 0.0927 * v12
                - 0.0633 * v13
                + 0.2275 * v14
                + 0.0913 * v15
                - 0.0868
            ) * 127.5 + 127.5
            b = (
                0.2932 * v0
                + 0.0442 * v1
                + 0.1747 * v2
                + 0.1420 * v3
                - 0.0328 * v4
                - 0.0665 * v5
                - 0.2925 * v6
                + 0.1975 * v7
                - 0.1364 * v8
                + 0.1636 * v9
                + 0.1128 * v10
                + 0.0639 * v11
                + 0.1699 * v12
                + 0.0005 * v13
                + 0.2950 * v14
                + 0.1861 * v15
                - 0.336
            ) * 127.5 + 127.5

            bytes_array[i * 4] = clamp(r)
            bytes_array[i * 4 + 1] = clamp(g)
            bytes_array[i * 4 + 2] = clamp(b)
            bytes_array[i * 4 + 3] = 255
        image = Image.frombytes("RGBA", (image_width, image_height), bytes_array)

    if version[:6] == "wan2.2":
        bytes_array = np.zeros((image_height * image_width * 4,), dtype=np.uint8)

        for i in range(image_height * image_width):
            v = fp16[i * 48 : (i + 1) * 48]
            (
                v0,
                v1,
                v2,
                v3,
                v4,
                v5,
                v6,
                v7,
                v8,
                v9,
                v10,
                v11,
                v12,
                v13,
                v14,
                v15,
                v16,
                v17,
                v18,
                v19,
                v20,
                v21,
                v22,
                v23,
                v24,
                v25,
                v26,
                v27,
                v28,
                v29,
                v30,
                v31,
                v32,
                v33,
                v34,
                v35,
                v36,
                v37,
                v38,
                v39,
                v40,
                v41,
                v42,
                v43,
                v44,
                v45,
                v46,
                v47,
            ) = v

            r = (
                0.0119 * v0
                - 0.1062 * v1
                + 0.0140 * v2
                - 0.0813 * v3
                + 0.0656 * v4
                + 0.0264 * v5
                + 0.0295 * v6
                - 0.0244 * v7
                + 0.0443 * v8
                - 0.0465 * v9
                + 0.0359 * v10
                - 0.0776 * v11
                + 0.0564 * v12
                + 0.0006 * v13
                - 0.0319 * v14
                - 0.0268 * v15
                + 0.0539 * v16
                - 0.0359 * v17
                - 0.0285 * v18
                + 0.1041 * v19
                - 0.0086 * v20
                + 0.0390 * v21
                + 0.0069 * v22
                + 0.0006 * v23
                + 0.0313 * v24
                - 0.1454 * v25
                + 0.0714 * v26
                - 0.0304 * v27
                + 0.0401 * v28
                - 0.0758 * v29
                + 0.0568 * v30
                - 0.0055 * v31
                + 0.0239 * v32
                - 0.0663 * v33
                - 0.0416 * v34
                + 0.0166 * v35
                - 0.0211 * v36
                + 0.1833 * v37
                - 0.0368 * v38
                - 0.3441 * v39
                - 0.0479 * v40
                - 0.0660 * v41
                - 0.0101 * v42
                - 0.0690 * v43
                - 0.0145 * v44
                + 0.0421 * v45
                + 0.0504 * v46
                - 0.0837 * v47
            ) * 127.5 + 127.5

            g = (
                0.0103 * v0
                - 0.0504 * v1
                + 0.0409 * v2
                - 0.0677 * v3
                + 0.0851 * v4
                + 0.0463 * v5
                + 0.0326 * v6
                - 0.0270 * v7
                - 0.0102 * v8
                - 0.0090 * v9
                + 0.0236 * v10
                + 0.0854 * v11
                + 0.0264 * v12
                + 0.0594 * v13
                - 0.0542 * v14
                + 0.0024 * v15
                + 0.0265 * v16
                - 0.0312 * v17
                - 0.1032 * v18
                + 0.0537 * v19
                - 0.0374 * v20
                + 0.0670 * v21
                + 0.0144 * v22
                - 0.0167 * v23
                - 0.0574 * v24
                - 0.0902 * v25
                + 0.0827 * v26
                - 0.0574 * v27
                + 0.0384 * v28
                - 0.0297 * v29
                + 0.1307 * v30
                - 0.0310 * v31
                - 0.0305 * v32
                - 0.0673 * v33
                - 0.0047 * v34
                + 0.0112 * v35
                + 0.0011 * v36
                + 0.1466 * v37
                + 0.0370 * v38
                - 0.3543 * v39
                - 0.0489 * v40
                - 0.0153 * v41
                + 0.0068 * v42
                - 0.0452 * v43
                + 0.0041 * v44
                + 0.0451 * v45
                - 0.0483 * v46
                + 0.0168 * v47
            ) * 127.5 + 127.5

            b = (
                0.0046 * v0
                + 0.0165 * v1
                + 0.0491 * v2
                + 0.0607 * v3
                + 0.0808 * v4
                + 0.0912 * v5
                + 0.0590 * v6
                + 0.0025 * v7
                + 0.0288 * v8
                - 0.0205 * v9
                + 0.0082 * v10
                + 0.1048 * v11
                + 0.0561 * v12
                + 0.0418 * v13
                - 0.0637 * v14
                + 0.0260 * v15
                + 0.0358 * v16
                - 0.0287 * v17
                - 0.1237 * v18
                + 0.0622 * v19
                - 0.0051 * v20
                + 0.2863 * v21
                + 0.0082 * v22
                + 0.0079 * v23
                - 0.0232 * v24
                - 0.0481 * v25
                + 0.0447 * v26
                - 0.0196 * v27
                + 0.0204 * v28
                - 0.0014 * v29
                + 0.1372 * v30
                - 0.0380 * v31
                + 0.0325 * v32
                - 0.0140 * v33
                - 0.0023 * v34
                - 0.0093 * v35
                + 0.0331 * v36
                + 0.2250 * v37
                + 0.0295 * v38
                - 0.2008 * v39
                - 0.0420 * v40
                + 0.0800 * v41
                + 0.0156 * v42
                - 0.0927 * v43
                + 0.0015 * v44
                + 0.0373 * v45
                - 0.0356 * v46
                + 0.0055 * v47
            ) * 127.5 + 127.5

            bytes_array[i * 4] = clamp(r)
            bytes_array[i * 4 + 1] = clamp(g)
            bytes_array[i * 4 + 2] = clamp(b)
            bytes_array[i * 4 + 3] = 255

        image = Image.frombytes("RGBA", (image_width, image_height), bytes_array)

    if version == "hunyuanvideo":
        bytes_array = np.zeros((image_height * image_width * 4,), dtype=np.uint8)
        for i in range(image_height * image_width):
            v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 = fp16[
                i * 16 : (i + 1) * 16
            ]
            r = (
                -0.0395 * v0
                + 0.0696 * v1
                + 0.0135 * v2
                + 0.0108 * v3
                - 0.0209 * v4
                - 0.0804 * v5
                - 0.0991 * v6
                - 0.0646 * v7
                - 0.0696 * v8
                - 0.0799 * v9
                + 0.1166 * v10
                + 0.1165 * v11
                - 0.2315 * v12
                - 0.0270 * v13
                - 0.0616 * v14
                + 0.0249 * v15
                + 0.0249
            ) * 127.5 + 127.5
            g = (
                -0.0331 * v0
                + 0.0795 * v1
                - 0.0945 * v2
                - 0.0250 * v3
                + 0.0032 * v4
                - 0.0254 * v5
                + 0.0271 * v6
                - 0.0422 * v7
                - 0.0595 * v8
                - 0.0208 * v9
                + 0.1627 * v10
                + 0.0432 * v11
                - 0.1920 * v12
                + 0.0401 * v13
                - 0.0997 * v14
                - 0.0469 * v15
                - 0.0192
            ) * 127.5 + 127.5
            b = (
                0.0445 * v0
                + 0.0518 * v1
                - 0.0282 * v2
                - 0.0765 * v3
                + 0.0224 * v4
                - 0.0639 * v5
                - 0.0669 * v6
                - 0.0400 * v7
                - 0.0894 * v8
                - 0.0375 * v9
                + 0.0962 * v10
                + 0.0407 * v11
                - 0.1355 * v12
                - 0.0821 * v13
                - 0.0727 * v14
                - 0.1703 * v15
                - 0.0761
            ) * 127.5 + 127.5

            bytes_array[i * 4] = clamp(r)
            bytes_array[i * 4 + 1] = clamp(g)
            bytes_array[i * 4 + 2] = clamp(b)
            bytes_array[i * 4 + 3] = 255
        image = Image.frombytes("RGBA", (image_width, image_height), bytes_array)

    if version[:5] == "wurst":
        bytes_array = np.zeros((image_height * image_width * 4,), dtype=np.uint8)
        if channels == 3:
            for i in range(image_height * image_width):
                r, g, b = fp16[i * 3], fp16[i * 3 + 1], fp16[i * 3 + 2]
                bytes_array[i * 4] = clamp(r)
                bytes_array[i * 4 + 1] = clamp(g)
                bytes_array[i * 4 + 2] = clamp(b)
                bytes_array[i * 4 + 3] = 255
        else:
            for i in range(image_height * image_width):
                v0, v1, v2, v3 = (
                    fp16[i * 4],
                    fp16[i * 4 + 1],
                    fp16[i * 4 + 2],
                    fp16[i * 4 + 3],
                )
                r = 10.175 * v0 - 20.807 * v1 - 27.834 * v2 - 2.0577 * v3 + 143.39
                g = 21.07 * v0 - 4.3022 * v1 - 11.258 * v2 - 18.8 * v3 + 131.53
                b = 7.8454 * v0 - 2.3713 * v1 - 0.45565 * v2 - 41.648 * v3 + 120.76

                bytes_array[i * 4] = clamp(r)
                bytes_array[i * 4 + 1] = clamp(g)
                bytes_array[i * 4 + 2] = clamp(b)
                bytes_array[i * 4 + 3] = 255
        image = Image.frombytes("RGBA", (image_width, image_height), bytes_array)

    return image


def resize_crop(image, width, height):
    # bhwc to bchw
    bchw = image.permute(0, 3, 1, 2)

    [sh, sw] = [bchw.size(dim=2), bchw.size(dim=3)]
    [rh, rw] = [height / sh, width / sw]
    scale = max(rh, rw)
    [th, tw] = [int(sh * scale), int(sw * scale)]

    resize = transforms.Resize([th, tw])
    crop = transforms.CenterCrop([height, width])
    transform = transforms.Compose([resize, crop])

    resized = transform(bchw)

    return resized.permute(0, 2, 3, 1)


def convert_image_for_request(
    image: torch.Tensor,
    control_type=None,
    batch_index=0,
    width=None,
    height=None,
):
    image_tensor = image.clone()
    # Draw Things: C header + the Float16 blob of -1 to 1 values that represents the image (in RGB order and HWC format, meaning r(0, 0), g(0, 0), b(0, 0), r(1, 0), g(1, 0), b(1, 0) .... (r(x, y) represents the value of red at that particular coordinate). The actual header is a bit more complex, here is the reference: https://github.com/liuliu/s4nnc/blob/main/nnc/Tensor.swift#L1750 the ccv_nnc_tensor_param_t is here: https://github.com/liuliu/ccv/blob/unstable/lib/nnc/ccv_nnc_tfb.h#L79 The type is CCV_TENSOR_CPU_MEMORY, format is CCV_TENSOR_FORMAT_NHWC, datatype is CCV_16F (for Float16), dim is the dimension in N, H, W, C order (in the case it should be 1, actual height, actual width, 3).

    # ComfyUI: An IMAGE is a torch.Tensor with shape [B,H,W,C], C=3. If you are going to save or load images, you will need to convert to and from PIL.Image format - see the code snippets below! Note that some pytorch operations offer (or expect) [B,C,H,W], known as ‘channel first’, for reasons of computational efficiency. Just be careful.
    # A LATENT is a dict; the latent sample is referenced by the key samples and has shape [B,C,H,W], with C=4.

    orig_width = image_tensor.size(dim=2)
    orig_height = image_tensor.size(dim=1)
    channels = image_tensor.size(dim=3)

    width = width if width is not None else orig_width
    height = height if height is not None else orig_height

    if width != orig_width or height != orig_height:
        image_tensor = resize_crop(image_tensor, width, height)

    if control_type == "pose":
        channels = 3
        # I think we want pose values to be from 0.5 to 1
        minimum = image_tensor.min()
        maximum = image_tensor.max()
        image_tensor = (image_tensor - minimum) / (maximum - minimum)
        image_tensor = image_tensor / 2 + 0.5
        print(
            "pose before",
            minimum,
            maximum,
            "pose after",
            image_tensor.min(),
            image_tensor.max(),
        )

    pil_image = torchvision.transforms.ToPILImage()(
        image_tensor[batch_index].permute(2, 0, 1)
    )

    match control_type:
        case "depth" | "scribble" | "canny":  # what else?
            transform = torchvision.transforms.Grayscale(num_output_channels=1)
            pil_image = transform(pil_image)
            channels = 1

    image_bytes = bytearray(68 + width * height * channels * 2)
    struct.pack_into(
        "<9I",
        image_bytes,
        0,
        0,
        CCV_TENSOR_CPU_MEMORY,
        CCV_TENSOR_FORMAT_NHWC,
        CCV_16F,
        0,
        1,
        height,
        width,
        channels,
    )

    for y in range(height):
        for x in range(width):
            pixel = pil_image.getpixel((x, y))
            offset = 68 + (y * width + x) * (channels * 2)
            for c in range(channels):
                if channels == 1:
                    v = pixel / 255 * 2 - 1
                else:
                    v = pixel[c] / 255 * 2 - 1
                struct.pack_into("<e", image_bytes, offset + c * 2, v)

    return bytes(image_bytes)


def convert_mask_for_request(
    mask_tensor: torch.Tensor,
    batch_index=0,
    width: int | None = None,
    height: int | None = None,
):
    # The binary mask is a shape of (height, width), with content of 0, 1, 2, 3
    # 2 means it is explicit masked, if 2 is presented, we will treat 0 as areas to retain, and 1 as areas to fill in from pure noise. If 2 is not presented, we will fill in 1 as pure noise still, but treat 0 as areas masked. If no 1 or 2 presented, this degrades back to generate from image.
    # In more academic point of view, when 1 is presented, we will go from 0 to step - tEnc to generate things from noise with text guidance in these areas. When 2 is explicitly masked, we will retain these areas during 0 to step - tEnc, and make these areas mixing during step - tEnc to end. When 2 is explicitly masked, we will retain areas marked as 0 during 0 to steps, otherwise we will only retain them during 0 to step - tEnc (depending on whether we have 1, if we don't, we don't need to step through 0 to step - tEnc, and if we don't, this degrades to generateImageOnly). Regardless of these, when marked as 3, it will be retained.

    # transform = torchvision.transforms.ToPILImage()
    # pil_image = transform(mask_tensor)

    # match mask size to image size
    # [width, height] = image_tensor.size()[1:3]
    # print(f'image tensor is {width}x{height}')
    # pil_image = pil_image.resize((width, height))
    orig_width = mask_tensor.size(dim=2)
    orig_height = mask_tensor.size(dim=1)
    # channels = mask_tensor.size(dim=3)

    width = width if width is not None else orig_width
    height = height if height is not None else orig_height

    mask_tensor = mask_tensor.unsqueeze(3)

    if width != orig_width or height != orig_height:
        mask_tensor = resize_crop(mask_tensor, width, height)

    pil_image = torchvision.transforms.ToPILImage()(
        mask_tensor[batch_index].permute(2, 0, 1)
    )

    image_bytes = bytearray(68 + width * height)
    struct.pack_into(
        "<9I",
        image_bytes,
        0,
        0,
        CCV_TENSOR_CPU_MEMORY,
        CCV_TENSOR_FORMAT_NCHW,
        CCV_8U,
        0,
        height,
        width,
        0,
        0,
    )

    for y in range(height):
        for x in range(width):
            pixel = pil_image.getpixel((x, y))
            offset = 68 + (y * width + x)

            # basically, 0 is the area to retain and 2 is the area to apply % strength, if any area marked with 1, these will apply 100% strength no matter your denoising strength settings. Higher bits are available (we retain the lower 3-bits) as alpha blending values - liuliu
            # https://discord.com/channels/1038516303666876436/1343683611467186207/1354887139225243733

            # for simpliciity, dark values will be retained (0) and light values will be %strength (2)
            # i believe this is how that app works
            v = 0 if pixel < 50 else 2
            image_bytes[offset] = v

    return bytes(image_bytes)
