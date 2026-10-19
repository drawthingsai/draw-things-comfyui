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
    data = np.clip((data + 1) * 127.5, 0, 255).astype(np.uint8)

    return {
        "data": data,
        "width": width,
        "height": height,
        "channels": channels,
    }


# Draw Things ImageConverter.swift cgImages, revision e2c7fa474ce3bddfe34ad20bdde75f425344800e:
# Libraries/LocalImageGenerator/Sources/ImageConverter.swift#L1278
# https://github.com/drawthingsai/draw-things-community
# Each registered version has an explicit latent format.
# Rows are R/G/B, followed by their biases; normalized groups use [-1, 1].
_PREVIEW_MINIMAX = (
    np.array([
        [-0.018555, +0.150164, +0.027367, -0.000793, -0.048556, +0.011740, +0.061517, +0.035321,
         -0.017426, +0.531539, -0.024968, -0.032549, +0.022609, -0.084001, -0.018830, +0.020777,
         -0.008390, -0.013281, +0.000260, +0.105471, +0.016529, -0.014015, -0.033787, +0.004224],
        [0.024344, +0.137244, -0.050369, -0.164622, +0.013970, +0.014172, +0.061212, +0.086879,
         +0.002997, +0.548819, -0.040234, -0.029096, +0.020286, -0.038131, +0.010412, +0.011196,
         -0.012201, -0.002924, +0.001833, +0.100482, +0.015213, -0.017438, -0.009984, +0.017284],
        [-0.017536, +0.129221, -0.208606, -0.323161, -0.074286, -0.006906, +0.110025, +0.110059,
         +0.035356, +0.624404, -0.034302, -0.017221, +0.050661, -0.020805, +0.061120, -0.030994,
         -0.025687, +0.006331, -0.011038, +0.132106, +0.009999, -0.019134, -0.019725, +0.027196],
    ], dtype=np.float64),
    np.array([+0.057426, -0.022078, -0.071449], dtype=np.float64),
    127.5,
)

_PREVIEW_SD = (
    np.array([
        [49.5210, +29.0283, -23.9673, -39.4981],
        [41.1373, +42.4951, +24.7349, -50.8279],
        [40.2919, +18.9304, +30.0236, -81.9976],
    ], dtype=np.float64),
    np.array([+99.9368, +99.8421, +99.5384], dtype=np.float64),
    1.0,
)

_PREVIEW_SD3 = (
    np.array([
        [-0.0922, +0.0311, +0.1994, +0.0856, +0.0587, -0.0006, +0.0978, -0.0042,
         -0.0194, -0.0488, +0.0922, -0.0278, +0.0332, -0.0069, -0.0596, -0.1448],
        [-0.0175, +0.0633, +0.0927, +0.0339, +0.0272, +0.1104, +0.0306, +0.1038,
         +0.0020, +0.0130, +0.0988, +0.0524, +0.0456, -0.0030, -0.0465, -0.1463],
        [0.0749, +0.0954, +0.0458, +0.0902, -0.0496, +0.0309, +0.0427, +0.1358,
         +0.0669, -0.0268, +0.0951, -0.0542, +0.0895, -0.0810, -0.0293, -0.1189],
    ], dtype=np.float64),
    np.array([+0.2394, +0.2135, +0.1925], dtype=np.float64),
    127.5,
)

_PREVIEW_FLUX1 = (
    np.array([
        [-0.0346, +0.0034, +0.0275, -0.0174, +0.0859, +0.0004, +0.0405, -0.0236,
         -0.0245, +0.1008, -0.0515, +0.0428, +0.0817, -0.1264, -0.0280, -0.1262],
        [0.0244, +0.0210, -0.0668, +0.0160, +0.0721, +0.0383, +0.0861, -0.0185,
         +0.0250, +0.0755, +0.0201, -0.0012, +0.0765, -0.0522, -0.0881, -0.0982],
        [0.0681, +0.0687, -0.0433, +0.0617, +0.0329, +0.0115, +0.0915, -0.0259,
         +0.1180, -0.0421, +0.0011, -0.0036, +0.0749, -0.1103, -0.0499, -0.0778],
    ], dtype=np.float64),
    np.array([-0.0329, -0.0718, -0.0851], dtype=np.float64),
    127.5,
)

