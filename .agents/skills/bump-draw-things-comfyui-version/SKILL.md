---
name: bump-draw-things-comfyui-version
description: Bump the Draw Things for ComfyUI extension version and rebuild its frontend bundle. Use for a standalone version bump or as the release step for an existing change.
---

# Bump the Draw Things for ComfyUI version

1. Read the current version from `pyproject.toml` and check it against the package and runtime versions below. Use the requested target version or increment. If the request only asks for a bump, use a patch for a version-only update or compatible fixes, a minor for compatible new functionality, and a major for a breaking release. Use any more specific bump guidance from the calling workflow.
2. Run `npm version <target-version> --no-git-tag-version --ignore-scripts` to update `package.json` and `package-lock.json`. Regenerate the lockfile with `npm install --package-lock-only --ignore-scripts`. Confirm that the root version and `packages[""].version` agree with `package.json` and that the lockfile contains no unrelated dependency updates. If the requested version is already set in `package.json`, skip `npm version` and verify the other version fields.
3. Set the same version in `pyproject.toml` (`[project].version`), `__init__.py` (`__version__`), and `web/src/ComfyUI-DrawThings-gRPC.ts` (`nodePackVersion`). Keep the entries in `web/src/upgrade.ts` as release history. A standalone bump or model-only release needs no new upgrade message. Consider a message when the release adds configuration properties or other user-facing changes that need explanation.
4. Run `npm run build`. Review the tracked `web/js/extension.esm.js` diff, confirm its bundled `nodePackVersion` matches the source and package fields, and run `git diff --check`.

A push that changes `pyproject.toml` on upstream `main` can publish to the Comfy Registry via `.github/workflows/publish_action.yml`. Treat publishing as a separate action that requires authorization.
