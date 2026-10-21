"""Run: .venv/bin/python -m unittest discover -s tests -p test_config.py"""

import importlib
from pathlib import Path
import sys
import types
import unittest

import flatbuffers

# Load the real config module without starting the ComfyUI extension.
_PACKAGE = "_config_test_src"
_package = types.ModuleType(_PACKAGE)
_package.__path__ = [str(Path(__file__).resolve().parents[1] / "src")]
sys.modules[_PACKAGE] = _package
_config = importlib.import_module(f"{_PACKAGE}.config")


class ConfigTests(unittest.TestCase):
    def test_sd3_large_applies_visible_prompt_and_cfg_options(self):
        config = _config.build_config(
            {
                "version": "sd3_large",
                "res_dpt_shift": True,
                "cfg_zero_star": True,
                "cfg_zero_star_init_steps": 3,
                "separate_clip_l": True,
                "clip_l_text": "CLIP-L prompt",
                "separate_open_clip_g": True,
                "open_clip_g_text": "OpenCLIP-G prompt",
            }
        )
        self.assertTrue(config.resolutionDependentShift)
        self.assertTrue(config.cfgZeroStar)
        self.assertEqual(config.cfgZeroInitSteps, 3)
        self.assertTrue(config.separateClipL)
        self.assertEqual(config.clipLText, "CLIP-L prompt")
        self.assertTrue(config.separateOpenClipG)
        self.assertEqual(config.openClipGText, "OpenCLIP-G prompt")

    def test_new_models_apply_resolution_dependent_shift(self):
        for version in (
            "cosmos2.5_2b",
            "ideogram_4",
            "krea_2",
            "minimax_h3",
            "qwen_image_2.1",
            "seedvr2_3b",
            "seedvr2_7b",
        ):
            with self.subTest(version=version):
                config = _config.build_config(
                    {
                        "version": version,
                        "res_dpt_shift": True,
                    }
                )
                self.assertTrue(config.resolutionDependentShift)

    def test_wan_22_applies_frames_and_causal_inference(self):
        config = _config.build_config(
            {
                "version": "wan_v2.2_5b",
                "num_frames": 18,
                "causal_inference": 9,
                "causal_inference_pad": 8,
            }
        )
        self.assertEqual(config.numFrames, 21)
        self.assertTrue(config.causalInferenceEnabled)
        self.assertEqual(config.causalInference, 3)
        self.assertEqual(config.causalInferencePad, 2)

    def test_minimax_applies_frames_and_tea_cache(self):
        config = _config.build_config(
            {
                "version": "minimax_h3",
                "num_frames": 18,
                "tea_cache": True,
                "tea_cache_start": 7,
                "tea_cache_end": -2,
                "tea_cache_threshold": 0.4,
                "tea_cache_max_skip_steps": 5,
            }
        )
        self.assertEqual(config.numFrames, 21)
        self.assertTrue(config.teaCache)
        self.assertEqual(config.teaCacheStart, 7)
        self.assertEqual(config.teaCacheEnd, -2)
        self.assertEqual(config.teaCacheThreshold, 0.4)
        self.assertEqual(config.teaCacheMaxSkipSteps, 5)

    def test_hidream_applies_open_clip_but_ignores_hidden_tea_cache(self):
        config = _config.build_config(
            {
                "version": "hidream_i1",
                "separate_open_clip_g": True,
                "open_clip_g_text": "separate prompt",
                "tea_cache": True,
            }
        )
        self.assertTrue(config.separateOpenClipG)
        self.assertEqual(config.openClipGText, "separate prompt")
        self.assertFalse(config.teaCache)

    def test_hidden_guidance_values_are_ignored(self):
        default = _config.GenerationConfigurationT()
        for version in ("qwen_image", "flux2_4b", "flux2_9b"):
            with self.subTest(version=version):
                config = _config.build_config(
                    {
                        "version": version,
                        "speed_up": False,
                        "guidance_embed": 9,
                    }
                )
                self.assertTrue(config.speedUpWithGuidanceEmbed)
                self.assertEqual(config.guidanceEmbed, default.guidanceEmbed)
        config = _config.build_config(
            {
                "version": "flux2",
                "speed_up": False,
                "guidance_embed": 9,
            }
        )
        self.assertFalse(config.speedUpWithGuidanceEmbed)
        self.assertEqual(config.guidanceEmbed, 9)

    def test_hidden_cfg_zero_values_are_ignored(self):
        for version in ("v1", "v2", "svd_i2v", "unknown", None):
            with self.subTest(version=version):
                config = _config.build_config(
                    {
                        "version": version,
                        "cfg_zero_star": True,
                        "cfg_zero_star_init_steps": 3,
                        "res_dpt_shift": True,
                    }
                )
                self.assertFalse(config.cfgZeroStar)
                self.assertEqual(config.cfgZeroInitSteps, 0)
                self.assertFalse(config.resolutionDependentShift)

    def test_frame_rounding_preserves_ltx_alias_and_svd(self):
        for version, expected in (
            ("ltx2", 25),
            ("ltx2.3", 25),
            ("ltx2_3", 25),
            ("svd_i2v", 18),
            ("wan_v2.1_14b", 21),
            ("hunyuan_video", 21),
        ):
            with self.subTest(version=version):
                config = _config.build_config(
                    {
                        "version": version,
                        "num_frames": 18,
                    }
                )
                self.assertEqual(config.numFrames, expected)

    def test_config_serializes_with_shared_capabilities(self):
        config = _config.build_config(
            {
                "version": "minimax_h3",
                "num_frames": 18,
                "res_dpt_shift": True,
                "tea_cache": True,
            }
        )
        builder = flatbuffers.Builder(0)
        builder.Finish(config.Pack(builder))
        generated = importlib.import_module(f"{_PACKAGE}.generated.config_generated")
        restored = generated.GenerationConfiguration.GetRootAs(builder.Output(), 0)
        self.assertEqual(restored.NumFrames(), 21)
        self.assertTrue(restored.ResolutionDependentShift())
        self.assertTrue(restored.TeaCache())


if __name__ == "__main__":
    unittest.main()