_PREVIEW_FLUX2 = (
    np.array([
        [0.0058, +0.0495, -0.0099, +0.2144, +0.0166, +0.0157, -0.0398, -0.0052,
         -0.3527, -0.0301, -0.0107, +0.0746, +0.0156, -0.0034, +0.0032, -0.0939,
         +0.0018, +0.0284, -0.0024, +0.1207, +0.0128, +0.0137, +0.0095, +0.0000,
         -0.0465, +0.0095, +0.0290, +0.0220, -0.0332, -0.0085, -0.0076, -0.0111],
        [0.0113, +0.0443, +0.0096, +0.3009, -0.0039, +0.0103, +0.0902, +0.0095,
         -0.2712, -0.0356, +0.0078, +0.0090, +0.0169, -0.0040, +0.0181, -0.0008,
         +0.0043, +0.0056, -0.0022, -0.0026, +0.0101, -0.0072, +0.0092, -0.0077,
         -0.0204, +0.0012, -0.0034, +0.0169, -0.0457, +0.0389, +0.0003, -0.0460],
        [0.0073, +0.0836, +0.0644, +0.3652, -0.0054, -0.0160, -0.0235, +0.0109,
         -0.1666, -0.0180, +0.0013, -0.0941, +0.0070, -0.0114, +0.0080, +0.0186,
         +0.0104, -0.0127, -0.0030, +0.0065, +0.0142, -0.0007, -0.0059, -0.0049,
         -0.0312, -0.0066, +0.0025, -0.0048, -0.0468, +0.0609, -0.0043, -0.0614],
    ], dtype=np.float64),
    np.array([-0.0329, -0.0718, -0.0851], dtype=np.float64),
    127.5,
)

_PREVIEW_QWEN21 = (
    np.array([
        [-0.0158, +0.0030, +0.0637, +0.0360, +0.0159, +0.0132, +0.0191, -0.0146,
         +0.0187, -0.1059, -0.0195, -0.0295, +0.0191, -0.0144, +0.0389, -0.0153,
         +0.0339, -0.0136, -0.0340, -0.0133, +0.0109, -0.0010, +0.0301, -0.0281,
         -0.0725, -0.0036, +0.0087, -0.0260, -0.0039, -0.0026, +0.0088, -0.0087,
         -0.0027, -0.0064, +0.0594, +0.0103, -0.0091, +0.0178, -0.0063, +0.0452,
         +0.0149, +0.1484, -0.0120, +0.0181, +0.0132, +0.0291, +0.0066, -0.1153,
         +0.0258, +0.0375, -0.0142, +0.0339, +0.0346, +0.0369, -0.0052, -0.0279,
         +0.0036, -0.0441, -0.0001, -0.0222, +0.0039, -0.0094, -0.0066, +0.0220],
        [-0.0115, +0.0120, +0.0470, +0.0661, +0.0181, +0.0326, +0.0261, -0.0276,
         -0.0024, -0.0090, -0.0226, +0.0024, -0.0393, -0.0166, +0.0430, -0.0336,
         +0.0122, -0.0078, -0.0282, -0.0176, -0.0087, +0.0044, +0.0053, -0.0205,
         +0.0002, +0.0158, +0.0040, +0.0183, -0.0035, +0.0172, +0.0078, -0.0310,
         +0.0018, +0.0292, +0.1049, -0.0103, +0.0025, +0.0243, -0.0012, +0.0246,
         +0.0270, +0.0801, +0.0040, +0.0051, +0.0050, +0.0020, -0.0410, -0.0629,
         +0.0378, +0.1139, -0.0126, +0.0153, +0.0211, -0.0431, -0.0092, +0.0410,
         +0.0017, -0.0367, -0.0092, -0.0183, +0.0053, -0.0075, -0.0088, +0.0074],
        [-0.0174, +0.0027, -0.0127, -0.0030, +0.0082, +0.0169, +0.0136, -0.0361,
         -0.0072, +0.0350, -0.0138, -0.0215, -0.0001, -0.0272, +0.0445, +0.0031,
         +0.0220, -0.0120, -0.0245, -0.0133, +0.0096, +0.0016, +0.0361, -0.0032,
         +0.0160, +0.0807, -0.0053, -0.0077, -0.0107, +0.0237, +0.0078, -0.0122,
         +0.0094, -0.0256, +0.1180, -0.0026, -0.0015, +0.0292, +0.0202, +0.0143,
         +0.0052, +0.0804, +0.0010, -0.0021, +0.0019, +0.0092, -0.1314, -0.0802,
         +0.0298, +0.0468, -0.0276, +0.0138, +0.0267, -0.0993, +0.0056, -0.0357,
         -0.0083, -0.0454, -0.0001, -0.0051, -0.0184, -0.0143, -0.0063, +0.0100],
    ], dtype=np.float64),
    np.array([-0.1228, -0.1869, -0.3083], dtype=np.float64),
    127.5,
)

