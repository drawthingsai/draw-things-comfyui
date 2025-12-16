export async function getBridgeModeModels() {
    const { default: models } = await import("./models.json", {
        with: { type: "json" },
    });
    const { default: uncurated } = await import("./uncurated_models.json", {
        with: { type: "json" },
    });
    const { default: controlNets } = await import("./controlnets.json", {
        with: { type: "json" },
    });
    const { default: loras } = await import("./loras.json", {
        with: { type: "json" },
    });
    const { default: textualInversions } = await import("./embeddings.json", {
        with: { type: "json" },
    });
    const { default: upscalers } = await import("./upscalers.json", {
        with: { type: "json" },
    });

    return {
        models,
        uncurated,
        controlNets,
        loras,
        textualInversions,
        upscalers,
    };
}
