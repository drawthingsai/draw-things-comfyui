import json

import grpc
from aiohttp import ClientSession, web
from aiohttp.web_request import Request
from google.protobuf.json_format import MessageToJson
from server import PromptServer  # type: ignore

from .. import cancel_request, settings
from .draw_things import get_files
from .generated import imageService_pb2, imageService_pb2_grpc

routes = PromptServer.instance.routes


@routes.post("/dt_grpc/files_info")
async def handle_files_info_request(request):
    """
    Returns a list of all files on the Draw Things gRPC server.
    """
    try:
        post = await request.post()
        server = post.get("server")
        port = post.get("port")
        use_tls = True if post.get("use_tls") == "true" else False

        if server is None or port is None:
            return web.json_response(
                {"error": "Missing server or port parameter"}, status=400
            )
        all_files = await get_files(server, port, use_tls)
        return web.json_response(all_files)
    except Exception as e:
        print(e)
        return web.json_response(
            {
                "error": "Could not connect to Draw Things gRPC server. Please check the server address and port."
            },
            status=500,
        )


@routes.get("/dt_grpc/bridge_models")
async def handle_bridge_models_request(request):
    """
    Returns a list of all files available on the Draw Things+ server.
    """
    try:
        async with grpc.aio.secure_channel(
            "compute.drawthings.ai:443", grpc.ssl_channel_credentials()
        ) as channel:
            stub = imageService_pb2_grpc.ImageGenerationServiceStub(channel)
            response = await stub.Echo(imageService_pb2.EchoRequest(name="ComfyUI"))
            response_json = json.loads(MessageToJson(response))
            file_list = response_json["files"]
            return web.json_response(file_list)
    except Exception as e:
        print(e)
        return web.json_response(
            {"error": "Could not connect to Draw Things+ server."},
            status=500,
        )


@routes.get("/dt_grpc/combined_models")
async def handle_combined_models_request(request):
    """
    Returns a the metadata for all official, community, and uncurated models
    """
    try:
        async with ClientSession() as session:
            async with session.get(
                "https://kcjerrell.github.io/dt-models/combined_models.json"
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return web.json_response(data)

    except Exception as e:
        print(e)
        return web.json_response(
            {"error": "Could not fetch models."},
            status=500,
        )


@routes.get("/dt_grpc/files_exist")
async def handle_files_exist_request(request):
    """
    Checks if provided filenames exist on server
    """
    try:
        async with grpc.aio.secure_channel(
            "compute.drawthings.ai:443", grpc.ssl_channel_credentials()
        ) as channel:
            stub = imageService_pb2_grpc.ImageGenerationServiceStub(channel)
            post = await request.post()
            files = post.get("files")
            response = await stub.FilesExist(
                imageService_pb2.FileListRequest(files=files)
            )
            response_json = json.loads(MessageToJson(response))
            file_existence = response_json["files"]
            return web.json_response(file_existence)
    except Exception as e:
        print(e)
        return web.json_response(
            {"error": "Could not connect to Draw Things+ server."},
            status=500,
        )


@routes.post("/dt_grpc/preview")
async def handle_preview_request(request):
    """
    Toggles the preview mode on or off.
    """
    try:
        post = await request.post()
        settings.show_preview = True if post.get("preview") == "true" else False
        return web.json_response()
    except Exception as e:
        print(e)
        return web.json_response()


@routes.post("/dt_grpc/interrupt")
async def handle_interrupt_request(request):
    """
    Handles interrupt requests to the gRPC server by setting the cancel request flag.
    """
    cancel_request.cancel()
    return web.json_response()


@routes.get("/dt_grpc/logo.svg")
async def handle_logo_request(request: Request):
    svg = r"""<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g>
    <g fill-rule="evenodd" transform="translate(38 10)">
      <path d="M59.42 16.1233C47.4501 10.3065 39.9129 10.4875 39.9129 10.4875L39.3045 16.1233L35.1644 19.3789L30.6725 51.7225L37.0894 53.7741C36.3347 60.6421 39.4699 62.8323 38.1161 65.8976C35.243 72.4028 28.054 70.7744 22.3306 75.1749C9.48616 85.0505 10.5413 93.5965 9.55968 99.2716C8.56871 105.001 7.74255 104.943 6.54517 110.482C10.6223 123.621 0 151.33 0 151.33L1.79672 173.495C9.04757 179.181 13.3032 177.217 16.1705 176.845C17.6669 174.583 11.7496 172.195 12.7054 155.969C13.4754 144.952 16.0973 140.31 19.2505 132.776C26.3423 118.582 30.4973 125.098 41.9662 117.571C45.3882 117.072 47.568 119.691 47.613 121.436C39.9849 138.655 37.0555 135.387 36.0626 138.057C25.859 147.203 23.8429 158.573 22.3306 163.573C22.8673 168.86 25.2824 176.974 25.2824 176.974C29.232 180.092 33.3341 180.842 35.1634 179.031C36.4865 177.722 35.0832 173.973 32.4692 172.335C31.8069 166.847 32.4692 159.707 32.4692 159.707C32.4692 159.707 35.61 150.645 39.9129 144.887C49.5741 140.986 56.9325 130.749 70.2002 112.029C83.7708 104.669 90.0864 102.271 96.8944 103.008C108.187 111.778 107.148 117.533 109.471 124.142C117.71 135.279 111.285 144.342 113.193 144.887C118.5 149.137 125 146.821 125 146.821C125 146.821 121.578 135.504 118.968 123.179C112.476 114.654 111.236 110.113 107.803 102.107C104.37 94.1003 106.124 95.637 103.953 92.1842C100.517 89.9308 98.9393 91.5936 96.8944 90.3802C92.5372 87.8065 94.7541 83.5965 90.606 72.8549C89.5151 65.4457 92.5311 60.7431 92.5311 60.7431C101.582 68.5159 98.1566 72.9369 100.359 75.1749C108.221 79.0981 109.183 75.1741 113.193 72.8549C114.889 69.7538 115.264 68.1802 115.503 65.8976C113.104 58.1913 111.589 51.1105 109.471 41.5426C112.544 34.2488 107.033 27.6261 107.033 27.6261L108.701 18.6056L102.541 23.6312L99.4611 23.6312L96.2554 16.1233L92.5311 23.6312C92.5311 23.6312 81.0472 27.2687 76.2762 30.3318C77.6187 26.28 76.2762 24.7909 76.2762 24.7909C76.2762 24.7909 86.4351 16.7695 84.7025 10.4875C82.97 4.20562 78.7424 -1.38974 68.9169 0.307627C56.8044 6.25692 62.8645 14.0266 59.42 16.1233Z" />
      <path fill-rule="evenodd" />
    </g>
  </g>
</svg>"""
    return web.Response(text=svg, content_type="image/svg+xml")
