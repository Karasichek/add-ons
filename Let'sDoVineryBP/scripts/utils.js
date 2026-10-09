// Мини-библиотека общих функций аддона Let'sDoVinery.
import { EquipmentSlot, ItemStack, world } from "@minecraft/server";

/** Безопасно читает значение; при undefined или исключении возвращает fallback. */
export function safeRead(getter, fallback = null) {
    try {
        const value = getter();
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

/** Делает компактный снимок блока для журнала. */
export function snapshotBlock(block) {
    if (!block) return null;
    return {
        valid: safeRead(() => block.isValid, false),
        typeId: safeRead(() => block.typeId, "<unavailable>"),
        location: safeRead(() => block.location, null)
    };
}

/** Приводит исключение к сериализуемому виду. */
export function errorDetails(error) {
    if (error instanceof Error) {
        return { name: error.name, message: error.message, stack: error.stack ?? null };
    }
    return { name: "NonErrorThrow", message: String(error), stack: null };
}

/** Структурированное сообщение об ошибке в Content Log. */
export function logError(scope, event, error, details = {}) {
    try {
        const player = event?.player;
        const record = {
            level: "ERROR",
            scope,
            timestamp: new Date().toISOString(),
            error: errorDetails(error),
            block: snapshotBlock(event?.block ?? details.block ?? null),
            dimension: safeRead(() => event?.dimension?.id, null),
            player: safeRead(() => player?.name, null),
            heldItem: details.heldItem ?? null,
            context: details
        };
        console.error(`[Let'sDoVin][ERROR] ${JSON.stringify(record)}`);
    } catch (loggingError) {
        console.error(`[Let'sDoVin][ERROR] ${scope}; original=${String(error)}; logger=${String(loggingError)}`);
    }
}

/** Выполняет обработчик и записывает исключение, не обрушая весь скрипт. */
export function safely(scope, event, action, details = {}) {
    try {
        return action();
    } catch (error) {
        logError(scope, event, error, details);
        return undefined;
    }
}

/** Логирует переход состояния культуры. */
export function logTransition(event, action, from, to, phase, timerSeconds = null, extraBlockProps = {}) {
    try {
        const blockSnapshot = snapshotBlock(event?.block ?? null);
        if (blockSnapshot) Object.assign(blockSnapshot, extraBlockProps);
        console.warn(`[Let'sDoVinery][GROWTH] ${JSON.stringify({
            action,
            from,
            to,
            phase,
            timerSeconds,
            block: blockSnapshot,
            dimension: safeRead(() => event?.dimension?.id, null),
            timestamp: new Date().toISOString()
        })}`);
    } catch (error) {
        logError("log-transition", event, error, { action, from, to, phase, timerSeconds });
    }
}

/** Возвращает предмет в основной руке. */
export function getMainhand(player) {
    const equippable = player?.getComponent("minecraft:equippable");
    return equippable?.getEquipment(EquipmentSlot.Mainhand);
}

/** Создаёт предмет в центре заданного блока. */
export function spawnItem(dimension, block, itemId, amount) {
    const location = block.location;
    dimension.spawnItem(new ItemStack(itemId, amount), {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5
    });
}

/** Формирует стабильный ключ свойства мира для конкретного блока. */
function worldBlockPropertyId(event, property) {
    const location = event?.block?.location;
    const dimensionId = event?.dimension?.id;
    if (!location || !dimensionId) {
        throw new Error("Cannot identify crop block for world property storage");
    }
    const dimensionKey = dimensionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `karasichek:vinery:${dimensionKey}:${location.x}:${location.y}:${location.z}:${property}`;
}

/** Читает сохранённое свойство, привязанное к координатам блока. */
export function getCropProperty(event, property) {
    return world.getDynamicProperty(worldBlockPropertyId(event, property));
}

/** Записывает или удаляет свойство, привязанное к координатам блока. */
export function setCropProperty(event, property, value) {
    const id = worldBlockPropertyId(event, property);
    if (value === undefined || value === null) world.setDynamicProperty(id);
    else world.setDynamicProperty(id, value);
}

/** Удаляет перечисленные свойства блока (например, перед повторной посадкой). */
export function clearCropProperties(event, properties) {
    for (const property of properties) setCropProperty(event, property, undefined);
}

/** Проверяет, относится ли блок к кустам/культурам этого аддона. */
export function isAddonBush(block) {
    if (!block || !block.isValid || !block.typeId.startsWith("karasichek:")) return false;
    const id = block.typeId;
    return id.includes("_crop_") || id.endsWith("_crop") || id.includes("_leaves") || id.includes("vine_block");
}
