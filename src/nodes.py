#!../../.venv python3

import json
import os
import sys

import grpc
from torchvision.transforms import v2

from .. import cancel_request
from .data_types import *
from .draw_things import dt_sampler, get_files

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "comfy"))


class DrawThingsSampler:
    last_gen_canceled = False

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            # fmt: off
            "required": {
                "settings": (["Basic", "Advanced", "All"], { "default": "Basic" }),
                "server": ("STRING", { "multiline": False, "default": DrawThingsLists.dtserver, "tooltip": "The IP address of the Draw Things gRPC Server." },),
                "port": ("STRING", { "multiline": False, "default": DrawThingsLists.dtport, "tooltip": "The port that the Draw Things gRPC Server is listening on." },),
                "use_tls": ("BOOLEAN", { "default": True }),
                "model": ("DT_MODEL", { "model_type": "models", "tooltip": "The model used for denoising the input latent." },),
                "strength": ("FLOAT", { "default": 1.00, "min": 0.00, "max": 1.00, "step": 0.01, "tooltip": "When generating from an image, a high value allows more artistic freedom from the original. 1.0 means no influence from the existing image (a.k.a. text to image)." },),
                "seed": ("INT", { "default": 0, "min": -1, "max": 4294967295, "control_after_generate": True, "tooltip": "The random seed used for creating the noise." },),
                "seed_mode": (DrawThingsLists.seed_mode, { "default": "ScaleAlike" }),
                "width": ("INT", { "default": 512, "min": 128, "max": 8192, "step": 64}),
                "height": ("INT", { "default": 512, "min": 128, "max": 8192, "step": 64},),
                # upscaler
                "steps": ("INT", { "default": 20, "min": 1, "max": 150, "tooltip": "The number of steps used in the denoising process." },),
                "num_frames": ("INT", { "default": 14, "min": 1, "max": 201, "step": 1}),
                "cfg": ("FLOAT", { "default": 4.5, "min": 0.0, "max": 50.0, "step": 0.1, "round": 0.01, "tooltip": "The Classifier-Free Guidance scale balances creativity and adherence to the prompt. Higher values result in images more closely matching the prompt however too high values will negatively impact quality." },),
                "cfg_zero_star": ("BOOLEAN", { "default": False }),
                "cfg_zero_star_init_steps": ("INT", { "default": 0, "min": 0, "max": 50, "step": 1}),
                "speed_up": ("BOOLEAN", { "default": True}),
                "guidance_embed": ("FLOAT", { "default": 4.5, "min": 0, "max": 50, "step": 0.1},),
                "sampler_name": (DrawThingsLists.sampler_list, { "default": "DPM++ 2M AYS", "tooltip": "The algorithm used when sampling, this can affect the quality, speed, and style of the generated output." },),
                "stochastic_sampling_gamma": ("FLOAT", { "default": 0.3, "min": 0, "max": 1, "step": 0.01},),
                # stochastic_sampling_gamma
                "res_dpt_shift": ("BOOLEAN", { "default": True}),
                "shift": ("FLOAT", { "default": 1.00, "min": 0.10, "max": 16.00, "step": 0.01, "round": 0.01 },),
                "batch_size": ("INT", { "default": 1, "min": 1, "max": 4, "step": 1}),
                # refiner
                "fps": ("INT", { "default": 5, "min": 1, "max": 30, "step": 1}),
                "motion_scale": ("INT", { "default": 127, "min": 0, "max": 255, "step": 1},),
                "guiding_frame_noise": ("FLOAT", { "default": 0.02, "min": 0.00, "max": 1.00, "step": 0.01, "round": 0.01 },),
                "start_frame_guidance": ("FLOAT", { "default": 1.0, "min": 0.0, "max": 25.0, "step": 0.1, "round": 0.1 },),
                "causal_inference": ("INT", { "default": 0, "min": 0, "max": 129, "step": 1, "tooltip": "Set to 0 to disable causal inference" },),
                "causal_inference_pad": ("INT", { "default": 0, "min": 0, "max": 129, "step": 1 },),
                # zero_negative_prompt
                "clip_skip": ("INT", { "default": 1, "min": 1, "max": 23, "step": 1}),
                "sharpness": ("FLOAT", { "default": 0.6,"min": 0.0,"max": 30.0,"step": 0.1,"round": 0.1 }),
                "mask_blur": ("FLOAT", { "default": 1.5, "min": 0.0, "max": 50.0, "step": 0.1, "round": 0.1 },),
                "mask_blur_outset": ("INT", { "default": 0, "min": -100, "max": 1000, "step": 1},),
                "preserve_original": ("BOOLEAN", { "default": True}),
                # face_restoration
                "high_res_fix": ("BOOLEAN", { "default": False}),
                "high_res_fix_start_width": ("INT", { "default": 448, "min": 128, "max": 2048, "step": 64},),
                "high_res_fix_start_height": ("INT", { "default": 448, "min": 128, "max": 2048, "step": 64},),
                "high_res_fix_strength": ("FLOAT", { "default": 0.70, "min": 0.00, "max": 1.00, "step": 0.01, "round": 0.01 },),
                "tiled_decoding": ("BOOLEAN", { "default": False}),
                "decoding_tile_width": ("INT", { "default": 640, "min": 128, "max": 2048, "step": 64},),
                "decoding_tile_height": ("INT", { "default": 640, "min": 128, "max": 2048, "step": 64},),
                "decoding_tile_overlap": ("INT", { "default": 128, "min": 64, "max": 1024, "step": 64},),
                "tiled_diffusion": ("BOOLEAN", { "default": False}),
                "diffusion_tile_width": ("INT", { "default": 512, "min": 128, "max": 2048, "step": 64},),
                "diffusion_tile_height": ("INT", { "default": 512, "min": 128, "max": 2048, "step": 64},),
                "diffusion_tile_overlap": ("INT", { "default": 64, "min": 64, "max": 1024, "step": 64},),
                "tea_cache": ("BOOLEAN", { "default": False}),
                "tea_cache_start": ("INT", { "default": 5, "min": 0, "max": 1000, "step": 1},),
                "tea_cache_end": ("INT", { "default": 2, "min": -151, "max": 150, "step": 1, "tooltip": "A positive value corresponds to last step tea_cache should be appplied. Use a negative value to specify steps from the end+1. IE: -1 is the last step, -2 is the second to last step, and so on."},),
                "tea_cache_threshold": ("FLOAT", { "default": 0.2, "min": 0, "max": 1, "step": 0.01, "round": 0.01},),
                "tea_cache_max_skip_steps": ("INT", { "default": 3, "min": 1, "max": 50, "step": 1},),
                "separate_clip_l": ("BOOLEAN", { "default": False}),
                "clip_l_text": ("STRING", { "forceInput": False}),
                "separate_open_clip_g": ("BOOLEAN", { "default": False}),
                "open_clip_g_text": ("STRING", { "forceInput": False}),
                # ti embed
                # image_guidance_scale
                # decode_with_attention
                # hires_fix_decode_with_attention
                # clip_weight
                # negative_prompt_for_image_prior
                # image_prior_steps
                # sdxl img size !!!
                # aesthetic_score
                # negative_aesthetic_score
                # name ???
                # cond_aug ???
                # stage_2_steps
                # stage_2_cfg
                # stage_2_shift
                # t5_text_encoder
                # separate_t5
                # t5_text
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "scale_factor": ("INT", { "default": 1, "min": 1, "max": 4, "step": 1}),
                "batch_count": ("INT", { "default": 1, "min": 1, "max": 100, "step": 1}),
            },
            "optional": {
                "image": ("IMAGE",),
                "mask": ("MASK", { "tooltip": "A black/white image where black areas will be kept and the rest will be regenerated according to your strength setting." },),
                "positive": ("STRING", { "forceInput": True, "tooltip": "The conditioning describing the attributes you want to include in the image." },),
                "negative": ("STRING", { "forceInput": True, "tooltip": "The conditioning describing the attributes you want to exclude from the image." },),
                "lora": ("DT_LORA",),
                "control_net": ("DT_CNET",),
                "upscaler": ("DT_UPSCALER",),
                "refiner": ("DT_REFINER",),
                "hints": ("DT_HINTS", { "tooltip": "Hint images, or control inputs, are used with ControlNets and certain other models, like Kontext, to help guide the generation." },),
            },
        }
        # fmt: on

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    DESCRIPTION = ""
    FUNCTION = "sample"
    CATEGORY = "DrawThings"

    async def sample(self, **kwargs):
        try:
            await get_files(kwargs["server"], kwargs["port"], kwargs["use_tls"])
        except Exception:
            raise Exception(
                "Couldn't connect to Draw Things gRPC server. Check your server and settings, and try again."
            )

        DrawThingsSampler.last_gen_canceled = False
        model_input = kwargs.get("model")
        if type(model_input) is not dict:
            raise Exception("Please select a model")
        model = model_input.get("value")
        if model is None or model.get("file") is None:
            raise Exception("Please select a model")

        kwargs["model"] = model.get("file")
        kwargs["version"] = model.get("version")
        kwargs["model_info"] = model

        try:
            result = await dt_sampler(kwargs)
            if result is None:
                raise Exception("Failed to generate image")
            return result
        except grpc.aio.AioRpcError as e:
            if e.code() == grpc.StatusCode.UNAVAILABLE:
                raise Exception(
                    "Could not connect to Draw Things gRPC server. Please check the server address and port."
                )
            raise e
        except Exception as e:
            if cancel_request.should_cancel:
                DrawThingsSampler.last_gen_canceled = True
            raise e

    @classmethod
    async def VALIDATE_INPUTS(cls, width, height, tiled_diffusion):
        if tiled_diffusion:
            if width > 8192 or height > 8192:
                return "Width and height must be less than or equal to 8192 for tiled diffusion."
        else:
            if width > 2048 or height > 2048:
                return "Width and height must be less than or equal to 2048 unless tiled diffusion is enabled."
        return True