_PREVIEW_HUNYUAN = (
    np.array([
        [-0.0395, +0.0696, +0.0135, +0.0108, -0.0209, -0.0804, -0.0991, -0.0646,
         -0.0696, -0.0799, +0.1166, +0.1165, -0.2315, -0.0270, -0.0616, +0.0249],
        [-0.0331, +0.0795, -0.0945, -0.0250, +0.0032, -0.0254, +0.0271, -0.0422,
         -0.0595, -0.0208, +0.1627, +0.0432, -0.1920, +0.0401, -0.0997, -0.0469],
        [0.0445, +0.0518, -0.0282, -0.0765, +0.0224, -0.0639, -0.0669, -0.0400,
         -0.0894, -0.0375, +0.0962, +0.0407, -0.1355, -0.0821, -0.0727, -0.1703],
    ], dtype=np.float64),
    np.array([+0.0249, -0.0192, -0.0761], dtype=np.float64),
    127.5,
)

_PREVIEW_QWEN = (
    np.array([
        [-0.1299, +0.0671, +0.3568, +0.0372, +0.0313, +0.0296, -0.3477, +0.0166,
         -0.0412, -0.1293, +0.0680, +0.0032, -0.1251, +0.0060, +0.3477, +0.1984],
        [-0.1692, +0.0406, +0.2548, +0.2344, +0.0189, -0.0956, -0.4059, +0.1902,
         +0.0267, +0.0740, +0.3019, +0.0581, +0.0927, -0.0633, +0.2275, +0.0913],
        [0.2932, +0.0442, +0.1747, +0.1420, -0.0328, -0.0665, -0.2925, +0.1975,
         -0.1364, +0.1636, +0.1128, +0.0639, +0.1699, +0.0005, +0.2950, +0.1861],
    ], dtype=np.float64),
    np.array([-0.1835, -0.0868, -0.336], dtype=np.float64),
    127.5,
)

_PREVIEW_WAN22 = (
    np.array([
        [0.0119, -0.1062, +0.0140, -0.0813, +0.0656, +0.0264, +0.0295, -0.0244,
         +0.0443, -0.0465, +0.0359, -0.0776, +0.0564, +0.0006, -0.0319, -0.0268,
         +0.0539, -0.0359, -0.0285, +0.1041, -0.0086, +0.0390, +0.0069, +0.0006,
         +0.0313, -0.1454, +0.0714, -0.0304, +0.0401, -0.0758, +0.0568, -0.0055,
         +0.0239, -0.0663, -0.0416, +0.0166, -0.0211, +0.1833, -0.0368, -0.3441,
         -0.0479, -0.0660, -0.0101, -0.0690, -0.0145, +0.0421, +0.0504, -0.0837],
        [0.0103, -0.0504, +0.0409, -0.0677, +0.0851, +0.0463, +0.0326, -0.0270,
         -0.0102, -0.0090, +0.0236, +0.0854, +0.0264, +0.0594, -0.0542, +0.0024,
         +0.0265, -0.0312, -0.1032, +0.0537, -0.0374, +0.0670, +0.0144, -0.0167,
         -0.0574, -0.0902, +0.0827, -0.0574, +0.0384, -0.0297, +0.1307, -0.0310,
         -0.0305, -0.0673, -0.0047, +0.0112, +0.0011, +0.1466, +0.0370, -0.3543,
         -0.0489, -0.0153, +0.0068, -0.0452, +0.0041, +0.0451, -0.0483, +0.0168],
        [0.0046, +0.0165, +0.0491, +0.0607, +0.0808, +0.0912, +0.0590, +0.0025,
         +0.0288, -0.0205, +0.0082, +0.1048, +0.0561, +0.0418, -0.0637, +0.0260,
         +0.0358, -0.0287, -0.1237, +0.0622, -0.0051, +0.2863, +0.0082, +0.0079,
         -0.0232, -0.0481, +0.0447, -0.0196, +0.0204, -0.0014, +0.1372, -0.0380,
         +0.0325, -0.0140, -0.0023, -0.0093, +0.0331, +0.2250, +0.0295, -0.2008,
         -0.0420, +0.0800, +0.0156, -0.0927, +0.0015, +0.0373, -0.0356, +0.0055],
    ], dtype=np.float64),
    np.array([0.0, 0.0, 0.0], dtype=np.float64),
    127.5,
)

