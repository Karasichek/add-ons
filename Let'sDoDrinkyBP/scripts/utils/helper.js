import { system, ItemStack, Direction } from '@minecraft/server';

export function randomFunction(funcList) {
    const index = Math.floor(Math.random() * funcList.length);
    return funcList[index];
}

export function decrementStack(player) {
    if (player.getGameMode() == 'creative')
        return;
    let item = player.getComponent('inventory').container.getItem(player.selectedSlotIndex);
    let inventory = player.getComponent('inventory').container;
    if (item.amount == 1)
        inventory.setItem(player.selectedSlotIndex, undefined);
    else
        inventory.setItem(player.selectedSlotIndex, new ItemStack(item.typeId, item.amount - 1));
}

export function updateLiquidBlock(dimension, location) {
    dimension.setBlockType(location, 'minecraft:bedrock');
    dimension.setBlockType(location, 'minecraft:air');
}

export function updateIfAir(dimension, block, blockLocation) {
    if (block.typeId == 'minecraft:air')
        updateLiquidBlock(dimension, blockLocation);
}

export const DirectionType = {
    HORIZONTAL: [
        Direction.North,
        Direction.South,
        Direction.West,
        Direction.East
    ]
};

export function getOppositeDirection(direction) {
    switch (direction) {
        case Direction.Up:
            return Direction.Down;
        case Direction.Down:
            return Direction.Up;
        case Direction.North:
            return Direction.South;
        case Direction.East:
            return Direction.West;
        case Direction.South:
            return Direction.North;
        case Direction.West:
            return Direction.East;
        default:
            break;
    }
}

export function doesBlockBlockMovement(block) {
    return (block.typeId != 'minecraft:cobweb' &&
        block.typeId != 'minecraft:bamboo_sapling' &&
        !block.isLiquid &&
        !block.isAir);
}

export const cardinalSides = Object.freeze({
    north: { left: 'east', right: 'west', },
    south: { left: 'west', right: 'east', },
    west: { left: 'north', right: 'south', },
    east: { left: 'south', right: 'north', }
});

export function shouldConnect(block) {
    if (!block || block.isAir || block.isLiquid) return false;

    const id = block.typeId;

    const nonSolidKeywords = [
        "grass",
        "flower",
        "plant",
        "sapling",
        "bamboo",
        "leaves",
        "torch",
        "button",
        "lever",
        "rail",
        "tripwire",
        "carpet",
        "vine",
        "ladder",
        "deadbush",
        "kelp",
        "seagrass",
        "coral",
        "root"
    ];

    if (id.includes("grass") && !id.includes("grass_block")) return false;

    for (const keyword of nonSolidKeywords) {
        if (keyword !== "grass" && id.includes(keyword)) return false;
    }

    if (id.includes("fence") ||
        id.includes("wall") ||
        id.includes("gate") ||
        id.includes("pane") ||
        id.includes("iron_bars")) {
        return true;
    }

    return true;
}

export function safeUpdateStairShape(targetBlock, newShapeState) {
  system.run(() => {
    const currentPerm = targetBlock.permutation;

    if (currentPerm.getState('pa:shape') !== undefined) {
      targetBlock.setPermutation(currentPerm.withState('pa:shape', newShapeState));
    }
  });
}
