## Draw Things for ComfyUI

**Draw Things for ComfyUI** is a bridge between [ComfyUI](https://www.comfy.org/) and [Draw Things](https://drawthings.ai/) via gRPC. It allows ComfyUI to build and send image generation requests to Draw Things - giving you more control over inputs and settings than Draw Things alone offers, and bringing the Draw Things sampler into your ComfyUI workflows.

---

### Setup

**Requirements**

- [ComfyUI](https://www.comfy.org/)
- [Draw Things](https://drawthings.ai/) (with gRPC server enabled) **or** [gRPCServerCLI](https://github.com/drawthingsai/draw-things-community/tree/main?tab=readme-ov-file#self-host-grpcservercli-from-packaged-binaries)


**Via ComfyUI-Manager (Recommended)**
- Search for `Draw Things` in the ComfyUI-Manager and install.

**Manual Installation**
- Clone this repository into your `ComfyUI/custom_nodes` directory:
  ```sh
  git clone https://github.com/drawthingsai/draw-things-comfyui.git
  ```

**Restart ComfyUI**

---

### Configuring Draw Things gRPC Server

#### Draw Things App

Ensure the following settings are enabled:
- **API Server:** Enabled
- **Protocol:** gRPC
- **Transport Layer Security:** Enabled (Recommended)
- **Enable Model Browser:** Enabled (Required for local models)
- **Bridge Mode:** Optional (Required for Bridge Mode - DT+ only)


#### gRPCServerCLI

Start the server with:
```sh
gRPCServerCLI-macOS [path to models] --no-response-compression --model-browser
```

---

### Development

Install JavaScript/TypeScript development dependencies with `npm ci`.

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

- `npm run lint` — check lint rules.
- `npm run lint:fix` — apply safe lint fixes.
- `npm run format:check` — check formatting without changing files.
- `npm run format` — format files in place.
- `npm run check` — check lint rules, formatting, and import organization.
- `npm run check:fix` — apply safe fixes, formatting, and import organization.

Biome respects `.gitignore` and excludes generated files, bundled frontend output,
static assets, and test fixtures. Python code is not handled by Biome.

---

### Discussion

Join the conversation and get support on [Discord](https://discord.com/channels/1038516303666876436/1357377020299837464).

---

### Acknowledgements

- [draw-things-community](https://github.com/drawthingsai/draw-things-community)
- [ComfyUI-DrawThingsWrapper](https://github.com/JosephThomasParker/ComfyUI-DrawThingsWrapper)
- [dt-grpc-ts](https://github.com/kcjerrell/dt-grpc-ts)
- [ComfyUI_tinyterraNodes](https://github.com/TinyTerra/ComfyUI_tinyterraNodes)

> **Note:**
> This project was created with the [cookiecutter-comfy-extension](https://github.com/Comfy-Org/cookiecutter-comfy-extension) template to simplify custom node development for ComfyUI.
