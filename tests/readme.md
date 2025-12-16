(this doc is incomplete, using as a checklist/outline in development)

New tests for 1.6.0:
    - Gen tests:
        x Lora refiner
        x depth map through cnet node
        x style image through hints
    - LoRA node:
        - Versioning
            x Values are loaded correctly from previous version worklow
            x Widget values are saved by key
            x Widget values are loaded by key
            - On loading old version, inputs are fixed
        - UI tests
            x "Show mode" toggles visibility of "mode" widgets
            x "More" adds extra lora slots to list
                - their values are reset to defualt
                - maxes at 8
                - button is disabled at 8
                - works correctly with show mode on and off
            x "Less" removes lora slots from list
                - their values are reset (when serialised to json)
                - doesn't remove the first lora
                - button is disabled at 1
    - ControlNet node
        - Versioning
            x Values are loaded correctly from previous version worklow
            x Widget values are saved by key
            x Widget values are loaded by key
        - Ui tests
            - Correct widgets are shown depending on cnet model
    - Image Hints node
        - doesn't need ui tests, gen tests cover


Tests for 1.7.0
- I'm not sure I will have tests for response compression because it requires changing DT settings and I don't have that set up yet
- hi-res hint images
- pose images (put those together duh)
x Not connect error appears when running workflow without connecting to grpc server
x No model widget shows [object Object] when loading a workflow
x No model widget shows [object Object] when loading a workflow with disconnected server
x Correct model version widgets are shown when loading a workflow with disconnected server
    - create a new workflow with sampler node
    - pick flux, assert widgets
    - toggle tls, refresh
    - assert model shows "not connected" but flux widgets are still listed
    - and might as well hit tls again and assert the model updtes to flux
x new version announcement only appears once
    - not sure I have a set up for clearing user data yet, but if I do
    - clear user data
    - load, assert message, clear message, refresh, assert no message
x qwen model version widgets

Tests for 1.8:
Bridge mode
- When bridge mode is enabled, local models are hidden and official models are listed
- When "show community" is enabled, official and community models are listed
- When "show uncurated" is enabled, official and uncurated models are listed
- When "show community" and "show uncurated" are enabled, all three categories are listed
- Settings are updated when context menu option is used
- "Show community" and "Show uncurated" context menu options are only displayed if bridge mode is enabled

Tests for config import
x Sampler node only
    - Pasting DT config sets all properties to correct values
    - Error message is displayed when clipboard does not contain a DT config
    - Invalid or incorrect values in the config are coerced to valid values
x Upscaler and Refiner
    - if nodes are connected, values are applied
    - if nodes are connected, invalid values are coerced
    - if nodes are not connected, a message is displayed listing the missing nodes
x Lora
    - if enough nodes are connected, values are applied
    - if nodes are connected, invalid values are coerced
    - if no lora node is connected, a message is displayed listing the missing node
    - if the config has >8 loras (wow), and only one node is connected, the first 8 are applied and a message is displayed listing the missing node
x Controlnet
    - if enough nodes are connected, values are applied
    - if nodes are connected, invalid values are coerced
    - if no cnet node is connected, a message is displayed listing the missing node
    - if the config has more controls than there are nodes connected, the first n are applied and a message is displayed listing the missing nodes
