"""Focused preview tests. Run: .venv/bin/python -m unittest discover -s tests -p test_decode_preview.py

The RGB goldens below were evaluated independently from Draw Things
ImageConverter.cgImages Swift scalar expressions (lines 1381-1840), using zero,
positive/negative channel bases and four mixed vectors. They intentionally store
pixels rather than importing or repeating the production coefficient registry.
"""

import importlib.util
from pathlib import Path
import struct
import sys
import types
import unittest

import fpzip
import numpy as np

# Avoid the extension root __init__, which requires a running ComfyUI installation.
_PACKAGE = "_preview_test_src"
_package = types.ModuleType(_PACKAGE)
_package.__path__ = [str(Path(__file__).resolve().parents[1] / "src")]
sys.modules[_PACKAGE] = _package
_spec = importlib.util.spec_from_file_location(
    f"{_PACKAGE}.image_handlers", Path(_package.__path__[0]) / "image_handlers.py"
)
_handler = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = _handler
_spec.loader.exec_module(_handler)
decode_preview = _handler.decode_preview


def tensor_packet(values, compressed=False, **fields):
    values = np.asarray(values, dtype=np.float16)
    assert values.ndim == 4
    header = [0] * 17
    header[0:4] = [1012247 if compressed else 0, 1, 2, 0x20000]
    header[5:9] = values.shape
    for index, value in fields.items():
        header[int(index)] = value
    payload = (
        fpzip.compress(values.astype(np.float32), order="C")
        if compressed
        else values.astype("<f2").tobytes()
    )
    return struct.pack("<17I", *header) + payload


def probe_vectors(channels):
    mixed = ((np.arange(4 * channels).reshape(4, channels) * 7 + 3) % 23 - 11) / 4
    return np.concatenate(
        [np.zeros((1, channels)), np.eye(channels) * 2, -np.eye(channels) * 2, mixed]
    ).astype(np.float16)


