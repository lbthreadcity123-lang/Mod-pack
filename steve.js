import { world, system } from "@minecraft/server";
import { DIM2_ID, GROUND_Y } from "./config.js";
import { valid, currentPhaseOfPlayer } from "./utils.js";

export function isHeadId(id) {
  return typeof id === "string" && /head|skull/i.test(id);
}

let home = null;
let holder = null;
let lostAt = null;
let solved = false;
let pendingReturn = false;
let hooks = { sequenceActive: () => false, onReturned: () => {} };

export function configureHead(h) {
  hooks = { ...hooks, ...h };
}

export function resetHead() {
  home = null;
  holder = null;
  lostAt = null;
  solved = false;
  pendingReturn = false;
}

export function registerHeadHome(dim, ox, oz) {
  for (let x = ox - 6; x <= ox + 10; x++) {
    for (let z = oz - 6; z <= oz + 10; z++) {
      for (let y = GROUND_Y; y <= GROUND_Y + 8; y++) {
        try {
          const b = dim.getBlock({ x, y, z });
          if (b && isHeadId(b.typeId)) {
            home = { x, y, z, perm: b.permutation };
            holder = null;
            lostAt = null;
            solved = false;
            pendingReturn = false;
            return;
          }
        } catch {}
      }
    }
  }
}

export function hasHead(p) {
  try {
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (!inv) return false;
    for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (it && isHeadId(it.typeId)) return true;
    }
  } catch {}
  return false;
}

function stripHead(p) {
  try {
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (it && isHeadId(it.typeId)) inv.setItem(i, undefined);
    }
  } catch {}
}

function headItems(dim) {
  const out = [];
  try {
    for (const e of dim.getEntities({ type: "minecraft:item" })) {
      if (isHeadId(e.getComponent("minecraft:item")?.itemStack?.typeId)) out.push(e);
    }
  } catch {}
  return out;
}

function tryReturn() {
  const dim = world.getDimension(DIM2_ID);
  for (const e of headItems(dim)) {
    try {
      e.remove();
    } catch {}
  }
  for (const p of world.getAllPlayers()) {
    if (valid(p)) stripHead(p);
  }
  try {
    const b = dim.getBlock(home);
    if (!b) return false;
    b.setPermutation(home.perm);
  } catch {
    return false;
  }
  hooks.onReturned();
  return true;
}

function requestReturn() {
  holder = null;
  lostAt = null;
  pendingReturn = !tryReturn();
}

export function tickHead() {
  if (!home || solved) return;
  const now = system.currentTick;
  if (pendingReturn) {
    pendingReturn = !tryReturn();
    return;
  }
  const carrier = world.getAllPlayers().find((p) => valid(p) && hasHead(p));
  if (carrier) {
    lostAt = null;
    if (currentPhaseOfPlayer(carrier) !== "fields") {
      requestReturn();
      return;
    }
    holder = carrier.name;
    return;
  }
  if (holder) {
    if (lostAt === null) lostAt = now;
    if (hooks.sequenceActive(holder)) {
      solved = true;
      holder = null;
      lostAt = null;
      return;
    }
    if (now - lostAt >= 40) requestReturn();
    return;
  }
  try {
    const dim = world.getDimension(DIM2_ID);
    const b = dim.getBlock(home);
    if (b && !isHeadId(b.typeId) && headItems(dim).length === 0) requestReturn();
  } catch {}
}

export function headOnDeath(p) {
  if (!home || solved) return;
  let near = false;
  try {
    if (p.dimension.id === DIM2_ID) {
      const l = p.location;
      near = headItems(p.dimension).some((e) => Math.hypot(e.location.x - l.x, e.location.z - l.z) < 8);
    }
  } catch {}
  if (holder === p.name || near) requestReturn();
}
