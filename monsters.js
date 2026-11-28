import { world, system, Player, EntityDamageCause } from "@minecraft/server";
import {
  BASE_Y,
  GROUND_Y,
  HILLS_GROUND_Y,
  SEA_STONE_Y,
  DIM1_ID,
  DIM2_ID,
  DIM3_ID,
  DIM4_ID,
  MON_ROLL_EVERY,
  MON_KIL_CHANCE,
  MON_WATCHER_HUNT_CHANCE,
  MON_WATCHER_CALM_CHANCE,
  WATCHER_DIST,
  WATCHER_NEAR,
  WATCHER_FAR,
  WATCHER_LIFE,
  WATCHER_RUN_SPEED,
  WATCHER_HIT_DAMAGE,
  KIL_DIST,
  KIL_LIFE,
  KIL_SPEED,
  KIL_DAMAGE,
} from "./config.js";
import { valid, currentPhaseOfPlayer, safe } from "./utils.js";

const WATCHER_ID = "dream:watcher";
const KIL_ID = "dream:kil";
const PHASE_FLOOR = { town: BASE_Y, fields: GROUND_Y, hills: HILLS_GROUND_Y, sea: SEA_STONE_Y };
const HIT_REACH = 1.7;
const STEP_TICKS = 2;

const mobs = new Map();
const nextRoll = new Map();
const kilDone = new Set();

function isWeapon(id) {
  return (
    id.endsWith("_sword") ||
    id.endsWith("_axe") ||
    id.endsWith("bow") ||
    id.endsWith("trident") ||
    id.endsWith("mace")
  );
}

safe("monsterHurtGuard", () =>
  world.beforeEvents.entityHurt.subscribe((ev) => {
    if (ev.hurtEntity?.typeId !== WATCHER_ID) return;
    const src = ev.damageSource;
    if (src?.cause === EntityDamageCause.projectile) {
      ev.cancel = true;
      return;
    }
    const who = src?.damagingEntity;
    if (who instanceof Player) {
      try {
        const item = who.getComponent("minecraft:inventory")?.container?.getItem(who.selectedSlotIndex);
        if (item && isWeapon(item.typeId)) ev.cancel = true;
      } catch {}
    }
  })
);

function removeMob(name) {
  const s = mobs.get(name);
  if (!s) return;
  try {
    s.entity.remove();
  } catch {}
  mobs.delete(name);
}

function findSpot(player, dist, phase) {
  const dim = player.dimension;
  const floor = PHASE_FLOOR[phase] ?? 0;
  const base = Math.random() * Math.PI * 2;
  for (let i = 0; i < 12; i++) {
    const a = base + (i * Math.PI * 2) / 12;
    const x = Math.floor(player.location.x + Math.cos(a) * dist);
    const z = Math.floor(player.location.z + Math.sin(a) * dist);
    try {
      const top = dim.getTopmostBlock({ x, z });
      if (!top || top.y < floor) continue;
      return { x: x + 0.5, y: top.y + 1, z: z + 0.5 };
    } catch {}
  }
  return undefined;
}

function spawnMob(player, phase, now) {
  const name = player.name;
  const r = Math.random();
  let kind = null;
  if (r < MON_KIL_CHANCE) kind = kilDone.has(name) ? null : "kil";
  else if (r < MON_KIL_CHANCE + MON_WATCHER_HUNT_CHANCE) kind = "hunt";
  else if (r < MON_KIL_CHANCE + MON_WATCHER_HUNT_CHANCE + MON_WATCHER_CALM_CHANCE) kind = "calm";
  if (!kind) return;

  const spot = findSpot(player, kind === "kil" ? KIL_DIST : WATCHER_DIST, phase);
  if (!spot) return;
  let entity;
  try {
    entity = player.dimension.spawnEntity(kind === "kil" ? KIL_ID : WATCHER_ID, spot);
  } catch (err) {
    console.warn("dream monster spawn: " + err);
    return;
  }
  mobs.set(name, { kind, entity, born: now, mode: "watch", gy: spot.y });
  if (kind === "kil") {
    kilDone.add(name);
    try {
      player.teleport(player.location, { facingLocation: { x: spot.x, y: spot.y + 1.6, z: spot.z } });
    } catch {}
  }
}