_PREVIEW_SDXL = (
    np.array([
        [47.195, -29.114, +11.883, -38.063],
        [53.237, -1.4623, +12.991, -28.043],
        [58.182, +4.3734, -3.3735, -26.722],
    ], dtype=np.float64),
    np.array([+141.64, +127.46, +114.5], dtype=np.float64),
    1.0,
)

_PREVIEW_WURST = (
    np.array([
        [10.175, -20.807, -27.834, -2.0577],
        [21.07, -4.3022, -11.258, -18.8],
        [7.8454, -2.3713, -0.45565, -41.648],
    ], dtype=np.float64),
    np.array([+143.39, +131.53, +120.76], dtype=np.float64),
    1.0,
)

# Version matching is deliberately exact: similar names need not share a latent format.
_PREVIEW_CONVERTERS = {
    "v1": ((4,), _PREVIEW_SD),
    "v2": ((4,), _PREVIEW_SD),
    "svd_i2v": ((4,), _PREVIEW_SD),
    "sdxl_base_v0.9": ((4,), _PREVIEW_SDXL),
    "sdxl_refiner_v0.9": ((4,), _PREVIEW_SDXL),
    "ssd_1b": ((4,), _PREVIEW_SDXL),
    "pixart": ((4,), _PREVIEW_SDXL),
    "auraflow": ((4,), _PREVIEW_SDXL),
    "sd3": ((16,), _PREVIEW_SD3),
    "sd3_large": ((16,), _PREVIEW_SD3),
    "flux1": ((16,), _PREVIEW_FLUX1),
    "hidream_i1": ((16,), _PREVIEW_FLUX1),
    "z_image": ((16,), _PREVIEW_FLUX1),
    "seedvr2_3b": ((16,), _PREVIEW_FLUX1),
    "seedvr2_7b": ((16,), _PREVIEW_FLUX1),
    "ernie_image": ((32,), _PREVIEW_FLUX2),
    "flux2": ((32,), _PREVIEW_FLUX2),
    "flux2_4b": ((32,), _PREVIEW_FLUX2),
    "flux2_9b": ((32,), _PREVIEW_FLUX2),
    "flux3_5b": ((32,), _PREVIEW_FLUX2),
    "ideogram_4": ((32,), _PREVIEW_FLUX2),
    "qwen_image": ((16,), _PREVIEW_QWEN),
    "wan_v2.1_1.3b": ((16,), _PREVIEW_QWEN),
    "wan_v2.1_14b": ((16,), _PREVIEW_QWEN),
    "cosmos2.5_2b": ((16,), _PREVIEW_QWEN),
    "krea_2": ((16,), _PREVIEW_QWEN),
    "longcat_video_avatar_v1.5": ((16,), _PREVIEW_QWEN),
    "qwen_image_2.1": ((64,), _PREVIEW_QWEN21),
    "hunyuan_video": ((16,), _PREVIEW_HUNYUAN),
    "wan_v2.2_5b": ((48,), _PREVIEW_WAN22),
    "minimax_h3": ((24,), _PREVIEW_MINIMAX),
    "kandinsky2.1": ((4,), "kandinsky"),
    "hidream_o1": ((3072,), "patches"),
    "wurstchen_v3.0_stage_b": ((3, 4), "wurst"),
    "wurstchen_v3.0_stage_c": ((3, 4), "wurst"),
}


def _preview_affine(latent, converter):
    weights, bias, scale = converter
    rgb = (latent @ weights.T + bias) * scale
    if scale == 127.5:
        rgb += 127.5
    return rgb


