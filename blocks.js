import { world, system, ItemStack } from "@minecraft/server";
import { valid } from "./utils.js";
import { isHeadId } from "./steve.js";

const LIFE = 400;
const DROP_BROKEN = false;
const DEPENDENT = [
  "torch", "lantern", "vine", "ladder", "sign", "button", "lever", "carpet", "rail",
  "plate", "door", "banner", "candle", "flower", "sapling", "tallgrass", "short_grass", "fern",
];
const NEI = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];

const restoreQ = [];
const placed = new Map();
const pendingItem = new Map();

const keyOf = (dimId, x, y, z) => `${dimId}|${x},${y},${z}`;
const jitter = () => Math.floor(Math.random() * 100);

function isCreative(p) {
  try {
    return String(p.getGameMode()).toLowerCase() === "creative";
  } catch {
    return false;
  }
}

function puff(dim, x, y, z) {
  try {
    dim.spawnParticle("minecraft:basic_smoke_particle", { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
  } catch {}
}

function removeDrops(dim, loc) {
  try {
    for (const e of dim.getEntities({
      type: "minecraft:item",
      location: { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 },
      maxDistance: 3,
    })) {
      const it = e.getComponent("minecraft:item")?.itemStack;
      if (it && isHeadId(it.typeId)) continue;
      e.remove();
    }
  } catch {}
}

function giveBack(e) {
  const p = world.getAllPlayers().find((pl) => pl.name === e.owner);
  if (!p || !valid(p) || isCreative(p)) return;
  try {
    const inv = p.getComponent("minecraft:inventory")?.container;
    const left = inv.addItem(new ItemStack(e.item, 1));
    if (left) p.dimension.spawnItem(left, p.location);
  } catch {}
}

export function onBeforePlace(ev) {
  try {
    const held = ev.player
      .getComponent("minecraft:inventory")
      ?.container?.getItem(ev.player.selectedSlotIndex);
    pendingItem.set(ev.player.name, held?.typeId);
  } catch {}
}

export function onAfterPlace(ev) {
  const held = pendingItem.get(ev.player.name);
  pendingItem.delete(ev.player.name);
  const b = ev.block;
  const typeId = b.typeId;
  if (isHeadId(typeId) || isHeadId(held) || typeId.includes("bed")) return;
  const { x, y, z } = b.location;
  placed.set(keyOf(b.dimension.id, x, y, z), {
    dimId: b.dimension.id,
    x, y, z,
    typeId,
    item: held ?? typeId,
    owner: ev.player.name,
    due: system.currentTick + LIFE + jitter(),
  });
}

export function onBeforeBreak(ev) {
  const b = ev.block;
  if (isHeadId(b.typeId)) return;
  const dim = b.dimension;
  const { x, y, z } = b.location;
  const mine = placed.get(keyOf(dim.id, x, y, z));
  if (mine) {
    placed.delete(keyOf(dim.id, x, y, z));
    system.run(() => giveBack(mine));
    return;
  }
  const entry = {
    dimId: dim.id, x, y, z,
    perm: b.permutation,
    due: system.currentTick + LIFE + jitter(),
    extra: [],
  };
  for (const [dx, dy, dz] of NEI) {
    try {
      const nb = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
      if (!nb || nb.typeId === "minecraft:air") continue;
      if (!DEPENDENT.some((w) => nb.typeId.includes(w))) continue;
      if (placed.has(keyOf(dim.id, x + dx, y + dy, z + dz))) continue;
      entry.extra.push({ x: x + dx, y: y + dy, z: z + dz, perm: nb.permutation });
    } catch {}
  }
  restoreQ.push(entry);
}

export function onAfterBreak(ev) {
  if (DROP_BROKEN) return;
  const dim = ev.block.dimension;
  const loc = ev.block.location;
  system.runTimeout(() => removeDrops(dim, loc), 2);
}

function playerInside(dimId, r) {
  for (const p of world.getAllPlayers()) {
    try {
      if (p.dimension.id !== dimId) continue;
      const l = p.location;
      if (
        Math.abs(l.x - (r.x + 0.5)) < 0.8 &&
        Math.abs(l.z - (r.z + 0.5)) < 0.8 &&
        l.y > r.y - 1.8 &&
        l.y < r.y + 1
      ) {
        return true;
      }
    } catch {}
  }
  return false;
}

function step() {
  const now = system.currentTick;
  for (const [k, e] of placed) {
    if (now < e.due) continue;
    try {
      const dim = world.getDimension(e.dimId);
      const b = dim.getBlock({ x: e.x, y: e.y, z: e.z });
      if (!b) continue;
      if (b.typeId === e.typeId) {
        puff(dim, e.x, e.y, e.z);
        b.setType("minecraft:air");
        system.runTimeout(() => removeDrops(dim, { x: e.x, y: e.y, z: e.z }), 2);
      }
      placed.delete(k);
      giveBack(e);
    } catch {}
  }
  for (let i = restoreQ.length - 1; i >= 0; i--) {
    const r = restoreQ[i];
    if (now < r.due) continue;
    try {
      const dim = world.getDimension(r.dimId);
      const b = dim.getBlock({ x: r.x, y: r.y, z: r.z });
      if (!b) continue;
      if (playerInside(r.dimId, r)) {
        r.due = now + 20;
        continue;
      }
      const k = keyOf(r.dimId, r.x, r.y, r.z);
      const mine = placed.get(k);
      if (mine) {
        placed.delete(k);
        giveBack(mine);
      }
      b.setPermutation(r.perm);
      for (const ex of r.extra) {
        const eb = dim.getBlock(ex);
        if (eb && eb.typeId === "minecraft:air") eb.setPermutation(ex.perm);
      }
      puff(dim, r.x, r.y, r.z);
      restoreQ.splice(i, 1);
    } catch {}
  }
}

export function tickBlocks() {
  step();
}

export function flushAll() {
  for (const e of placed.values()) e.due = 0;
  for (const r of restoreQ) r.due = 0;
  step();
}

export function clearBlocks() {
  placed.clear();
  restoreQ.length = 0;
  pendingItem.clear();
}