function moveToward(e, p, s, step, d, dx, dz) {
  const el = e.location;
  const k = Math.min(step, d) / (d || 1);
  const ny = el.y + Math.max(-1.5, Math.min(1.5, s.gy - el.y));
  e.teleport(
    { x: el.x + dx * k, y: ny, z: el.z + dz * k },
    { facingLocation: p.getHeadLocation() }
  );
}

function updateMob(p, s, now) {
  const name = p.name;
  const e = s.entity;
  if (!valid(e) || e.dimension.id !== p.dimension.id) {
    removeMob(name);
    return;
  }
  const age = now - s.born;
  const loc = p.location;
  const el = e.location;
  const dx = loc.x - el.x;
  const dz = loc.z - el.z;
  const d = Math.hypot(dx, dz);
  if (p.isOnGround) s.gy = loc.y;
  const closeEnough = d <= HIT_REACH && Math.abs(loc.y - el.y) <= 3;

  if (s.kind === "kil") {
    if (age >= KIL_LIFE) return removeMob(name);
    if (closeEnough) {
      try {
        p.applyDamage(KIL_DAMAGE, { cause: EntityDamageCause.entityAttack, damagingEntity: e });
      } catch {}
      removeMob(name);
      return;
    }
    moveToward(e, p, s, (KIL_SPEED * STEP_TICKS) / 20, d, dx, dz);
    return;
  }

  if (age >= WATCHER_LIFE || d >= WATCHER_FAR) return removeMob(name);

  if (s.mode === "watch") {
    if (d > WATCHER_NEAR) {
      e.teleport(el, { facingLocation: p.getHeadLocation() });
      return;
    }
    if (s.kind === "calm") return removeMob(name);
    s.mode = "chase";
  }

  if (closeEnough) {
    try {
      p.applyDamage(WATCHER_HIT_DAMAGE, { cause: EntityDamageCause.entityAttack, damagingEntity: e });
      p.addEffect("nausea", 200, { amplifier: 0, showParticles: false });
      p.addEffect("blindness", 60, { amplifier: 0, showParticles: false });
      p.addEffect("slowness", 60, { amplifier: 3, showParticles: false });
      p.playSound("dream.heartbeat", { volume: 1 });
    } catch {}
    removeMob(name);
    return;
  }
  moveToward(e, p, s, (WATCHER_RUN_SPEED * STEP_TICKS) / 20, d, dx, dz);
}

export function tickMonsters() {
  const now = system.currentTick;
  for (const p of world.getAllPlayers()) {
    const name = p.name;
    const phase = valid(p) ? currentPhaseOfPlayer(p) : null;
    if (!phase) {
      removeMob(name);
      nextRoll.delete(name);
      kilDone.delete(name);
      continue;
    }
    if (!nextRoll.has(name)) nextRoll.set(name, now + MON_ROLL_EVERY);
    const s = mobs.get(name);
    if (s) {
      try {
        updateMob(p, s, now);
      } catch (err) {
        console.warn("dream monster tick: " + err);
        removeMob(name);
      }
    }
    if (now >= nextRoll.get(name)) {
      nextRoll.set(name, now + MON_ROLL_EVERY);
      if (!mobs.has(name)) spawnMob(p, phase, now);
    }
  }
}

export function cleanupOrphans() {
  const tracked = new Set();
  for (const s of mobs.values()) {
    try {
      tracked.add(s.entity.id);
    } catch {}
  }
  for (const dimId of [DIM1_ID, DIM2_ID, DIM3_ID, DIM4_ID]) {
    try {
      const dim = world.getDimension(dimId);
      for (const type of [WATCHER_ID, KIL_ID]) {
        for (const e of dim.getEntities({ type })) {
          if (!tracked.has(e.id)) {
            try {
              e.remove();
            } catch {}
          }
        }
      }
    } catch {}
  }
}

export function resetMonsters() {
  for (const name of [...mobs.keys()]) removeMob(name);
  nextRoll.clear();
  kilDone.clear();
  cleanupOrphans();
}