# Family: (channels, independently computed RGB pixels for probe_vectors).
GOLDENS = {
    "v1": (
        4,
        "636363c6b6b49db88934959f140000001112290e3d933227b2c9ff38abff4bf3ffe7ac6d530009",
    ),
    "sd3": (
        16,
        "9e9a988696aba5aab0d0b2a3b3a3afaca18b9db69fb6a2a29cb5ba999ba9919e91b5b3b096a88aa6a6ae9c99838e8e90"
        "797579b59f84968a7f6b838c8892818f93a49e7e9085928d9f8075a29a86aa979e86817fa58da5958f819f9bacada69f"
        "c2c0b6ae8e71d67851c388a6d9bcbf",
    ),
    "flux1": (
        16,
        "7b7674727c867c7b86826569767a8491887d7b8077858c8b75716e757c929589696e7b748676739089875b6958745f67"
        "5b5d608470637a706374877f7f726465636c7b6c7170605d817b7b816f5661637f8871747076756662619b8390828c81"
        "9b8f88e3a58a7e7e5544927776ad6b",
    ),
    "flux2": (
        32,
        "7b76747c7976878189787885b1c3d17f75737f7870718d6e79787721314a736d707878748e785c7f7a767a75717c7a76"
        "6376797b77778277717a75739a75767e78787e74747d78737b74736f716c7d7672827575807a73726a68798084797673"
        "786a647973726e6b5f7d7364442917777776777378855f7a7c7371d5bb9f827f797e747468748c7772727c77777a7172"
        "93766f7a75717474777b76755c77727873717778747873767b7875877b7c7876767377747572758381807d6c657d7675"
        "7e8284111e00cae9faffffba000000",
    ),
    "qwen21": (
        64,
        "6f67586b6453706a58807354797857736c5a736f5c746e5b6c604e7467565465616a6154686852745d586c6351797263"
        "6b5f58786a5d6c65556760516c635472655a6f68587769616862575d675c6e6b6c726856696c566e66556f6c5e72695a"
        "6d5f556f685a6e6f517e82767265576d6857746d5f6e675d7b6d5b736e59957c6c6c685874685773685877685a715d36"
        "52574376715f7984646c6451786b5b786d5f795c3e6e655968724f706856645e4c6f65586a63567069536d65546e6556"
        "75695a736a5c6f64575f5b5b6656586b63566c5f536a6154736e616b685a8a694f746d5b77675d6a7158736b5f655c4c"
        "73705767645273695b786e5e736c5b6d695570665768664e776c598267547063436d665976635a70685a7063526d6556"
        "726f5b70675571605e604c3a6d6a587267586b61507167536461546c60564a53437266576b66586c66576867556e7279"
        "8d776c695e50664a4c736a5f676354676251667271716a56765d616e675a7b71636f6a58756c596e665c72695b716959"
        "6a65556364cb096c05936ee00d6807",
    ),
    "hunyuan": (
        16,
        "827d7578748194918386646e8576627d7d7b6e766569836472726b706d5f6e776ca0a68ea08880474c537b8760726363"
        "89714a8c856a7068687f957c7f8389887c709783869b768693877f948c8c97827f64535d64726bbdae9889728a929688"
        "7c89a10f201d2c46008cc08476beb1",
    ),
    "wan21": (
        16,
        "68745446499f797e5fc3b58171b07870794c6f5c430f0c0a6ca4875d7b3147877e79c171688364488c7f696454c0ae9f"
        "9a8b84899f09566a490d33285e3830606f5d608c65c0db9f634322726d7789612a562737676544885c296684540f3a09"
        "355d25000000000000000045004040",
    ),
    "wan22": (
        48,
        "7f7f7f82828064728383898c6a6e8e909594868b9687878e7978808a7c86737d7a8885816b959a8d868d7f8e8a77716f"
        "7880868d868876777878655f9a8d8f7d757e8990c88183817f7b818770795a687391948a77707a8989846c777f8da0a2"
        "7e77758577876e6e7b747e7e83827d7a7f87aea4b876888727254c7373746e7b937c81836d73677b807f8a8b898c7376"
        "6a83807c7c7e9a8c7b7b75729490706e696a78736877777085867e7482788b818476797d9369647178717f7074878d8f"
        "867e7871787688878686999f64716f818980756e367d7b7d7f837d778e85a4968b6d6a74878e8475757a92877f715e5c"
        "8087897987779090838a80807b7c81847f77505a46887677d7d9b28b8b8a90836b827d7b918b97837e7f747375728b88"
        "947b7ef4ffe0723300369cc47a4b65",
    ),
    "sdxl": (
        4,
        "8d7f72ece9e6537c7ba5996b41473d2f1400c78269756579d9b7a7a76e3a9d9c634e809fecb6ae",
    ),
    "wurst": (
        4,
        "8f8378a3ad88657a74576d778b5d257b5969b98c7dc79a7993a9cc5b78d12867a3969878dba057",
    ),
    "minimax": (
        24,
        "867c76828271ad9f978d6f418652237a8063898074968c928f9292827d7fffffff80726d7e75718c8183717271827f85"
        "8c7f6e84796f837b78867d73a196988b80788378717e7a7187817d8b767a6059557f89ab87a6c8937989837978776d5a"
        "7d665a8b7b6d0000008d867f8f847a8177699c867b8b7a6681797e887f7c8a7d74867c796b63548278738a817b8f7f7b"
        "85786fffffff001f43506332ffc89a",
    ),
    "kandinsky": (
        4,
        "7a6f5f104437c7d48b53e7ff311515ffa89f483740972d0bffffffffffffffffffb36615060807",
    ),
}

VERSIONS = {
    "v1": ("v1", "v2", "svd_i2v"),
    "sd3": ("sd3", "sd3_large"),
    "flux1": ("flux1", "hidream_i1", "z_image", "seedvr2_3b", "seedvr2_7b"),
    "flux2": ("ernie_image", "flux2", "flux2_9b", "flux2_4b", "flux3_5b", "ideogram_4"),
    "qwen21": ("qwen_image_2.1",),
    "hunyuan": ("hunyuan_video",),
    "wan21": (
        "wan_v2.1_1.3b",
        "wan_v2.1_14b",
        "qwen_image",
        "cosmos2.5_2b",
        "krea_2",
        "longcat_video_avatar_v1.5",
    ),
    "wan22": ("wan_v2.2_5b",),
    "sdxl": ("sdxl_base_v0.9", "sdxl_refiner_v0.9", "ssd_1b", "pixart", "auraflow"),
    "kandinsky": ("kandinsky2.1",),
    "wurst": ("wurstchen_v3.0_stage_c", "wurstchen_v3.0_stage_b"),
    "minimax": ("minimax_h3",),
}


