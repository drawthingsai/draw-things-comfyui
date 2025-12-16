import type { LGraphNode } from '@comfyorg/litegraph';

type MethodKeys<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export function setCallback<T extends object, K extends MethodKeys<T>>(
    target: T,
    callbackName: K,
    callback: (
        this: ThisType<T> extends never ? T : ThisType<T>,
        ...args: Parameters<
            NonNullable<T[K] extends (...a: any[]) => any ? T[K] : never>
        >
    ) => void
): void {
    type Orig = NonNullable<T[K] extends (...a: any[]) => any ? T[K] : never>;
    const original = target[callbackName] as Orig | undefined;

    (target as any)[callbackName] = function (
        this: any,
        ...args: Parameters<Orig>
    ) {
        const r = original?.apply(this, args);
        callback?.apply(this, args);
        return r;
    } as T[K];
}


type HasPrototype = { prototype: any };

type UpdateValue =
    | ((this: any, ...args: any[]) => any)
    | PropertyDescriptor
    | any;

/**
 * Updates a prototype with new properties, preserving existing ones.
 * - Accepts functions and property descriptors.
 * - If a function already exists on the prototype it will be wrapped so the original return value is preserved.
 */
export function updateProto<B extends HasPrototype>(
    base: B,
    update: Record<string, UpdateValue>
): void {
    const proto = base.prototype as Record<string, any>;

    for (const key in update) {
        const val = update[key];

        if (typeof val === "function" && typeof proto[key] === "function") {
            const original = proto[key] as (...args: any[]) => any;
            const added = val as (...args: any[]) => any;

            proto[key] = function (this: any, ...args: any[]) {
                const r = original.apply(this, args);
                try {
                    added.apply(this, args);
                } finally {
                    return r;
                }
            } as any;
        } else if (isPropertyDescriptor(val)) {
            Object.defineProperty(proto, key, val);
        } else {
            proto[key] = val;
        }
    }
}

function isPropertyDescriptor(v: any): v is PropertyDescriptor {
    if (v == null) return false;
    const hasDescKeys =
        "value" in v ||
        "get" in v ||
        "set" in v ||
        "writable" in v ||
        "enumerable" in v ||
        "configurable" in v;
    return typeof v === "object" && hasDescKeys;
}


const propertyMap = {
    preserveOriginalAfterInpaint: "preserve_original",
    hiresFix: "high_res_fix",
    sampler: "sampler_name",
};
const reversePropertyMap = Object.fromEntries(Object.entries(propertyMap).map(([k, v]) => [v, k]));

/**
 * Converts a DrawThings config property name to a ComfyUI property name.
 *
 * This function maps specific DrawThings names to corresponding widget names
 * using a predefined map. If a name is not found in the map, it converts
 * camelCase names to snake_case by inserting underscores before uppercase
 * letters and converting all characters to lowercase.
 *
 * @param {string} dtName - The DrawThings name to convert.
 * @returns {string} The corresponding widget name.
 */
export function getWidgetName(dtName: keyof typeof propertyMap) {
    if (dtName in propertyMap) return propertyMap[dtName];

    return dtName.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function getDTPropertyName(widgetName: string) {
    if (widgetName in reversePropertyMap) return reversePropertyMap[widgetName];

    return widgetName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}


export function findWidgetByName(node: LGraphNode, name: string) {
    return node.widgets?.find((w) => w.name === name)
}

export function mk<T extends Function>(fn: T): T {
    return fn;
}
