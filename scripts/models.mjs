import { compileOfficialModels, versionMap } from "./specParser.mjs"
import fse from "fs-extra"
import cp from "child_process"

export async function updateModels(skipClone = false) {
    if (!skipClone)
        await cloneCommunityModels()
    await compileModelData()
}

/**
 * Collects and compiles the model data for each model type
 * requires the community models repo to be cloned in ./models/community-models
 * saves the model json to ./src-web/models/
 */
async function compileModelData() {
    console.log("compiling model data")

    await compileModelType("models", 'Model')
    await compileModelType("uncurated_models")
    await compileModelType("controlnets", 'ControlNet')
    await compileModelType("loras", 'LoRA')
    await compileModelType("embeddings", 'TextualInversion')
}

/**
 * This runs the python script in the community-models repo the combines all the model data
 * into a single json file, and returns the output
 *
 * If "official" specified, the official models are fetched from the community repo,
 * parsed from swift and combined with the community models
 *
 * @param {"models" | "uncurated_models" | "controlnets" | "loras" | "embeddings"} type
 * @param {"Model" | "ControlNet" | "LoRA" | "TextualInversion" | undefined} official must match the filename for the official models file
 */
async function compileModelType(type, official) {
    try {
        cp.execSync(`python utils/${type}_json.py`, { cwd: "./models/community-models", stdio: "inherit" })
        const models = await fse.readJSON(`./models/community-models/${type}.json`)

        if (official) {
            const officialModels = await compileOfficialModels(official)
            officialModels.forEach(m => { m.official = true })
            models.push(...officialModels)
        }

        models.sort((a, b) => a.name.localeCompare(b.name))

        models.forEach(m => { m.version = versionMap(m.version) })

        await fse.writeJSON(`./src-web/models/${type}.json`, models, { spaces: 2 })
    } catch (e) {
        console.error("couldn't compile", type)
        console.error(e)
    }
}

/** clones the community models repo. Sometimes this can be slow. */
async function cloneCommunityModels() {
    console.log("removing old generated files")
    fse.emptyDirSync("./models")
    console.log("cloning draw things community models")
    cp.execSync("git clone https://github.com/drawthingsai/community-models.git", { cwd: "./models", stdio: "inherit" })
}

if (import.meta.filename === process.argv[1]) {
    updateModels(true)
        .then(() => process.exit(0))
        .catch(console.error)
}
