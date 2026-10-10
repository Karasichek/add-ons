// Основная логика культур и взаимодействий аддона Let'sDoVinery.
import { system, BlockPermutation, world } from "@minecraft/server";
import { registerPressingTubComponent } from "./pressing_tub.js";
import {
    safeRead,
    safely,
    logError,
    logTransition,
    getMainhand,
    spawnItem,
    getCropProperty,
    setCropProperty,
    clearCropProperties,
    isAddonBush
} from "./utils.js";

const VARIANTS = ["red", "white"];
const RED_GROW_SECONDS = 30;
const WHITE_REGROW_SECONDS = 30;
const RED_PHASE_NEEDS_STICK = "needs_stick";
const RED_PHASE_FRUITING = "fruiting";
const RED_TIMER_PROPERTY = "regrow_timer";
const RED_PHASE_PROPERTY = "red_growth_phase";
const CROP_PROPERTIES = [RED_TIMER_PROPERTY, RED_PHASE_PROPERTY];

function setRedGrowing(event, regrowBlock, action, from) {
    event.block.setPermutation(BlockPermutation.resolve(regrowBlock));
    setCropProperty(event, RED_PHASE_PROPERTY, RED_PHASE_FRUITING);
    setCropProperty(event, RED_TIMER_PROPERTY, RED_GROW_SECONDS);
    logTransition(event, action, from, regrowBlock, RED_PHASE_FRUITING, RED_GROW_SECONDS, {
        regrow_timer: RED_GROW_SECONDS,
        red_growth_phase: RED_PHASE_FRUITING
    });
}

function advanceRedGrowth(event, matureBlock, isInitialGrowth) {
    const block = event.block;
    const current = block.typeId;
    const rawTimer = getCropProperty(event, RED_TIMER_PROPERTY);
    let remaining;

    if (rawTimer === undefined || rawTimer === null) {
        remaining = RED_GROW_SECONDS;
    } else if (typeof rawTimer !== "number" || !Number.isFinite(rawTimer) || rawTimer < 0 || rawTimer > RED_GROW_SECONDS) {
        logError(
            "red-growth:invalid-timer",
            event,
            new Error(`Invalid red growth timer: ${String(rawTimer)}; resetting to ${RED_GROW_SECONDS} seconds`),
            { rawTimer, recovery: "reset timer to 30 seconds" }
        );
        remaining = RED_GROW_SECONDS;
    } else {
        remaining = rawTimer;
    }

    if (remaining <= 1) {
        block.setPermutation(BlockPermutation.resolve(matureBlock));
        setCropProperty(event, RED_TIMER_PROPERTY, undefined);
        const phase = isInitialGrowth ? RED_PHASE_NEEDS_STICK : RED_PHASE_FRUITING;
        setCropProperty(event, RED_PHASE_PROPERTY, phase);
        logTransition(event, "growth-complete", current, matureBlock, phase, 0, {
            red_growth_phase: phase
        });
        return;
    }

    setCropProperty(event, RED_TIMER_PROPERTY, remaining - 1);
}

function handleRedMatureInteract(event, stage2, regrow) {
    const block = event.block;
    const item = getMainhand(event.player);
    if (!item) return;

    let phase = getCropProperty(event, RED_PHASE_PROPERTY);
    if (phase === undefined || phase === null) {
        phase = RED_PHASE_NEEDS_STICK;
        setCropProperty(event, RED_PHASE_PROPERTY, phase);
    } else if (phase !== RED_PHASE_NEEDS_STICK && phase !== RED_PHASE_FRUITING) {
        logError(
            "red-growth:invalid-phase",
            event,
            new Error(`Unexpected red growth phase: ${String(phase)}`),
            { phase, recovery: "reset mature crop to needs_stick" }
        );
        setCropProperty(event, RED_PHASE_PROPERTY, RED_PHASE_NEEDS_STICK);
        setCropProperty(event, RED_TIMER_PROPERTY, undefined);
        return;
    }

    if (phase === RED_PHASE_NEEDS_STICK) {
        if (item.typeId === "minecraft:stick") {
            setRedGrowing(event, regrow, "stick-started-fruiting-cycle", stage2);
        }
        return;
    }

    if (item.typeId !== "minecraft:shears") return;
    const amount = 1 + Math.floor(Math.random() * 2);
    spawnItem(event.dimension, block, "karasichek:grape_red", amount);
    setRedGrowing(event, regrow, "harvested-with-shears", stage2);
}

// Не разрешаем поставить блок поверх лозы. При новой посадке удаляем старое
// состояние этой координаты, чтобы она не наследовала таймер прежней культуры.
try {
    const placeBlockEvent = world.beforeEvents?.playerPlaceBlock;
    if (placeBlockEvent?.subscribe) {
        placeBlockEvent.subscribe(event => safely("playerPlaceBlock", event, () => {
            if (isAddonBush(event.block)) {
                event.cancel = true;
                return;
            }
            clearCropProperties(event, CROP_PROPERTIES);
        }));
    }
} catch (error) {
    logError("playerPlaceBlock:subscribe", null, error);
}