def audio_height(frames, width):
    # MiniMaxH3.swift lines 14-32; Swift rounded() rounds positive ties up.
    video_frames = 1 if frames == 1 else (frames - 2) // 5 * 17 + 5
    rows = 2 * int(video_frames / 24 * 40 + 0.5)
    row_size = frames * width * 24
    height = (rows * 32 + row_size - 1) // row_size
    while height * row_size % 32:
        height += 1
    return height


class DecodePreviewTests(unittest.TestCase):
    def assert_rgba(self, image, expected):
        self.assertIsNotNone(image)
        self.assertEqual(image.mode, "RGBA")
        np.testing.assert_array_equal(np.asarray(image), expected)

    def test_all_35_canonical_versions_against_independent_goldens(self):
        self.assertEqual(sum(map(len, VERSIONS.values())) + 1, 35)  # plus HiDream O1
        for family, versions in VERSIONS.items():
            channels, rgb_hex = GOLDENS[family]
            vectors = probe_vectors(channels)
            expected = np.full((1, len(vectors), 4), 255, dtype=np.uint8)
            expected[0, :, :3] = np.frombuffer(
                bytes.fromhex(rgb_hex), np.uint8
            ).reshape(-1, 3)
            height = 1 + (audio_height(1, len(vectors)) if family == "minimax" else 0)
            data = np.zeros((1, height, len(vectors), channels), np.float16)
            data[0, 0] = vectors
            for version in versions:
                for compressed in (False, True):
                    with self.subTest(version=version, compressed=compressed):
                        self.assert_rgba(
                            decode_preview(tensor_packet(data, compressed), version),
                            expected,
                        )

    def test_hidream_o1_planar_channels_and_patch_grid(self):
        # Distinct patch, row, column and channel values catch planar/interleaved
        # confusion as well as either transposition in the patch rearrangement.
        patches = np.zeros((2, 2, 3, 3072), np.float16)
        for py in range(2):
            for px in range(3):
                planes = patches[0, py, px].reshape(3, 32, 32)
                planes[0] = (py * 3 + px - 3) / 4
                planes[1] = (np.arange(32)[:, None] - 16) / 16
                planes[2] = (np.arange(32)[None, :] - 16) / 16
        patches[1] = 1  # The single-image API must select frame zero.
        expected = np.full((64, 96, 4), 255, np.uint8)
        for y in range(64):
            for x in range(96):
                expected[y, x, :3] = [
                    int((((y // 32) * 3 + x // 32 - 3) / 4 + 1) * 127.5),
                    int(((y % 32 - 16) / 16 + 1) * 127.5),
                    int(((x % 32 - 16) / 16 + 1) * 127.5),
                ]
        for compressed in (False, True):
            with self.subTest(compressed=compressed):
                self.assert_rgba(
                    decode_preview(tensor_packet(patches, compressed), "hidream_o1"),
                    expected,
                )

    def test_wurstchen_rgb_normalization_rounding_clipping_and_nonfinite(self):
        data = np.array(
            [[[[0, 0.5, 1], [-1, 2, 0.25], [np.nan, np.inf, -np.inf]]]], np.float16
        )
        expected = np.array(
            [[[0, 128, 255, 255], [0, 255, 64, 255], [0, 0, 0, 255]]], np.uint8
        )
        for version in VERSIONS["wurst"]:
            self.assert_rgba(decode_preview(tensor_packet(data), version), expected)

    def test_affine_truncation_clipping_and_nonfinite(self):
        data = np.array(
            [
                [
                    [
                        [0, 0, 0, 0],
                        [100, 0, 0, 0],
                        [-100, 0, 0, 0],
                        [np.nan, 0, 0, 0],
                        [np.inf, 0, 0, 0],
                        [-np.inf, 0, 0, 0],
                    ]
                ]
            ],
            np.float16,
        )
        expected = np.array(
            [
                [
                    [99, 99, 99, 255],
                    [255, 255, 255, 255],
                    [0, 0, 0, 255],
                    [0, 0, 0, 255],
                    [0, 0, 0, 255],
                    [0, 0, 0, 255],
                ]
            ],
            np.uint8,
        )
        self.assert_rgba(decode_preview(tensor_packet(data), "v1"), expected)

    def test_multiple_frames_return_first_full_frame(self):
        data = np.zeros((3, 2, 3, 4), np.float16)
        data[1] = 20
        data[2] = -20
        data[0, 1, 2] = [1, 0, 0, 0]
        expected = np.full((2, 3, 4), [99, 99, 99, 255], np.uint8)
        expected[1, 2] = [149, 140, 139, 255]
        for compressed in (False, True):
            self.assert_rgba(
                decode_preview(tensor_packet(data, compressed), "v1"), expected
            )

    def test_minimax_audio_crop_uses_batch_count_and_ignores_audio(self):
        for frames in (1, 2, 7):
            for compressed in (False, True):
                with self.subTest(frames=frames, compressed=compressed):
                    width = 4
                    crop = audio_height(frames, width)
                    data = np.full((frames, 2 + crop, width, 24), 30, np.float16)
                    data[0, :2] = 0
                    expected = np.full((2, width, 4), [134, 124, 118, 255], np.uint8)
                    self.assert_rgba(
                        decode_preview(tensor_packet(data, compressed), "minimax_h3"),
                        expected,
                    )

    def test_minimax_invalid_temporal_layout_or_audio_only_returns_none(self):
        for frames in (3, 4, 5, 6, 8):
            with self.subTest(frames=frames):
                self.assertIsNone(
                    decode_preview(
                        tensor_packet(np.zeros((frames, 10, 4, 24))), "minimax_h3"
                    )
                )
        for frames in (1, 2, 7):
            with self.subTest(frames=frames):
                self.assertIsNone(
                    decode_preview(
                        tensor_packet(
                            np.zeros((frames, audio_height(frames, 4), 4, 24))
                        ),
                        "minimax_h3",
                    )
                )

    def test_family_channel_mismatches_return_none(self):
        for family, versions in VERSIONS.items():
            correct = GOLDENS[family][0]
            for channels in (3, 4, 16, 24, 32, 48, 64, 128, 3072):
                if channels == correct or (family == "wurst" and channels == 3):
                    continue
                for version in versions:
                    with self.subTest(version=version, channels=channels):
                        self.assertIsNone(
                            decode_preview(
                                tensor_packet(np.zeros((1, 1, 1, channels))), version
                            )
                        )
        for channels in (3, 4, 16, 128):
            self.assertIsNone(
                decode_preview(
                    tensor_packet(np.zeros((1, 1, 1, channels))), "hidream_o1"
                )
            )

    def test_unsupported_versions_return_none(self):
        packet = tensor_packet(np.zeros((1, 1, 1, 16)))
        for version in (
            "ltx2",
            "ltx2.3",
            "unknown",
            "flux99",
            "sd3_fake",
            "sdxl_fake",
            None,
            1,
            b"v1",
        ):
            with self.subTest(version=version):
                self.assertIsNone(decode_preview(packet, version))

    def test_short_headers_and_payloads_return_none(self):
        packet = tensor_packet(np.zeros((2, 2, 3, 4)))
        for length in (0, 1, 4, 16, 64, 67, 68, 69, len(packet) - 1, len(packet) - 48):
            with self.subTest(length=length):
                self.assertIsNone(decode_preview(packet[:length], "v1"))

    def test_malformed_headers_return_none(self):
        data = np.zeros((1, 2, 3, 4))
        for index, value in (
            (0, 777),
            (1, 2),
            (2, 1),
            (3, 0x4000),
            (5, 0),
            (6, 0),
            (7, 0),
            (8, 0),
            (9, 1),
            (16, 1),
            (5, 0xFFFFFFFF),
            (6, 0xFFFFFFFF),
        ):
            with self.subTest(index=index, value=value):
                self.assertIsNone(
                    decode_preview(tensor_packet(data, **{str(index): value}), "v1")
                )
        for value in (None, "not bytes", 123, object()):
            with self.subTest(value=value):
                self.assertIsNone(decode_preview(value, "v1"))

    def test_corrupt_or_shape_mismatched_fpzip_returns_none(self):
        data = np.zeros((2, 2, 3, 4))
        packet = tensor_packet(data, True)
        for bad in (packet[:68], packet[:75], packet[:68] + b"not fpzip"):
            with self.subTest(length=len(bad)):
                self.assertIsNone(decode_preview(bad, "v1"))
        for index, value in ((5, 3), (6, 3), (7, 4)):
            with self.subTest(index=index):
                self.assertIsNone(
                    decode_preview(
                        tensor_packet(data, True, **{str(index): value}), "v1"
                    )
                )


if __name__ == "__main__":
    unittest.main()
