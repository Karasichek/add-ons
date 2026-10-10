import { world, system, ItemStack, GameMode } from "@minecraft/server";

const NS = "karasichek";
const BLOCK = `${NS}:pressing_tub`;
const DISPLAY = `${NS}:pressing_item_display`;
const LIQUID = `${NS}:pressing_liquid_display`;
const INPUTS = Object.freeze({
    "karasichek:grape": { color: "white", juice: "karasichek:grapejuice_white" },
    "karasichek:grape_red": { color: "red", juice: "karasichek:grapejuice_red" }
});
const PRESS_MILLIBUCKETS = 50;
const CAPACITY = 1000;
const SLOT_LIMIT = 64;
const EMPTY_VESSEL = "karasichek:bocal_empty";
const GOLDEN_ANGLE = 2.399963229728653;
const pressedFalls = new Map();
const pendingFalls = new Map();
const fallDamageFallback = new Set();

function locationOf(block) { return block.location; }
function stateKey(block) {
    const p = locationOf(block), dim = block.dimension.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `karasichek:pressing_tub:${dim}:${p.x}:${p.y}:${p.z}`;
}
function freshState() { return { version: 1, color: "", grapes: 0, amount: 0 }; }
function load(block) {
    let raw;
    try { raw = world.getDynamicProperty(stateKey(block)); } catch { return freshState(); }
    if (typeof raw !== "string") return freshState();
    try {
        const s = JSON.parse(raw);
        if (s?.version !== 1 || !["", "red", "white"].includes(s.color) || !Number.isInteger(s.grapes) || s.grapes < 0 || s.grapes > SLOT_LIMIT || !Number.isInteger(s.amount) || s.amount < 0 || s.amount > CAPACITY) throw new Error("bad state");
        if ((s.grapes > 0 || s.amount > 0) && !s.color) throw new Error("missing color");
        if (s.grapes === 0 && s.amount === 0) s.color = "";
        return s;
    } catch (error) {
        console.warn(`[Let'sDoVinery][pressing-tub] Invalid state at ${stateKey(block)}; recovering empty. ${error}`);
        return freshState();
    }
}
function save(block, state) {
    if (state.grapes === 0 && state.amount === 0) state.color = "";
    world.setDynamicProperty(stateKey(block), JSON.stringify(state));
}
function inventoryOf(player) { return player.getComponent("minecraft:inventory")?.container; }
function heldItem(player) {
    const c = inventoryOf(player); return c ? c.getItem(player.selectedSlotIndex) : undefined;
}
function setHeld(player, item) {
    const c = inventoryOf(player); if (!c) throw new Error("Player inventory unavailable");
    c.setItem(player.selectedSlotIndex, item);
}
function consumeHeld(player, amount = 1) {
    const item = heldItem(player); if (!item || item.amount < amount) return false;
    if (item.amount === amount) setHeld(player, undefined);
    else { const rest = item.clone(); rest.amount -= amount; setHeld(player, rest); }
    return true;
}
function giveItem(player, id, amount = 1) {
    const c = inventoryOf(player); if (!c) return false;
    return c.addItem(new ItemStack(id, amount)) === undefined;
}
function report(player, text) { try { player.onScreenDisplay.setActionBar(text); } catch {} }
function anchorKey(block) { return stateKey(block); }
function nearby(block, type, radius = 1.7) {
    const p = block.location;
    return block.dimension.getEntities({ type, location: { x: p.x + .5, y: p.y + .5, z: p.z + .5 }, maxDistance: radius });
}
function cleanDisplays(block) {
    const key = anchorKey(block);
    for (const type of [DISPLAY, LIQUID]) for (const entity of nearby(block, type, 1.8)) {
        try { if (entity.getDynamicProperty("karasichek:anchor") === key) entity.remove(); } catch {}
    }
}
function visualCount(n) { return n === 0 ? 0 : Math.ceil(n / 2); }
function displayPosition(block, index, scale) {
    const p = block.location, angle = index * GOLDEN_ANGLE, radius = Math.sqrt((index + .5) / 32) * 2.2;
    const xpx = Math.cos(angle) * radius, zpx = Math.sin(angle) * radius;
    const ypx = 2.4 + Math.floor(index / 8) * .45 + (index % 4) * .04;
    // Offset the actual rendered item for the source model's rightitem bone anchor.
    const yaw = ((index * 137.508) % 360) * Math.PI / 180;
    const lx = -5 * scale / 16, lz = 1.75 * scale / 16, ly = -2.5 * scale / 16;
    const rx = lx * Math.cos(yaw) - lz * Math.sin(yaw), rz = lx * Math.sin(yaw) + lz * Math.cos(yaw);
    return { position: { x: p.x + .5 + xpx / 16 - rx, y: p.y + ypx / 16 - ly, z: p.z + .5 + zpx / 16 - rz }, yaw: yaw * 180 / Math.PI };
}
function syncDisplays(block, state) {
    const key = anchorKey(block), wantCount = visualCount(state.grapes);
    const items = nearby(block, DISPLAY, 1.8).filter(e => e.getDynamicProperty("karasichek:anchor") === key);
    const byIndex = new Map();
    for (const e of items) {
        const i = Number(e.getDynamicProperty("karasichek:index"));
        if (Number.isInteger(i) && i >= 0 && !byIndex.has(i)) byIndex.set(i, e); else try { e.remove(); } catch {}
    }
    const itemId = state.color === "red" ? "karasichek:grape_red" : "karasichek:grape";
    for (let i = 0; i < wantCount; i++) {
        const scale = .52 + (i % 4 - 1.5) * .012, { position, yaw } = displayPosition(block, i, scale);
        let e = byIndex.get(i);
        try {
            if (!e) {
                e = block.dimension.spawnEntity(DISPLAY, position, { initialRotation: yaw });
                e.setDynamicProperty("karasichek:anchor", key); e.setDynamicProperty("karasichek:index", i);
                byIndex.set(i, e);
            } else e.teleport(position, { rotation: { x: 0, y: yaw } });
            e.setRotation({ x: 0, y: yaw });
            const scaleInt = Math.round(scale * 100);
            if (e.getProperty("karasichek:display_scale") !== scaleInt) e.setProperty("karasichek:display_scale", scaleInt);
            if (e.getDynamicProperty("karasichek:item") !== itemId) {
                e.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${itemId}`);
                e.setDynamicProperty("karasichek:item", itemId);
            }
        } catch (error) { console.warn(`[Let'sDoVinery][pressing-tub] grape visual: ${error}`); }
    }
    for (const [i, e] of byIndex) if (i >= wantCount) try { e.remove(); } catch {}

    const wantedFluid = state.amount > 0;
    const liquidEntities = nearby(block, LIQUID, 1.8).filter(e => e.getDynamicProperty("karasichek:anchor") === key);
    let liquid = liquidEntities.shift();
    for (const e of liquidEntities) try { e.remove(); } catch {}
    if (!wantedFluid) { if (liquid) try { liquid.remove(); } catch {} return; }
    try {
        if (!liquid) {
            liquid = block.dimension.spawnEntity(LIQUID, { x: block.location.x + .5, y: block.location.y, z: block.location.z + .5 });
            liquid.setDynamicProperty("karasichek:anchor", key);
        }
        liquid.setProperty("karasichek:amount", state.amount);
        const tint = state.color === "red" ? "red" : "white";
        if (liquid.getDynamicProperty("karasichek:color") !== tint) {
            liquid.triggerEvent(`karasichek:set_${tint}`);
            liquid.setDynamicProperty("karasichek:color", tint);
        }
    } catch (error) { console.warn(`[Let'sDoVinery][pressing-tub] liquid visual: ${error}`); }
}
function status(state) {
    const color = state.color ? (state.color === "red" ? "Red" : "White") : "";
    return `Grape Press${color ? ` · ${color}` : ""} · ${state.amount}/${CAPACITY} mB juice · ${state.grapes} grapes`;
}
function interact(event) {
    const block = event.block, player = event.player;
    if (!player || !block || block.typeId !== BLOCK) return;
    const s = load(block), item = heldItem(player), input = item && INPUTS[item.typeId];
    try {
        if (input) {
            if ((s.color && s.color !== input.color) || s.grapes >= SLOT_LIMIT) {
                report(player, s.grapes >= SLOT_LIMIT ? "The Grape Press is full of grapes." : "Do not mix red and white grapes."); return;
            }
            const n = Math.min(item.amount, SLOT_LIMIT - s.grapes);
            if (!n) return;
            s.color = input.color; s.grapes += n;
            if (!consumeHeld(player, n)) return;
            save(block, s); syncDisplays(block, s); report(player, `${n} ${input.color} grapes added. ${s.grapes} in the press.`); return;
        }
        if (item?.typeId === EMPTY_VESSEL && s.amount >= PRESS_MILLIBUCKETS) {
            const juiceColor = s.color;
            const juice = juiceColor === "red" ? "karasichek:grapejuice_red" : "karasichek:grapejuice_white";
            if (item.amount === 1) setHeld(player, new ItemStack(juice, 1));
            else if (!giveItem(player, juice, 1)) { report(player, "Your inventory is full."); return; }
            if (item.amount > 1) consumeHeld(player, 1);
            s.amount -= PRESS_MILLIBUCKETS;
            if (!s.amount && !s.grapes) s.color = "";
            save(block, s); syncDisplays(block, s);
            report(player, `${juiceColor === "red" ? "Red" : "White"} grape juice collected · ${s.amount} mB remains.`); return;
        }
        if (!item && player.isSneaking && s.grapes > 0) {
            const id = s.color === "red" ? "karasichek:grape_red" : "karasichek:grape";
            if (!giveItem(player, id, 1)) { report(player, "Your inventory is full."); return; }
            s.grapes--; save(block, s); syncDisplays(block, s); report(player, `Removed 1 grape · ${s.grapes} remain.`); return;
        }
        report(player, status(s));
    } catch (error) {
        console.error(`[Let'sDoVinery][pressing-tub] interaction failed: ${error}`);
        report(player, "The Grape Press could not complete that action.");
    }
}
function press(event) {
    const block = event.block, entity = event.entity;
    if (!block || block.typeId !== BLOCK || !entity || (event.fallDistance ?? 0) < .5 || pendingFalls.has(entity.id)) return;
    const face = block.permutation.getState("minecraft:block_face");
    if (["north", "east", "south", "west"].includes(face)) return;
    const s = load(block);
    if (s.grapes <= 0 || s.amount + PRESS_MILLIBUCKETS > CAPACITY) return;
    s.grapes--; s.amount += PRESS_MILLIBUCKETS;
    save(block, s); syncDisplays(block, s);
    pressedFalls.set(entity.id, { tick: system.currentTick, pressed: true });
    if (pressedFalls.size > 256) for (const [id, v] of pressedFalls) if (system.currentTick - v.tick > 2) pressedFalls.delete(id);
    try { const pos = { x: block.location.x + .5, y: block.location.y + .5, z: block.location.z + .5 }; block.dimension.playSound("block.slime_block.fall", pos, { volume: .65, pitch: .8 + Math.random() * .3 }); block.dimension.spawnParticle("karasichek:pressed_grape", pos); } catch {}
    if (entity.typeId === "minecraft:player") report(entity, `${s.color === "red" ? "Red" : "White"} grapes pressed · ${s.amount}/${CAPACITY} mB juice · ${s.grapes} grapes remain.`);
}
function recover(event) {
    const id = event.brokenBlockPermutation?.type?.id ?? event.brokenBlockPermutation?.typeId ?? event.block?.typeId;
    if (id !== BLOCK) return;
    const p = event.block.location, dim = event.dimension ?? event.block.dimension;
    const key = `karasichek:pressing_tub:${dim.id.replace(/[^a-zA-Z0-9_-]/g, "_")}:${p.x}:${p.y}:${p.z}`;
    let state = freshState();
    try { const raw = world.getDynamicProperty(key); if (typeof raw === "string") state = JSON.parse(raw); } catch {}
    let recovered = true;
    try {
        const n = Math.max(0, Math.min(SLOT_LIMIT, Number(state.grapes) || 0));
        if (n > 0 && world.gameRules?.doTileDrops !== false) {
            const grape = state.color === "red" ? "karasichek:grape_red" : "karasichek:grape";
            for (let left = n; left > 0;) { const take = Math.min(64, left); dim.spawnItem(new ItemStack(grape, take), { x: p.x + .5, y: p.y + .3, z: p.z + .5 }); left -= take; }
        }
    } catch (error) { recovered = false; console.warn(`[Let'sDoVinery][pressing-tub] content recovery failed; saved state retained: ${error}`); }
    try {
        for (const type of [DISPLAY, LIQUID]) for (const e of dim.getEntities({ type, location: { x: p.x + .5, y: p.y + .5, z: p.z + .5 }, maxDistance: 2 }))
            if (e.getDynamicProperty("karasichek:anchor") === key) e.remove();
    } catch {}
    if (recovered) try { world.setDynamicProperty(key); } catch {}
}
export function registerPressingTubComponent(registry) {
    registry.registerCustomComponent("karasichek:pressing_tub", {
        onPlayerInteract: interact,
        onEntityFallOn: press,
        onPlace: event => { try { save(event.block, freshState()); syncDisplays(event.block, freshState()); } catch (e) { console.warn(`[Let'sDoVinery][pressing-tub] initialize: ${e}`); } },
        onTick: event => { try { if (event.block.typeId === BLOCK) syncDisplays(event.block, load(event.block)); } catch {} }
    });
}
function protectPressFall(event) {
    const entity = event.hurtEntity;
    if (event.cancel || event.damageSource?.cause !== "fall" || !entity || fallDamageFallback.has(entity.id)) return;
    const last = pressedFalls.get(entity.id);
    if (last && system.currentTick - last.tick <= 1) { if (last.pressed) event.cancel = true; return; }
    const p = entity.location;
    let block;
    try { block = entity.dimension.getBlock({ x: Math.floor(p.x), y: Math.floor(p.y - .01), z: Math.floor(p.z) }); } catch { return; }
    if (block?.typeId !== BLOCK || ["north", "east", "south", "west"].includes(block.permutation.getState("minecraft:block_face"))) return;
    if (entity.typeId === "minecraft:player" && [GameMode.Adventure, GameMode.Spectator].includes(entity.getGameMode())) return;
    const state = load(block);
    if (state.grapes <= 0 || state.amount + PRESS_MILLIBUCKETS > CAPACITY) return;
    event.cancel = true;
    const damage = event.damage, id = entity.id, at = { ...block.location }, dimension = block.dimension;
    pendingFalls.set(id, system.currentTick);
    system.run(() => {
        pendingFalls.delete(id);
        let current;
        try { current = dimension.getBlock(at); } catch {}
        if (current?.typeId === BLOCK) press({ block: current, entity, fallDistance: 1 });
        const result = pressedFalls.get(id);
        if (!result || result.tick !== system.currentTick || !result.pressed) {
            fallDamageFallback.add(id);
            try { entity.applyDamage(damage, { cause: "fall" }); } catch {}
            finally { fallDamageFallback.delete(id); }
        }
    });
}
try { world.beforeEvents.entityHurt?.subscribe(protectPressFall); } catch (error) { console.warn(`[Let'sDoVinery][pressing-tub] fall protection subscription failed: ${error}`); }

try {
    world.afterEvents.playerBreakBlock.subscribe(event => {
        const id = event.brokenBlockPermutation?.type?.id ?? event.brokenBlockPermutation?.typeId;
        if (id === BLOCK) recover(event);
    });
} catch (error) { console.warn(`[Let'sDoVinery][pressing-tub] recovery subscription failed: ${error}`); }