// Чистим сохранённые координатные свойства при обычном разрушении культуры.
try {
    const breakBlockEvent = world.beforeEvents?.playerBreakBlock;
    if (breakBlockEvent?.subscribe) {
        breakBlockEvent.subscribe(event => safely("playerBreakBlock", event, () => {
            if (event.block?.typeId?.includes("_crop_")) {
                clearCropProperties(event, CROP_PROPERTIES);
            }
        }));
    }
} catch (error) {
    logError("playerBreakBlock:subscribe", null, error);
}

system.beforeEvents.startup.subscribe(event => safely("startup", event, () => {
    const blockComponentRegistry = event?.blockComponentRegistry;
    if (!blockComponentRegistry) throw new Error("blockComponentRegistry is unavailable at startup");

    try { registerPressingTubComponent(blockComponentRegistry); }
    catch (error) { logError("pressing-tub:register", event, error); }

    for (const color of VARIANTS) {
        const stage1 = `karasichek:grape_crop_${color}_stage1`;
        const stage2 = `karasichek:grape_crop_${color}_stage2`;
        const regrow = `karasichek:grape_crop_${color}_regrowing`;
        const comp1 = `karasichek:grape_crop_${color}_stage1_comp`;
        const comp2 = `karasichek:grape_crop_${color}_stage2_comp`;
        const compr = `karasichek:grape_crop_${color}_regrow_comp`;

        const register = (id, component) => {
            try {
                blockComponentRegistry.registerCustomComponent(id, component);
            } catch (error) {
                logError(`register:${id}`, null, error, { componentId: id });
            }
        };

        if (color === "red") {
            register(comp1, {
                onTick(tickEvent) {
                    safely("red-growth:planted-tick", tickEvent,
                        () => advanceRedGrowth(tickEvent, stage2, true),
                        { expectedBlock: stage1 }
                    );
                }
            });

            register(comp2, {
                onPlayerInteract(interactEvent) {
                    const heldItem = safeRead(() => getMainhand(interactEvent.player)?.typeId, null);
                    safely("red-growth:mature-interact", interactEvent,
                        () => handleRedMatureInteract(interactEvent, stage2, regrow),
                        { expectedBlock: stage2, heldItem }
                    );
                }
            });

            register(compr, {
                onTick(tickEvent) {
                    safely("red-growth:regrowing-tick", tickEvent,
                        () => advanceRedGrowth(tickEvent, stage2, false),
                        { expectedBlock: regrow }
                    );
                }
            });
            continue;
        }

        // Белый виноград: палка переводит первую стадию в зрелую.
        register(comp1, {
            onPlayerInteract(interactEvent) {
                safely("white-growth:stage1-interact", interactEvent, () => {
                    const item = getMainhand(interactEvent.player);
                    if (!item || item.typeId !== "minecraft:stick") return;
                    interactEvent.block.setPermutation(BlockPermutation.resolve(stage2));
                    logTransition(interactEvent, "legacy-stick-stage-change", stage1, stage2, "legacy", null);
                }, { expectedBlock: stage1 });
            }
        });

        // Белый виноград выпадает как karasichek:grape (без суффикса _white).
        register(comp2, {
            onPlayerInteract(interactEvent) {
                const heldItem = safeRead(() => getMainhand(interactEvent.player)?.typeId, null);
                safely("white-growth:stage2-interact", interactEvent, () => {
                    const item = getMainhand(interactEvent.player);
                    if (!item || item.typeId !== "minecraft:shears") return;
                    const amount = 1 + Math.floor(Math.random() * 2);
                    spawnItem(interactEvent.dimension, interactEvent.block, "karasichek:grape", amount);
                    interactEvent.block.setPermutation(BlockPermutation.resolve(regrow));
                    setCropProperty(interactEvent, RED_TIMER_PROPERTY, WHITE_REGROW_SECONDS);
                    logTransition(interactEvent, "legacy-harvest", stage2, regrow, "legacy", WHITE_REGROW_SECONDS);
                }, { expectedBlock: stage2, heldItem });
            }
        });

        register(compr, {
            onTick(tickEvent) {
                safely("white-growth:regrowing-tick", tickEvent, () => {
                    const rawTimer = getCropProperty(tickEvent, RED_TIMER_PROPERTY);
                    const timer = typeof rawTimer === "number" && Number.isFinite(rawTimer) && rawTimer >= 0
                        ? rawTimer
                        : WHITE_REGROW_SECONDS;
                    if (timer <= 1) {
                        tickEvent.block.setPermutation(BlockPermutation.resolve(stage2));
                        setCropProperty(tickEvent, RED_TIMER_PROPERTY, undefined);
                        logTransition(tickEvent, "legacy-regrowth-complete", regrow, stage2, "legacy", 0);
                        return;
                    }
                    setCropProperty(tickEvent, RED_TIMER_PROPERTY, timer - 1);
                }, { expectedBlock: regrow });
            }
        });
    }
}));