def _preview_kandinsky(latent):
    lab = latent @ np.array([
        [-0.051509, -0.028686, -0.0068242],
        [0.039954, -0.0061331, 0.0068562],
        [0.039893, -0.016837, -0.03415],
        [-0.087302, 0.016139, 0.00056286],
    ]) + [0.88591, 0.0018263, 0.0096209]
    lms = lab @ np.array([
        [1, 1, 1],
        [0.3963377774, -0.1055613458, -0.0894841775],
        [0.2158037573, -0.0638541728, -1.2914855480],
    ])
    linear_rgb = (lms * lms * lms) @ np.array([
        [4.0767416621, -1.2684380046, -0.0041960863],
        [-3.3077115913, 2.6097574011, -0.7034186147],
        [0.2309699292, -0.3413193965, 1.7076147010],
    ])
    # Mirror the pinned Swift linearsRGBTosRGB, including its inverse-style
    # transfer curve. Changing this to the usual sRGB encoding changes previews.
    rgb = linear_rgb / 12.92
    high = linear_rgb >= 0.04045
    rgb[high] = ((linear_rgb[high] + 0.055) / 1.055) ** 2.4
    return rgb * 255


def _preview_minimax_audio_height(frames, width):
    if frames not in (1, 2) and (frames < 7 or (frames - 2) % 5 != 0):
        return None
    video_frames = 1 if frames == 1 else (frames - 2) // 5 * 17 + 5
    # Positive half-away rounding, as used by Swift Double.rounded().
    audio_rows = 2 * int(np.floor(video_frames / 24 * 40 + 0.5))
    row_size = frames * width * 24
    height = (audio_rows * 32 + row_size - 1) // row_size
    while height * row_size % 32:
        height += 1
    return height


def decode_preview(preview, version):
    """Decode the first latent frame as RGBA, or ignore unsupported/bad previews.

    These inexpensive tensor previews follow Draw Things ImageConverter.cgImages;
    LTX-2 / LTX-2.3 require learned decoders and are intentionally unsupported.
    """
    if type(version) is not str:
        return None
    version = version.lower()
    spec = _PREVIEW_CONVERTERS.get(version)
    if spec is None:
        return None

    # Preview decoding is optional and must never abort image generation.
    try:
        header = np.frombuffer(preview, dtype="<u4", count=17)
        if (header[0] not in (0, 1012247)
                or header[1] != CCV_TENSOR_CPU_MEMORY
                or header[2] != CCV_TENSOR_FORMAT_NHWC
                or header[3] != CCV_16F or np.any(header[9:])):
            return None
        frames, height, width, channels = map(int, header[5:9])
        allowed_channels, converter = spec
        if (frames <= 0 or not 0 < height <= MAX_RESOLUTION
                or not 0 < width <= MAX_RESOLUTION or channels not in allowed_channels):
            return None
        if converter == "patches" and max(height, width) * 32 > MAX_RESOLUTION:
            return None

        expected = frames * height * width * channels
        payload = preview[68:]
        if header[0] == 1012247:
            latent = np.asarray(fpzip.decompress(payload, order="C"))
            if latent.size != expected:
                return None
            # Match the transport's Float16 conversion, including overflow.
            with np.errstate(over="ignore", invalid="ignore"):
                latent = latent.astype(np.float16).reshape(frames, height, width, channels)
        else:
            if len(payload) != expected * 2:
                return None
            latent = np.frombuffer(payload, dtype="<f2").reshape(frames, height, width, channels)

        # Audio packing depends on the full temporal dimension, before frame 0.
        if version == "minimax_h3":
            audio_height = _preview_minimax_audio_height(frames, width)
            if audio_height is None or audio_height >= height:
                return None
            height -= audio_height
        latent = latent[0, :height].astype(np.float64)
        with np.errstate(over="ignore", invalid="ignore"):
            if converter == "patches":
                rgb = latent.reshape(height, width, 3, 32, 32)
                rgb = rgb.transpose(0, 3, 1, 4, 2).reshape(height * 32, width * 32, 3)
                rgb = (rgb + 1) * 127.5
            elif converter == "kandinsky":
                rgb = _preview_kandinsky(latent)
            elif converter == "wurst":
                if channels == 3:
                    rgb = latent * 255
                    rgb = np.copysign(np.floor(np.abs(rgb) + 0.5), rgb)
                else:
                    rgb = _preview_affine(latent, _PREVIEW_WURST)
            else:
                rgb = _preview_affine(latent, converter)
            # Swift maps all nonfinite results to zero and truncates finite bytes.
            rgb = np.where(np.isfinite(rgb), rgb, 0)
            rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
        rgba[..., :3] = rgb
        rgba[..., 3] = 255
        return Image.fromarray(rgba, "RGBA")
    except Exception:
        return None


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
