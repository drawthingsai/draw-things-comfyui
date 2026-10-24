To add new config properties:
- First update the grpc code with `npm run gencode`
- add the property to Config in data_types.py
- define the widget on the node in nodes.py
- define the property in configProperties.ts - this is for copy/pasting presets
- If the widget should only be shown for certain models...
    - make sure modelVersions.ts includes the feature for the correct version
    - update widgets.ts to check for the feature and show the widget
    - make sure ModelVersion in config.py has a property for the feature
- Update config.py to assign the property, conditionally if gated
