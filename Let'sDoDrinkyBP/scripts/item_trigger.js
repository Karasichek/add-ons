import { system } from "@minecraft/server";

system.beforeEvents.startup.subscribe((initEvent) => {
  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_glowberry_custard:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:night_vision", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:slow_falling", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:weakness");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_green_tea_cold:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:jump_boost", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:night_vision", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:water_breathing", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:haste");
      e.source.removeEffect("minecraft:nausea");
      e.source.removeEffect("minecraft:weakness");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_green_tea_hot:trigger", {
    onConsume: (e) => {
      e.source.removeEffect("minecraft:weakness");
      e.source.removeEffect("minecraft:haste");
      e.source.removeEffect("minecraft:blindness");
      e.source.removeEffect("minecraft:bad_omen");
      e.source.removeEffect("minecraft:hunger");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_green_tea_lemon:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:jump_boost", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:night_vision", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:water_breathing", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:haste");
      e.source.removeEffect("minecraft:nausea");
      e.source.removeEffect("minecraft:weakness");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_lavender_te_cold:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:absorption", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:hunger");
      e.source.removeEffect("minecraft:nausea");
      e.source.removeEffect("minecraft:poison");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_matcha_tea:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:hunger");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_oolong_tea:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:hunger");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_tea_black_cold:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:hunger");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_tea_black_hot:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:health_boost", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:jump_boost", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:speed", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:hunger");
      e.source.removeEffect("minecraft:weakness");
      e.source.removeEffect("minecraft:blindness");
    },
  });

  initEvent.itemComponentRegistry.registerCustomComponent("karasichek_tea_black_lemon:trigger", {
    onConsume: (e) => {
      e.source.addEffect("minecraft:regeneration", 600, { amplifier: 1 });
      e.source.addEffect("minecraft:saturation", 600, { amplifier: 1 });
      e.source.removeEffect("minecraft:hunger");
    },
  });
});
