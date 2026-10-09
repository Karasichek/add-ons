import { system, world } from '@minecraft/server';
import { decrementStack, getOppositeDirection, DirectionType, cardinalSides, randomFunction, shouldConnect, safeUpdateStairShape } from './utils/helper';
import { directionToVector3 } from './utils/math';

system.beforeEvents.startup.subscribe(initEvent => {
  initEvent.blockComponentRegistry.registerCustomComponent('karasichek_coffee_crop:trigger', {
  onPlayerBreak: e => { const { x, y, z } = e.block.location;
const equippable = e.player.getComponent("minecraft:equippable");
    if (!equippable) return;

    const mainhand = equippable.getEquipmentSlot("Mainhand");
    if (!mainhand.hasItem()) return;

    const itemTags = mainhand.getTags();
    const toolTags = ["minecraft:is_pickaxe"];

    if (toolTags.length > 0 && !itemTags.some(item => toolTags.includes(item))) return;
    
    e.dimension.runCommand(`execute positioned ${x} ${y} ${z} run loot spawn ~~~ loot "blocks/karasichek_coffee_crop"`); },
});

initEvent.blockComponentRegistry.registerCustomComponent('karasichek_kettle:trigger', {
    onPlayerInteract(e) {
        const { x, y, z } = e.block.location;
        const dimension = e.dimension;

        system.run(() => {
            try {
                dimension.runCommand(`execute positioned ${x} ${y} ${z} run function boil`);
            } catch (err) {
                console.warn("Kettle error:", err);
            }
        });
    }
});

initEvent.blockComponentRegistry.registerCustomComponent('karasichek_kamelia_crop:trigger', {
  onPlayerBreak: e => { const { x, y, z } = e.block.location;
const equippable = e.player.getComponent("minecraft:equippable");
    if (!equippable) return;

    const mainhand = equippable.getEquipmentSlot("Mainhand");
    if (!mainhand.hasItem()) return;

    const itemTags = mainhand.getTags();
    const toolTags = ["minecraft:is_pickaxe"];

    if (toolTags.length > 0 && !itemTags.some(item => toolTags.includes(item))) return;
    
    e.dimension.runCommand(`execute positioned ${x} ${y} ${z} run loot spawn ~~~ loot "blocks/karasichek_kamelia_crop"`); },
});

initEvent.blockComponentRegistry.registerCustomComponent('karasichek_lavender_crop:trigger', {
  onPlayerBreak: e => { const { x, y, z } = e.block.location;
const equippable = e.player.getComponent("minecraft:equippable");
    if (!equippable) return;

    const mainhand = equippable.getEquipmentSlot("Mainhand");
    if (!mainhand.hasItem()) return;

    const itemTags = mainhand.getTags();
    const toolTags = ["minecraft:is_pickaxe"];

    if (toolTags.length > 0 && !itemTags.some(item => toolTags.includes(item))) return;
    
    e.dimension.runCommand(`execute positioned ${x} ${y} ${z} run loot spawn ~~~ loot "blocks/karasichek_lavender_crop"`); },
});

initEvent.blockComponentRegistry.registerCustomComponent('karasichek_lemon_sapling:trigger', {
  onPlayerInteract: e => { const { x, y, z } = e.block.location;
const { block, dimension, player } = e;

if (!player) return;

const equippable = player.getComponent("minecraft:equippable");
if (!equippable) return;

const mainhand = equippable.getEquipmentSlot("Mainhand");
if (!mainhand.hasItem() || mainhand.typeId !== "minecraft:bone_meal")
    return;

if (mainhand.amount > 1) mainhand.amount--;
else mainhand.setItem(undefined);

block.setType('minecraft:air');
dimension.placeFeature("karasichek:lemon_tree", block.location);

const effectLocation = block.center();
dimension.playSound("item.bone_meal.use", effectLocation);
dimension.spawnParticle(
    "minecraft:crop_growth_emitter",
    effectLocation
);
 },
onRandomTick: e => { const { x, y, z } = e.block.location;
const { block, dimension } = e;

block.setType('minecraft:air');
dimension.placeFeature("karasichek:lemon_tree", block.location);
 },
});

});
