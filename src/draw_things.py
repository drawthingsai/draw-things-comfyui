import base64
import json

import comfy.utils
import flatbuffers
import grpc
import grpc.aio
import numpy as np
import torch
from comfy.cli_args import args
from google.protobuf.json_format import MessageToJson
from PIL import Image

from .. import cancel_request, settings
from .config import build_config
from .credentials import credentials
from .data_types import DrawThingsLists, HintStack, ModelsInfo, UpscalerInfo
from .generated import imageService_pb2, imageService_pb2_grpc
from .image_handlers import (
    convert_image_for_request,
    convert_mask_for_request,
    convert_response_image,
    decode_preview,
)
from .util import try_parse_int

MAX_PREVIEW_RESOLUTION = try_parse_int(args.preview_size) or 512


async def get_files(server, port, use_tls) -> ModelsInfo:
    async with get_aio_channel(server, port, use_tls) as channel:
        stub = imageService_pb2_grpc.ImageGenerationServiceStub(channel)
        response = await stub.Echo(imageService_pb2.EchoRequest(name="ComfyUI"))
        response_json = json.loads(MessageToJson(response))
        override = dict(response_json["override"])
        model_info = {
            k: json.loads(str(base64.b64decode(override[k]), "utf8"))
            for k in override.keys()
        }

        if "upscalers" not in model_info:
            official = [
                "realesrgan_x2plus_f16.ckpt",
                "realesrgan_x4plus_f16.ckpt",
                "realesrgan_x4plus_anime_6b_f16.ckpt",
                "esrgan_4x_universal_upscaler_v2_sharp_f16.ckpt",
                "remacri_4x_f16.ckpt",
                "4x_ultrasharp_f16.ckpt",
            ]
            model_info["upscalers"] = [UpscalerInfo(file=f, name=f) for f in official]

        return ModelsInfo(
            models=model_info["models"],
            controlNets=model_info["controlNets"],
            loras=model_info["loras"],
            upscalers=model_info["upscalers"],
            textualInversions=model_info["textualInversions"],
        )


def get_aio_channel(server, port, use_tls):
    options = [
        ["grpc.max_send_message_length", -1],
        ["grpc.max_receive_message_length", -1],
    ]
    if use_tls and credentials is not None:
        return grpc.aio.secure_channel(f"{server}:{port}", credentials, options=options)
    return grpc.aio.insecure_channel(f"{server}:{port}", options=options)