class DrawThingsRefiner:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        # fmt: off
        return {
            "required": {
                "refiner_model": ("DT_MODEL", {"model_type": "models"}),
                "refiner_start": ("FLOAT", { "default": 0.85, "min": 0.00, "max": 1.00, "step": 0.01, "round": 0.01 }),
            },
        }
        # fmt: on

    RETURN_TYPES = ("DT_REFINER",)
    RETURN_NAMES = ("REFINER",)
    FUNCTION = "add_to_pipeline"
    CATEGORY = "DrawThings"

    def add_to_pipeline(self, refiner_model, refiner_start):
        refiner = {"refiner_model": refiner_model, "refiner_start": refiner_start}
        return (refiner,)

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True


class DrawThingsUpscaler:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        # fmt: off
        return {
            "required": {
                "upscaler_model": ("DT_MODEL", {"model_type": "upscalers"}),
                "upscaler_scale_factor": ("INT", {"default": 2, "min": 2, "max": 4, "step": 2}),
            }
        }
        # fmt: on

    RETURN_TYPES = ("DT_UPSCALER",)
    RETURN_NAMES = ("UPSCALER",)
    FUNCTION = "add_to_pipeline"
    CATEGORY = "DrawThings"

    def add_to_pipeline(self, upscaler_model, upscaler_scale_factor):
        upscaler = {
            "upscaler_model": upscaler_model,
            "upscaler_scale_factor": upscaler_scale_factor,
        }
        return (upscaler,)


