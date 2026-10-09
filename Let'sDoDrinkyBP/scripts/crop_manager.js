import { system, GameMode, ItemStack } from '@minecraft/server';

/**
 * Простой time-based рост для кастомных кропов аддона.
 *
 * Подключается через JSON-компонент `item:crop`:
 *   "item:crop": {
 *     "max_growth": 2,
 *     "bone_meal_boost": [1, 2]
 *   }
 *
 * Блок сам по себе должен иметь состояние `pa:growth` (min=0, max=N)
 * и компонент `minecraft:tick` с нужным интервалом — никакой случайной
 * проверки света / фермленда / шансов. Каждый тик — +1 к стадии.
 */
class CropManager {
    static COMPONENT_ID = 'item:crop';
    static STATE_GROWTH = 'pa:growth';

    static init() {
        system.beforeEvents.startup.subscribe(initEvent => {
            initEvent.blockComponentRegistry.registerCustomComponent(this.COMPONENT_ID, {
                onTick: (e, params) => this._handleTick(e, params),
                onPlayerInteract: (e, params) => this._handleInteract(e, params)
            });
        });
    }

    /**
     * @param {import('@minecraft/server').BlockComponentTickEvent} e
     * @param {import('@minecraft/server').CustomComponentParameters} params
     */
    static _handleTick(e, params) {
        const { block, dimension } = e;
        if (!block || !block.isValid) return;

        try {
            const compParams = (params && params.params) || {};
            const maxGrowth = this._num(compParams.max_growth, 1);

            const current = block.permutation.getState(this.STATE_GROWTH);
            const growth = typeof current === 'number' ? current : 0;
            if (growth >= maxGrowth) return;

            block.setPermutation(
                block.permutation.withState(this.STATE_GROWTH, growth + 1)
            );

            try {
                dimension.spawnParticle('minecraft:crop_growth_emitter', block.center());
            } catch (_) { /* партикл опционален */ }
        } catch (error) {
            console.warn('[CropManager] tick error:', error);
        }
    }

    /**
     * @param {import('@minecraft/server').BlockComponentPlayerInteractEvent} e
     * @param {import('@minecraft/server').CustomComponentParameters} params
     */
    static _handleInteract(e, params) {
        const { block, player, dimension } = e;
        if (!block || !block.isValid || !player) return;

        try {
            const equippable = player.getComponent('minecraft:equippable');
            if (!equippable) return;
            const mainhand = equippable.getEquipmentSlot('Mainhand');
            if (!mainhand.hasItem()) return;

            const item = mainhand.getItem();
            if (!item || item.typeId !== 'minecraft:bone_meal') return;

            const compParams = (params && params.params) || {};
            const maxGrowth = this._num(compParams.max_growth, 1);
            const boost = Array.isArray(compParams.bone_meal_boost) ? compParams.bone_meal_boost : null;

            const current = block.permutation.getState(this.STATE_GROWTH);
            const growth = typeof current === 'number' ? current : 0;
            if (growth >= maxGrowth) return;

            let growthBoost = 1;
            if (boost && boost.length >= 2) {
                const min = this._num(boost[0], 1);
                const max = this._num(boost[1], min);
                growthBoost = Math.floor(Math.random() * (max - min + 1)) + min;
            } else if (maxGrowth >= 7) {
                growthBoost = Math.floor(Math.random() * 4) + 2;
            } else if (maxGrowth >= 4) {
                growthBoost = Math.floor(Math.random() * 2) + 1;
            }

            block.setPermutation(
                block.permutation.withState(this.STATE_GROWTH, Math.min(growth + growthBoost, maxGrowth))
            );

            if (player.getGameMode() !== GameMode.creative) {
                if (item.amount > 1) {
                    mainhand.setItem(new ItemStack(item.typeId, item.amount - 1));
                } else {
                    mainhand.setItem(undefined);
                }
            }

            try {
                const fx = block.center();
                dimension.playSound('item.bone_meal.use', fx);
                dimension.spawnParticle('minecraft:crop_growth_emitter', fx);
            } catch (_) { /* эффекты опциональны */ }
        } catch (error) {
            console.warn('[CropManager] interact error:', error);
        }
    }

    static _num(v, fallback) {
        return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
    }
}

CropManager.init();