async def dt_sampler(inputs: dict):
    server, port, use_tls = (
        inputs.get("server"),
        inputs.get("port"),
        inputs.get("use_tls"),
    )
    positive, negative = inputs.get("positive"), inputs.get("negative")
    image, mask = inputs.get("image"), inputs.get("mask")
    version = inputs.get("version")

    config = build_config(inputs)
    override = build_override(inputs)

    width = config.startWidth * 64
    height = config.startHeight * 64

    builder = flatbuffers.Builder(0)
    builder.Finish(config.Pack(builder))
    config_fbs = bytes(builder.Output())

    # try:
    #     print(json.dumps(inputs, indent=4))
    #     print(json.dumps(config, indent=4))
    # except Exception as e:
    #     pass

    contents = []
    img2img = None
    maskimg = None
    if image is not None:
        img2img = convert_image_for_request(image, width=width, height=height)
    if mask is not None:
        maskimg = convert_mask_for_request(mask, width=width, height=height)

    # hints can be with sampler, cnet, or lora
    # get hints from sampler
    hints: HintStack = inputs.get("hints", [])

    # add hints from cnets
    cnets = inputs.get("control_net")
    if cnets is not None:
        for cnet in cnets:
            cnet_image = cnet.get("image")
            cnet_hint_type = cnet.get("hint_type")
            if cnet_image is not None and cnet_hint_type is not None:
                hints.append(
                    {
                        "image": cnet_image,
                        "type": cnet_hint_type,
                        "weight": 1,
                    }
                )

    req_hints = []
    # add all hints to request
    for hint_type in DrawThingsLists.hint_types_mapping.values():
        if hint_type is None:
            continue
        hints_of_type = filter(lambda hint: hint.get("type") == hint_type, hints)
        taws = []
        for hint in hints_of_type:
            hint_images = hint.get("image")
            hint_weight = hint.get("weight", 1.0)
            if hint_images is None:
                continue

            # hint images might be batched, so check for multiple images and add each
            for i in range(hint_images.size(dim=0)):
                if config.hiresFix:
                    hint_tensor = convert_image_for_request(
                        hint_images,
                        hint_type,
                        batch_index=i,
                        width=config.hiresFixStartWidth * 64,
                        height=config.hiresFixStartHeight * 64,
                    )
                    taw = imageService_pb2.TensorAndWeight()
                    taw.weight = 1
                    taw.tensor = hint_tensor
                    taws.append(taw)

                hint_tensor = convert_image_for_request(
                    hint_images,
                    hint_type,
                    batch_index=i,
                    width=width,
                    height=height,
                )
                taw = imageService_pb2.TensorAndWeight()
                taw.weight = hint_weight
                taw.tensor = hint_tensor
                taws.append(taw)

        if len(taws) > 0:
            hp = imageService_pb2.HintProto()
            hp.hintType = hint_type
            hp.tensors.extend(taws)
            req_hints.append(hp)

    progress = comfy.utils.ProgressBar(config.steps, inputs["unique_id"])

    async with get_aio_channel(server, port, use_tls) as channel:
        stub = imageService_pb2_grpc.ImageGenerationServiceStub(channel)
        generate_stream = stub.GenerateImage(
            imageService_pb2.ImageGenerationRequest(
                image=img2img,
                scaleFactor=1,
                mask=maskimg,
                hints=req_hints,
                prompt=str(positive),
                negativePrompt=str(negative),
                configuration=config_fbs,
                override=override,
                user="ComfyUI",
                device="LAPTOP",
                contents=contents,
            )
        )

        cancel_request.reset()
        response_images = []
        estimated_steps = (
            config.steps * (1 + config.hiresFixStrength)
            if config.hiresFix
            else config.steps
        )
        current_step = 0

        while True:
            response = await generate_stream.read()
            if response == grpc.aio.EOF:
                break

            if cancel_request.should_cancel:
                await channel.close()
                raise Exception("canceled")

            signpost = response.currentSignpost
            if "sampling" in signpost:
                current_step = signpost.sampling.step
            elif "secondPassSampling" in signpost:
                current_step = signpost.secondPassSampling.step + config.steps

            preview_image = response.previewImage
            generated_images = response.generatedImages

            if current_step:
                try:
                    preview = None
                    if preview_image and version and settings.show_preview:
                        decoded_preview = decode_preview(preview_image, version)
                        if decoded_preview is not None:
                            preview = ("PNG", decoded_preview, MAX_PREVIEW_RESOLUTION)
                    progress.update_absolute(
                        current_step, total=estimated_steps, preview=preview
                    )
                except Exception as e:
                    print("DrawThings-gRPC had an error decoding the preview image:", e)

            if generated_images:
                response_images.extend(generated_images)

        if len(response_images) == 0:
            raise Exception("The Draw Things gRPC server returned no images")

        images = []
        for img_data in response_images:
            result = convert_response_image(img_data)
            if result is not None:
                data = result["data"]
                width = result["width"]
                height = result["height"]
                channels = result["channels"]
                mode = "RGBA" if channels == 4 else "RGB"
                img = Image.frombytes(mode, (width, height), data)
                image_np = np.array(img)
                tensor_image = torch.from_numpy(image_np.astype(np.float32) / 255.0)
                images.append(tensor_image)

        if len(images) == 0:
            raise Exception("There was an error converting the response image")

        return (torch.stack(images),)


def build_override(inputs):
    models = [inputs["model_info"]]
    if "refiner" in inputs and "refiner_model" in inputs["refiner"]:
        models.append(inputs["refiner"]["refiner_model"])
    models = list(filter(lambda m: "official" not in m, models))
    models_json = json.dumps(models) if len(models) > 0 else None
    models_buf = models_json.encode("utf-8") if models_json is not None else None

    controls = None
    if "control_net" in inputs and len(inputs["control_net"]) > 0:
        controls = []
        for cnet in inputs["control_net"]:
            if "model" in cnet and "official" not in cnet["model"]:
                controls.append(cnet["model"])
    control_json = (
        json.dumps(controls) if controls is not None and len(controls) > 0 else None
    )
    control_buf = control_json.encode("utf-8") if control_json is not None else None

    loras = None
    if "lora" in inputs and len(inputs["lora"]) > 0:
        loras = []
        for lora in inputs["lora"]:
            if "model" in lora and "official" not in lora["model"]:
                loras.append(lora["model"])
    loras_json = json.dumps(loras) if loras is not None and len(loras) > 0 else None
    print(loras_json)
    loras_buf = loras_json.encode("utf-8") if loras_json is not None else None

    override = imageService_pb2.MetadataOverride(
        models=models_buf, controlNets=control_buf, loras=loras_buf
    )

    return override