class DrawThingsPrompt:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "insert_textual_inversion": (
                    "DT_MODEL",
                    {"model_type": "textualInversions"},
                ),
                "prompt": (
                    "STRING",
                    {
                        "multiline": True,
                        "default": "a lovely cat",
                        "tooltip": "The conditioning describing the attributes you want to include in the image.",
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("PROMPT",)
    FUNCTION = "get_prompt"
    CATEGORY = "DrawThings"

    def get_prompt(self, prompt, insert_textual_inversion):
        return (prompt,)


class DrawThingsPositive:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "positive": (
                    "STRING",
                    {
                        "multiline": True,
                        "default": "a lovely cat",
                        "tooltip": "The conditioning describing the attributes you want to include in the image.",
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("POSITIVE",)
    FUNCTION = "prompt"
    CATEGORY = "DrawThings"

    def prompt(self, positive):
        return (positive,)


class DrawThingsNegative:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "negative": (
                    "STRING",
                    {
                        "multiline": True,
                        "default": "text, watermark",
                        "tooltip": "The conditioning describing the attributes you want to exclude from the image.",
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("NEGATIVE",)
    FUNCTION = "prompt"
    CATEGORY = "DrawThings"

    def prompt(self, negative):
        return (negative,)


class DrawThingsControlNet:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        # fmt: off
        return {
            "required": {
                "control_name": ("DT_MODEL", { "model_type": "controlNets", "tooltip": "The model used." }),
                "control_input_type": (DrawThingsLists.control_input_type, { "default": "Custom" }),
                "control_mode": (DrawThingsLists.control_mode, { "default": "Balanced", "tooltip": "" }),
                "control_weight": ("FLOAT", { "default": 1.00, "min": 0.00, "max": 2.50, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative." }),
                "control_start": ("FLOAT", { "default": 0.00, "min": 0.00, "max": 1.00, "step": 0.01 }),
                "control_end": ("FLOAT", { "default": 1.00, "min": 0.00, "max": 1.00, "step": 0.01 }),
                "global_average_pooling": ("BOOLEAN", { "default": False }),
                "down_sampling_rate": ("FLOAT", { "default": 1.00, "min": 0.00, "max": 1.00, "step": 0.01 }),
                "target_blocks": (DrawThingsLists.target_blocks, { "default": "All" }),
                "invert_image": ("BOOLEAN", { "default": False, "tooltip": "Some Control Nets might need their image to be inverted." })
            },
            "optional": {
                "control_net": ("DT_CNET",),
                "image": ("IMAGE",),
            },
        }
        # fmt: on

    RETURN_TYPES = ("DT_CNET",)
    RETURN_NAMES = ("CONTROL_NET",)
    CATEGORY = "DrawThings"
    FUNCTION = "add_to_pipeline"

    def add_to_pipeline(self, **kwargs) -> tuple[ControlStack,]:
        prev_cnet: ControlStackItem | None = kwargs.get("control_net", None)

        cnet_list: ControlStack = list()
        if prev_cnet is not None:
            cnet_list.append(prev_cnet)

        image: Tensor | None = None
        if "image" in kwargs:
            image = 1.0 - kwargs["image"] if kwargs["invert_image"] else kwargs["image"]
        hint_type = (
            DrawThingsLists.control_input_type_mapping.get(
                kwargs["control_input_type"], None
            )
            if image is not None
            else None
        )

        cnet_info = (
            ControlNetInfo(kwargs["control_name"]["value"])
            if "value" in kwargs["control_name"]
            else None
        )

        if cnet_info is not None and "file" in cnet_info:
            cnet_item = ControlStackItem(
                {
                    "model": cnet_info,
                    "input_type": kwargs["control_input_type"].lower(),
                    "mode": kwargs["control_mode"],
                    "weight": kwargs["control_weight"],
                    "start": kwargs["control_start"],
                    "end": kwargs["control_end"],
                    "image": image,
                    "hint_type": hint_type,
                    "global_average_pooling": kwargs["global_average_pooling"],
                    "down_sampling_rate": kwargs["down_sampling_rate"],
                    "target_blocks": kwargs["target_blocks"],
                }
            )
            cnet_list.append(cnet_item)
        return (cnet_list,)

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True


class DrawThingsLoRA:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        # fmt: off
        first_model_widget =  ("DT_MODEL", { "model_type": "loras", "tooltip": "The model used." })
        model_widget = ("DT_MODEL", { "model_type": "loras", "tooltip": "The model used.", "hidden": True, "default": None })
        first_weight_widget = ("FLOAT", { "default": 1.00, "min": -5.00, "max": 5.00, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."})
        weight_widget = ("FLOAT", { "default": 1.00, "min": -5.00, "max": 5.00, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative.", "hidden": True})
        first_mode_widget = (DrawThingsLists.lora_mode, { "default": "All", "tooltip": "When using a refiner, LoRA can be applied to either the base model, refiner, or both. If not using a refiner, this setting will be ignored."})
        mode_widget = (DrawThingsLists.lora_mode, { "default": "All", "tooltip": "When using a refiner, LoRA can be applied to either the base model, refiner, or both. If not using a refiner, this setting will be ignored.", "hidden": True})


        types = {
            "required": {
                "buttons": ("DT_BUTTONS", { "default": None }),
                "lora": first_model_widget,
                "weight": first_weight_widget,
                "mode": first_mode_widget
            },
            "optional": {
                "lora_stack": ("DT_LORA",),
            },
        }
        for i in range(2, 9):
                types["required"]["lora_" + str(i)] = model_widget
                types["required"]["weight_" + str(i)] = weight_widget
                types["required"]["mode_" + str(i)] = mode_widget
        # fmt: on
        return types

    RETURN_TYPES = ("DT_LORA",)
    RETURN_NAMES = ("lora_stack",)
    CATEGORY = "DrawThings"
    DESCRIPTION = "LoRAs are used to modify diffusion and CLIP models, altering the way in which latents are denoised such as applying styles. Multiple LoRA nodes can be linked together."
    FUNCTION = "add_to_pipeline"

    def add_to_pipeline(self, **kwargs) -> tuple[LoraStack,]:
        prev_lora: LoraStack | None = kwargs.get("lora_stack", None)

        lora_list: LoraStack = list()
        if prev_lora is not None:
            lora_list.extend(prev_lora)

        suffixes = ["", "_1", "_2", "_3", "_4", "_5", "_6", "_7", "_8"]

        for suffix in suffixes:
            lora_model = kwargs.get("lora" + suffix, None)
            lora_info = (
                LoRAInfo(lora_model["value"])
                if lora_model is not None and "value" in lora_model
                else None
            )
            if lora_info is None or "file" not in lora_info:
                continue
            lora_item = LoraStackItem(
                {
                    "model": lora_info,
                    "weight": kwargs.get("weight" + suffix, 1.0),
                    "mode": kwargs.get("mode" + suffix, "All"),
                }
            )

            lora_list.append(lora_item)

        return (lora_list,)

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True


class DrawThingsHints:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        # fmt: off
        type_widget = ( DrawThingsLists.hint_types, { "default": "(None selected)" })
        weight_widget = ("FLOAT", { "default": 1, "min": 0, "max": 1, "step": 0.01 })
        image_input = ("IMAGE", )

        suffixes = ["", "_2", "_3", "_4"]

        types = {"required": {}, "optional": {"hints": ("DT_HINTS",)}}

        for suffix in suffixes:
            types["required"]["type" + suffix] = type_widget
            types["required"]["weight" + suffix] = weight_widget
            types["optional"]["image" + suffix] = image_input

        return types
        # fmt: on

    RETURN_TYPES = ("DT_HINTS",)
    RETURN_NAMES = ("DT_HINTS",)
    CATEGORY = "DrawThings"
    DESCRIPTION = "Hint images, or control inputs, are used with ControlNets and certain other models, like Kontext, to help guide the generation."
    FUNCTION = "add_hints"

    def add_hints(self, **kwargs):
        prev_hints: HintStack | None = kwargs.get("hints", None)

        hint_list: HintStack = []
        if prev_hints is not None:
            hint_list.extend(prev_hints)

        suffixes = ["", "_2", "_3", "_4"]

        for suffix in suffixes:
            hint_image = kwargs.get("image" + suffix, None)
            hint_type_value = kwargs.get("type" + suffix, None)
            hint_type = DrawThingsLists.hint_types_mapping.get(hint_type_value, None)

            if (
                hint_image is None
                or hint_type is None
                or hint_type == "(None selected)"
            ):
                continue

            hint_item = HintStackItem(
                {
                    "type": hint_type.lower(),
                    "image": hint_image,
                    "weight": kwargs.get("weight" + suffix, 1.0),
                }
            )
            hint_list.append(hint_item)

        return (hint_list,)


NODE_CLASS_MAPPINGS = {
    "DrawThingsSampler": DrawThingsSampler,
    "DrawThingsControlNet": DrawThingsControlNet,
    "DrawThingsLoRA": DrawThingsLoRA,
    "DrawThingsPositive": DrawThingsPositive,
    "DrawThingsNegative": DrawThingsNegative,
    "DrawThingsRefiner": DrawThingsRefiner,
    "DrawThingsUpscaler": DrawThingsUpscaler,
    "DrawThingsPrompt": DrawThingsPrompt,
    "DrawThingsHints": DrawThingsHints,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DrawThingsSampler": "Draw Things Sampler",
    "DrawThingsControlNet": "Draw Things Control Net",
    "DrawThingsLoRA": "Draw Things LoRA",
    "DrawThingsPositive": "Draw Things Positive Prompt",
    "DrawThingsNegative": "Draw Things Negative Prompt",
    "DrawThingsRefiner": "Draw Things Refiner",
    "DrawThingsUpscaler": "Draw Things Upscaler",
    "DrawThingsPrompt": "Draw Things Prompt",
    "DrawThingsHints": "Draw Things Hints",
}
