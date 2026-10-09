import { system, BlockPermutation } from '@minecraft/server';

/**
 * Универсальный «снегоотталкиватель» для любых кустов / лоз.
 *
 * Подключается к блокам через JSON-компонент `karasichek:snow_prevention`:
 *   "karasichek:snow_prevention": {}
 *   "minecraft:tick": {
 *     "interval_range": [40, 40],
 *     "looping": true
 *   }
 *
 * На каждом onTick проверяет блок прямо над кустом и принудительно
 * убирает оттуда снежный слой. Дополняет `minecraft:precipitation_interactions`
 * — на случай, если снег всё-таки просочился (старые билды / снежные биомы).
 */
class SnowPrevention {
    static COMPONENT_ID = 'karasichek:snow_prevention';

    static init() {
        system.beforeEvents.startup.subscribe(initEvent => {
            initEvent.blockComponentRegistry.registerCustomComponent(this.COMPONENT_ID, {
                onTick: (e) => this._handleTick(e)
            });
        });
    }

    static _handleTick(e) {
        try {
            const { block, dimension } = e;
            if (!block || !block.isValid) return;

            const above = block.above();
            if (!above || !above.isValid) return;

            // Снежный покров бывает двух вариантов — обычный и snowlogged.
            // В обоих случаях нас интересует именно snow_layer.
            if (above.typeId !== 'minecraft:snow_layer' && above.typeId !== 'minecraft:snow') return;

            // Сначала пробуем нормальный API, иначе фоллбэк через команду.
            try {
                above.setPermutation(BlockPermutation.resolve('minecraft:air'));
                return;
            } catch (_) { /* фоллбэк ниже */ }

            try {
                const { x, y, z } = above.location;
                dimension.runCommand(`setblock ${x} ${y} ${z} air`);
            } catch (_) { /* чанк выгружен — пропускаем */ }
        } catch (_) {
            // Полная тишина: тик безопасности, ошибки не должны падать в консоль.
        }
    }
}

SnowPrevention.init();
