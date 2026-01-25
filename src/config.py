import numpy as np

from .generated.config_generated import ControlT, LoRAT, GenerationConfigurationT
from .data_types import Config, ControlNetInfo, DrawThingsLists


def round_by_64(x):
    return round((x if np.isfinite(x) else 0) / 64) * 64


def clamp(x, min_val=64, max_val=2048):
    return int(max(min(x if np.isfinite(x) else 0, max_val), min_val))


def clamp_f(x, min_val, max_val):
    return float(max(min(x if np.isfinite(x) else 0, max_val), min_val))


def all_in(list, *args):
    for arg in args:
        if arg not in list:
            return False
    return True


class ModelVersion:
    def __init__(self, version):
        self.version = version

    @property
    def res_dpt_shift(self):
        return self.version in [
            "flux1",
            "sd3",
            "hidream_i1",
            "qwen_image",
            "z_image",
            "flux2",
            "flux2_4b",
            "flux2_9b",
        ]

    @property
    def video(self):
        return self.version in [
            "hunyuan_video",
            "wan_v2.1_1.3b",
            "wan_v2.1_14b",
            "svd_i2v",
        ]

    @property
    def tea_cache(self):
        return self.version in [
            "flux1",
            "hidream_i1",
            "wan_v2.1_1.3b",
            "wan_v2.1_14b",
            "hunyuan_video",
        ]

    @property
    def speed_up(self):
        return self.version in [
            "flux1",
            "hidream_i1",
            "hunyuan_video",
            "qwen_image",
            "flux2",
            "flux2_4b",
            "flux2_9b",
        ]

    @property
    def clip_l(self):
        return self.version in ["flux1", "hidream_i1", "sd3"]

    @property
    def open_clip_g(self):
        return self.version in ["sd3"]

    @property
    def svd(self):
        return self.version in ["svd_i2v"]

    @property
    def causal_inference(self):
        return self.version in ["wan_v2.1_1.3b", "wan_v2.1_14b"]

    @property
    def sdxl(self):
        return self.version in [
            "sdxl_base_v0.9",
            "sdxl_refiner_v0.9",
        ]


class CNetType:
    sdxlTargetBlocks = {
        "All": [],
        "Style": ["up_blocks.0.attentions.1"],
        "Style and Layout": ["down_blocks.2.attentions.1", "up_blocks.0.attentions.1"],
    }
    v1TargetBlocks = {
        "All": [],
        "Style": ["up_blocks.1"],
        "Style and Layout": ["down_blocks.2", "mid_block", "up_blocks.1"],
    }

    def __init__(self, cnet: ControlNetInfo, modifier: str):
        self.cnet = cnet
        self.modifier = modifier.lower()

    @property
    def global_average_pooling(self):
        return self.cnet.get("global_average_pooling")

    @property
    def target_blocks(self):
        return self.cnet.get("modifier") == "shuffle" and self.cnet.get("version") in [
            "v1",
            "sdxl_base_v0.9",
        ]

    def get_target_blocks(self, value: str) -> list[str]:
        if self.cnet.get("version") == "sdxl_base_v0.9":
            return self.sdxlTargetBlocks[value]
        elif self.cnet.get("version") == "v1":
            return self.v1TargetBlocks[value]
        return []

    @property
    def down_sampling_rate(self):
        return self.cnet.get("modifier") in [
            "tile",
            "blur",
            "lowquality",
        ] or self.modifier in ["tile", "blur", "lowquality"]


def build_config(config: Config):
    configT = GenerationConfigurationT()

    apply_common(config, configT)
    apply_conditional(config, configT)
    apply_extra(config, configT)
    apply_control(config, configT)
    apply_lora(config, configT)

    return configT


def apply_extra(config: Config, configT: GenerationConfigurationT):
    if "upscaler" in config and config["upscaler"] is not None:
        upscaler = config["upscaler"]
        if "upscaler_model" in upscaler:
            if (
                "value" in upscaler["upscaler_model"]
                and "file" in upscaler["upscaler_model"]["value"]
            ):
                configT.upscaler = upscaler["upscaler_model"]["value"]["file"]
            elif type(upscaler["upscaler_model"]) is str:
                configT.upscaler = upscaler["upscaler_model"]
            configT.upscalerScaleFactor = upscaler.get("upscaler_scale_factor") or 0

    if "refiner" in config and config["refiner"] is not None:
        refiner = config["refiner"]
        if (
            "refiner_model" in refiner
            and "value" in refiner["refiner_model"]
            and "file" in refiner["refiner_model"]["value"]
        ):
            configT.refinerModel = refiner["refiner_model"]["value"]["file"]
            configT.refinerStart = refiner.get("refiner_start") or 0.7


