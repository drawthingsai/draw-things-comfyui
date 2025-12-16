import sys

if sys.version_info < (3, 11):
    from typing_extensions import TypedDict
else:
    from typing import TypedDict
from torch import Tensor

ModelInfo = TypedDict(
    "ModelInfo", {"file": str, "name": str, "version": str, "prefix": str}
)
ControlNetInfo = TypedDict(
    "ControlNetInfo",
    {
        "file": str,
        "name": str,
        "version": str,
        "modifier": str,
        "type": str,
        "global_average_pooling": bool,
    },
)
LoRAInfo = TypedDict(
    "LoRAInfo", {"file": str, "name": str, "version": str, "prefix": str, "mode": str}
)
UpscalerInfo = TypedDict(
    "UpscalerInfo",
    {
        "file": str,
        "name": str,
    },
)
TextualInversionInfo = TypedDict(
    "TextualInversionInfo",
    {
        "file": str,
        "keyword": str,
        "name": str,
        "version": str,
    },
)
ModelsInfo = TypedDict(
    "ModelsInfo",
    {
        "models": list[ModelInfo],
        "controlNets": list[ControlNetInfo],
        "loras": list[LoRAInfo],
        "upscalers": list[UpscalerInfo],
        "textualInversions": list[TextualInversionInfo],
    },
)

LoraStackItem = TypedDict(
    "LoraStackItem",
    {"model": LoRAInfo, "weight": float, "mode": str},
)
LoraStack = list[LoraStackItem]

ControlStackItem = TypedDict(
    "ControlStackItem",
    {
        "model": ControlNetInfo,
        "input_type": str,
        "mode": str,
        "weight": float,
        "start": float,
        "end": float,
        "image": Tensor | None,
        "global_average_pooling": bool,
        "down_sampling_rate": float,
        "target_blocks": str,
        "hint_type": str | None,
    },
)
ControlStack = list[ControlStackItem]

HintStackItem = TypedDict(
    "HintStackItem", {"type": str, "image": Tensor, "weight": float}
)
HintStack = list[HintStackItem]


# this should match kwargs in the sampler node method
class Config(TypedDict, total=False):
    settings: str
    server: str
    port: str
    use_tls: bool
    width: int
    height: int
    seed: int
    seed_mode: str
    steps: int
    cfg: float
    strength: float
    sampler_name: str
    batch_count: int
    batch_size: int
    clip_skip: int
    mask_blur: float
    mask_blur_outset: int
    sharpness: float
    shift: float
    preserve_original: bool
    res_dpt_shift: bool
    image_guidance_scale: float

    model: str
    version: str
    control_net: ControlStack
    lora: LoraStack
    upscaler: dict
    # upscaler_scale_factor: int
    # refiner_model: str
    # refiner_start: float
    refiner: dict

    num_frames: int
    fps: int
    motion_scale: int
    guiding_frame_noise: float
    start_frame_guidance: float
    causal_inference: int
    causal_inference_pad: int

    # conditional
    high_res_fix: bool
    high_res_fix_start_width: int
    high_res_fix_start_height: int
    high_res_fix_strength: float

    tiled_decoding: bool
    decoding_tile_width: int
    decoding_tile_height: int
    decoding_tile_overlap: int

    tiled_diffusion: bool
    diffusion_tile_width: int
    diffusion_tile_height: int
    diffusion_tile_overlap: int

    separate_clip_l: bool
    clip_l_text: str

    separate_open_clip_g: bool
    open_clip_g_text: str

    speed_up: bool
    guidance_embed: float

    tea_cache_start: int
    tea_cache_end: int
    tea_cache_threshold: float
    tea_cache: bool
    tea_cache_max_skip_steps: int

    # face_restoration: str
    # decode_with_attention: bool
    # hires_fix_decode_with_attention: int
    # clip_weight: int
    # negative_prompt_for_image_prior: int
    # image_prior_steps: int
    # original_image_height: int
    # original_image_width: int
    # crop_top: int
    # crop_left: int
    # target_image_height: int
    # target_image_width: int
    # aesthetic_score: int
    # negative_aesthetic_score: int
    # zero_negative_prompt: int
    # negative_original_image_height: int
    # negative_original_image_width: int
    # name: int

    # stage_2_steps: int
    # stage_2_cfg: int
    # stage_2_shift: int
    stochastic_sampling_gamma: int
    # t5_text_encoder: int
    # separate_t5: int
    # t5_text: int
    # causal_inference_enabled: bool


class DrawThingsLists:
    dtserver = "localhost"
    dtport = "7859"

    sampler_list = [
        "DPM++ 2M Karras",
        "Euler A",
        "DDIM",
        "PLMS",
        "DPM++ SDE Karras",
        "UniPC",
        "LCM",
        "Euler A Substep",
        "DPM++ SDE Substep",
        "TCD",
        "Euler A Trailing",
        "DPM++ SDE Trailing",
        "DPM++ 2M AYS",
        "Euler A AYS",
        "DPM++ SDE AYS",
        "DPM++ 2M Trailing",
        "DDIM Trailing",
        "UniPC Trailing",
        "UniPC AYS",
    ]

    seed_mode = [
        "Legacy",
        "TorchCpuCompatible",
        "ScaleAlike",
        "NvidiaGpuCompatible",
    ]

    control_mode = [
        "Balanced",
        "Prompt",
        "Control",
    ]

    control_input_type = [
        "Unspecified",
        "Custom",
        "Depth",
        "Canny",
        "Scribble",
        "Pose",
        "Normalbae",
        "Color",
        "Lineart",
        "Softedge",
        "Seg",
        "Inpaint",
        "Ip2p",
        "Shuffle",
        "Mlsd",
        "Tile",  # down_sampling_rate
        "Blur",  # down_sampling_rate
        "Lowquality",  # down_sampling_rate
        "Gray",
    ]

    control_input_type_mapping = {
        None: None,
        "Unspecified": None,
        "Custom": "custom",
        "Depth": "depth",
        "Canny": "custom",
        "Scribble": "scribble",
        "Pose": "pose",
        "Normalbae": "custom",
        "Color": "color",
        "Lineart": "custom",
        "Softedge": "custom",
        "Seg": "custom",
        "Inpaint": "custom",
        "Ip2p": None,
        "Shuffle": "shuffle",
        "Mlsd": "custom",
        "Tile": "custom",  # down_sampling_rate
        "Blur": "custom",  # down_sampling_rate
        "Lowquality": "custom",  # down_sampling_rate
        "Gray": "custom",
    }

    lora_mode = [
        "All",
        "Base",
        "Refiner",
    ]

    target_blocks = ["All", "Style", "Style and Layout"]

    hint_types = [
        "(None selected)",
        "Depth",
        "Pose",
        "Scribble",
        "Color",
        "Shuffle (Moodboard)",
        "Custom",
    ]

    hint_types_mapping = {
        None: None,
        "(None selected)": None,
        "Depth": "depth",
        "Pose": "pose",
        "Scribble": "scribble",
        "Color": "color",
        "Shuffle (Moodboard)": "shuffle",
        "Custom": "custom",
    }
