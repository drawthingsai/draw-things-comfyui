import fse from 'fs-extra'

/**
 * Downloads the most recent ModelZoo file for the model type from the community repo
 * And parses the model Specifications into JS
 * It is expected that some Specifications will not parse properly (because they aren't models)
 * Also, this is potentially dangerious because it uses eval
 * @param {"Model" | "ControlNet" | "LoRA" | "TextualInversion"} name
 * @returns
 */
export async function compileOfficialModels(name) {
    const res = await fetch(
        `https://api.github.com/repos/drawthingsai/draw-things-community/contents/Libraries/ModelZoo/Sources/${name}Zoo.swift`
    )
    const src = Buffer.from((await res.json()).content, "base64").toString(
        "utf-8"
    )

    const specs = extractSpecifications(src)
    const parsed = await specs.map(s => toJS(s)).filter(s => !!s)
    // const extract = specs.map(s => extractData(s)).filter(s => !!s).map(s => ({ ...s, official: true }))
    // return JSON.stringify(parsed, null, 2)
    // await fse.writeJSON(`./web/models/official.json`, extract, { spaces: 2 })
    return parsed
}

/**
 * Since the swift objects are mostly compatible with JS code, we just touch up or remove
 * any of the parts that aren't compatible (i'm not familiar with swift but they seem to be
 * enums or function calls).
 *
 * uses eval()
 * @param {string} spec
 * @returns
 */
function toJS(spec) {
    const json = spec
        .replace(/^\s+/gm, "")
        .replace(/^Specification\($/gm, "{")
        .replace(/^\)$/gm, "}")
        .replace(/^version: \.(\w+)(,?)$/gm, '"version": "$1"$2')
        // .replace(/^objective: \.(\w+)\((\w+): (\w+)\)(,?)$/gm, (m, p1, p2, p3, p4) => {
        //     return `"objective": { "${p1}": { "${p2}": ${p3} } }${p4}`
        // })
        .replace(/^modifier: \.(\w+)(,?)$/gm, '"modifier": "$1"$2')
        .replace(/^type: \.(\w+)(,?)$/gm, '"type": "$1"$2')
        .replace(/^alternativeDecoderVersion: \.(\w+)(,?)$/gm, '"alternativeDecoderVersion": "$1"$2')
        .replace(/^mmdit.*$/gm, "")
        .replace(/^conditioning.*$/gm, "")
        .replace(/^objective.*$/gm, "")
        .replace(/^noiseDiscretization.*$/gm, "")
        .replace(/^weight:.*$/gm, "")
        .replace(/: nil/gm, ": null")

    try {
        const obj = eval(`Object(${json})`)
        return obj
        // return JSON.parse(json)
    } catch (e) {
        if (e?.message?.includes("Unexpected identifier 'specification'")) return null
        console.log(e)
        return null
    }
}

let specI = 0
function extractSpecifications(input) {
    const text = input.replace(/^\s+/gm, "").replace(/\n/g, " ")
    const brackets = { "(": ")", "[": "]", "{": "}" }
    const specs = []
    let i = 0
    while (true) {
        const start = text.indexOf("Specification(", i)
        if (start === -1) break

        let bstack = []
        let inQuote = false
        let escaped = false
        let j = text.indexOf("(", start)
        // j++ // skip first '('

        let output = 'Specification'

        const startIdx = j
        for (; j < text.length; j++) {
            const ch = text[j]
            output += ch

            if (inQuote) {
                if (escaped) escaped = false
                else if (ch === "\\") escaped = true
                else if (ch === '"') inQuote = false
            } else {
                if (ch === '"') inQuote = true
                else if (brackets[ch]) bstack.push(brackets[ch])
                else if (ch === bstack.at(-1)) {
                    bstack.pop()
                    if (bstack.length === 0) break
                }
                else if (ch === ',' && bstack.length === 1) output += '\n'

                if (ch === "(" && bstack.length === 1) output += "\n"
            }
        }

        const block = output.slice(0, -1) + "\n)"
        specs.push(block)
        i = j + 1
    }
    return specs
}

function extractData(spec) {
    const data = {
        name: extractValue(spec, "name"),
        file: extractValue(spec, "file"),
        version: versionMap(extractDotValue(spec, "version")),
        modifier: extractDotValue(spec, "modifier") ?? undefined
    }
    if (data.name && data.file && data.version) return data
    console.error("couldn't extract data from", spec)
    return undefined
}

/** @param spec {string} */
function extractValue(spec, key) {
    if (key === "name")
        return spec.match(/\bname:\s+?"([^"]+)"/)?.[1]
    if (key === "file")
        return spec.match(/\bfile:\s+?"([^"]+)"/)?.[1]
}

/** @param spec {string} */
function extractDotValue(spec, key) {
    if (key === "version")
        return spec.match(/\bversion:\s+?\.(\w+)/)?.[1]
    if (key === "modifier")
        return spec.match(/\bmodifier:\s+?\.(\w+)/)?.[1]
}

export function versionMap(version) {
    switch (version) {
        case "v1":
            return "v1"
        case "v2":
            return "v2"
        case "kandinsky21":
            return "kandinsky2.1"
        case "sdxlBase":
            return "sdxl_base_v0.9"
        case "sdxlRefiner":
            return "sdxl_refiner_v0.9"
        case "ssd1b":
            return "ssd_1b"
        case "svdI2v":
            return "svd_i2v"
        case "wurstchenStageC":
            return "wurstchen_v3.0_stage_c"
        case "wurstchenStageB":
            return "wurstchen_v3.0_stage_b"
        case "sd3":
            return "sd3"
        case "pixart":
            return "pixart"
        case "auraflow":
            return "auraflow"
        case "flux1":
            return "flux1"
        case "sd3Large":
            return "sd3_large"
        case "hunyuanVideo":
            return "hunyuan_video"
        case "wan21_1_3b":
            return "wan_v2.1_1.3b"
        case "wan21_14b":
            return "wan_v2.1_14b"
        case "hiDreamI1":
            return "hidream_i1"
        case "qwenImage":
            return "qwen_image"
        case "wan22_5b":
            return "wan_v2.2_5b"
        case "z_image":
        case "zImage":
            return "z_image"
        default:
            return version
    }
}