def apply_control(config: Config, configT: GenerationConfigurationT):
    configT.controls = []

    if (
        "control_net" not in config
        or config["control_net"] is None
        or len(config["control_net"]) == 0
    ):
        return

    for control in config["control_net"]:
        if "model" not in control or "file" not in control["model"]:
            continue
        controlT = ControlT()
        controlT.file = control["model"]["file"]

        cnet = CNetType(control["model"], control.get("input_type"))

        if "weight" in control:
            controlT.weight = control["weight"]
        if "input_type" in control:
            controlT.inputOverride = DrawThingsLists.control_input_type.index(
                control["input_type"].capitalize()
            )
        if "mode" in control:
            controlT.controlMode = DrawThingsLists.control_mode.index(control["mode"])
        if "weight" in control:
            controlT.weight = control["weight"]
        if "start" in control:
            controlT.guidanceStart = control["start"]
        if "end" in control:
            controlT.guidanceEnd = control["end"]

        if cnet.down_sampling_rate and "down_sampling_rate" in control:
            controlT.downSamplingRate = control["down_sampling_rate"]

        if cnet.global_average_pooling and "global_average_pooling" in control:
            controlT.globalAveragePooling = control["global_average_pooling"]
        if not cnet.global_average_pooling:
            controlT.globalAveragePooling = False
        if cnet.target_blocks and "target_blocks" in control:
            controlT.targetBlocks = cnet.get_target_blocks(control["target_blocks"])

        configT.controls.append(controlT)


def apply_lora(config: Config, configT: GenerationConfigurationT):
    configT.loras = []

    if "lora" not in config or config["lora"] is None or len(config["lora"]) == 0:
        return

    for lora in config["lora"]:
        if "model" not in lora or "weight" not in lora:
            continue
        loraT = LoRAT()
        loraT.file = lora["model"]["file"]
        loraT.weight = lora["weight"]
        loraT.mode = DrawThingsLists.lora_mode.index(lora["mode"])

        configT.loras.append(loraT)


def apply_common(config: Config, configT: GenerationConfigurationT):
    if "model" in config:
        configT.model = config["model"]
    if "width" in config:
        configT.startWidth = config["width"] // 64
    if "height" in config:
        configT.startHeight = config["height"] // 64
    if "seed" in config:
        configT.seed = int(config["seed"] % 4294967295)
    if "seed_mode" in config:
        configT.seedMode = DrawThingsLists.seed_mode.index(config["seed_mode"]) or 0
    if "steps" in config:
        configT.steps = config["steps"]
    if "cfg" in config:
        configT.guidanceScale = config["cfg"]
    if "strength" in config:
        configT.strength = config["strength"]
    if "sampler_name" in config:
        configT.sampler = (
            DrawThingsLists.sampler_list.index(config["sampler_name"]) or 0
        )
    if "batch_count" in config:
        configT.batchCount = config["batch_count"]
    if "batch_size" in config:
        configT.batchSize = config["batch_size"]
    if "clip_skip" in config:
        configT.clipSkip = config["clip_skip"]
    if "mask_blur" in config:
        configT.maskBlur = config["mask_blur"]
    if "mask_blur_outset" in config:
        configT.maskBlurOutset = config["mask_blur_outset"]
    if "sharpness" in config:
        configT.sharpness = config["sharpness"]
    if "shift" in config:
        configT.shift = config["shift"]
    if "preserve_original" in config:
        configT.preserveOriginalAfterInpaint = bool(config["preserve_original"])
    # if "image_guidance_scale" in config:
    #     configT.imageGuidanceScale = config["image_guidance_scale"]


def apply_conditional(config: Config, configT: GenerationConfigurationT):
    model = ModelVersion(config.get("version"))
    if config.get("cfg_zero_star"):
        configT.cfgZeroStar = True
        configT.cfgZeroInitSteps = config.get("cfg_zero_star_init_steps")

    if config.get("sampler_name") == "TCD":
        if "stochastic_sampling_gamma" in config:
            configT.stochasticSamplingGamma = config["stochastic_sampling_gamma"]

    if config.get("high_res_fix"):
        configT.hiresFix = True
        if "high_res_fix_start_width" in config:
            configT.hiresFixStartWidth = config["high_res_fix_start_width"] // 64
        if "high_res_fix_start_height" in config:
            configT.hiresFixStartHeight = config["high_res_fix_start_height"] // 64
        if "high_res_fix_strength" in config:
            configT.hiresFixStrength = config["high_res_fix_strength"]

    if config.get("tiled_decoding"):
        configT.tiledDecoding = True
        if "decoding_tile_width" in config:
            configT.decodingTileWidth = config["decoding_tile_width"] // 64
        if "decoding_tile_height" in config:
            configT.decodingTileHeight = config["decoding_tile_height"] // 64
        if "decoding_tile_overlap" in config:
            configT.decodingTileOverlap = config["decoding_tile_overlap"] // 64

    if config.get("tiled_diffusion"):
        configT.tiledDiffusion = True
        if "diffusion_tile_width" in config:
            configT.diffusionTileWidth = config["diffusion_tile_width"] // 64
        if "diffusion_tile_height" in config:
            configT.diffusionTileHeight = config["diffusion_tile_height"] // 64
        if "diffusion_tile_overlap" in config:
            configT.diffusionTileOverlap = config["diffusion_tile_overlap"] // 64

    if model.res_dpt_shift and config.get("res_dpt_shift"):
        configT.resolutionDependentShift = True
    else:
        configT.resolutionDependentShift = False

    # separate_clip_l
    # clip_l_text
    if model.clip_l and config.get("separate_clip_l"):
        configT.separateClipL = True
        if "clip_l_text" in config:
            configT.clipLText = config["clip_l_text"]

    # separate_open_clip_g
    # open_clip_g_text
    if model.open_clip_g and config.get("separate_open_clip_g"):
        configT.separateOpenClipG = True
        if "open_clip_g_text" in config:
            configT.openClipGText = config["open_clip_g_text"]

    # speed_up_with_guidance_embed
    if model.speed_up and not config.get("speed_up"):
        configT.speedUpWithGuidanceEmbed = False
        if "guidance_embed" in config:
            configT.guidanceEmbed = config["guidance_embed"]

    # tea_cache_start
    # tea_cache_end
    # tea_cache_threshold
    # tea_cache
    # tea_cache_max_skip_steps
    if model.tea_cache and config.get("tea_cache"):
        configT.teaCache = True
        if "tea_cache_start" in config:
            configT.teaCacheStart = config["tea_cache_start"]
        if "tea_cache_end" in config:
            configT.teaCacheEnd = config["tea_cache_end"]
        if "tea_cache_threshold" in config:
            configT.teaCacheThreshold = config["tea_cache_threshold"]
        if "tea_cache_max_skip_steps" in config:
            configT.teaCacheMaxSkipSteps = config["tea_cache_max_skip_steps"]

    if model.video and "num_frames" in config:
        configT.numFrames = config["num_frames"]

    if model.svd:
        if "fps" in config:
            configT.fpsId = config["fps"]
        if "motion_scale" in config:
            configT.motionBucketId = config["motion_scale"]
        if "guiding_frame_noise" in config:
            configT.condAug = config["guiding_frame_noise"]
        if "start_frame_guidance" in config:
            configT.startFrameCfg = config["start_frame_guidance"]

    if model.causal_inference:
        if "causal_inference" in config:
            if config["causal_inference"] > 0:
                configT.causalInferenceEnabled = True
                configT.causalInference = (config["causal_inference"] + 3) // 4
                if "causal_inference_pad" in config:
                    configT.causalInferencePad = config["causal_inference_pad"] // 4
            else:
                configT.causalInferenceEnabled = False

    if model.sdxl:
        if "height" in config:
            configT.originalImageHeight = config["height"]
            configT.targetImageHeight = config["height"]
            configT.negativeOriginalImageHeight = config["height"] // 2
        if "width" in config:
            configT.originalImageWidth = config["width"]
            configT.targetImageWidth = config["width"]
            configT.negativeOriginalImageWidth = config["width"] // 2

    # stochastic_sampling_gamma
