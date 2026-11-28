import { system, world } from "@minecraft/server";
import {
  HINT_TOWN_TICKS,
  HINT_FIELDS_GRAVE_TICKS,
  HINT_FIELDS_HOUSE_TICKS,
  HINT_HILLS_TICKS,
  HINT_FOUND_RADIUS,
} from "./config.js";
import { valid, currentPhaseOfPlayer } from "./utils.js";
import { nearestTown2, isInTown2Cell } from "./dimen1.js";
import { nearestGrave, getHouse5Pos, forceHouse5, isSteveHeadItemOrBlock } from "./dimen2.js";
import { nearestCorruptedHouse, isInsideCorruptedHouse } from "./dimen3.js";
import { isFieldSequenceActive } from "./story.js";

const states = new Map();

export function resetFieldHeadHint() {
  const now = system.currentTick;
  for (const st of states.values()) {
    if (st.phase === "fields") {
      st.stage = 2;
      st.tStage = now;
      st.done = false;
    }
  }
}

export function resetHints() {
  states.clear();
}

function bar(p, text) {
  try {
    p.onScreenDisplay.setActionBar(text);
  } catch {}
}

function hasHead(p) {
  try {
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (!inv) return false;
    for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (it && isSteveHeadItemOrBlock(it.typeId)) return true;
    }
  } catch {}
  return false;
}

function hintTown(p, st, now, salt) {
  if (isInTown2Cell(p, salt)) {
    st.done = true;
    return;
  }
  if (now - st.t0 < HINT_TOWN_TICKS) return;
  const t = nearestTown2(p.location.x, p.location.z, salt);
  if (t) bar(p, `§5${Math.round(t.d)} block §7- mình có cảm giác phải đi về hướng đó...`);
}

function hintFields(p, st, now, salt) {
  const { x, z } = p.location;
  if (st.stage === 1) {
    const g = nearestGrave(x, z, salt);
    if (g && g.d <= HINT_FOUND_RADIUS) {
      st.stage = 2;
      st.tStage = now;
      p.sendMessage("trên đây dường như thiếu gì đó");
      return;
    }
    if (g && now - st.t0 >= HINT_FIELDS_GRAVE_TICKS) {
      bar(p, `§e${Math.round(g.d)} block §7- hình như có một ngôi mộ gần đây...`);
    }
  } else if (st.stage === 2) {
    if (hasHead(p)) {
      st.stage = 3;
      return;
    }
    if (now - st.tStage < HINT_FIELDS_HOUSE_TICKS) return;
    let pos = getHouse5Pos();
    if (!pos) {
      forceHouse5(p.dimension, p);
      pos = getHouse5Pos();
    }
    if (pos) {
      const d = Math.hypot(pos.x - x, pos.z - z);
      bar(p, `§c${Math.round(d)} block §7- có một căn nhà lạ đang gọi bạn...`);
    }
  } else if (st.stage === 3) {
    if (isFieldSequenceActive(p.name)) {
      st.done = true;
      return;
    }
    const g = nearestGrave(x, z, salt);
    if (g) bar(p, `§e${Math.round(g.d)} block §7- quay lại ngôi mộ...`);
  }
}

function hintHills(p, st, now, salt) {
  if (isInsideCorruptedHouse(p.location)) {
    st.done = true;
    return;
  }
  if (now - st.t0 < HINT_HILLS_TICKS) return;
  const h = nearestCorruptedHouse(p.location.x, p.location.z, salt);
  if (h) bar(p, `§d${Math.round(h.d)} block §7- có gì đó đang chờ bạn...`);
}

export function tickHints(salt) {
  const now = system.currentTick;
  for (const p of world.getAllPlayers()) {
    const phase = valid(p) ? currentPhaseOfPlayer(p) : null;
    if (!phase) {
      states.delete(p.name);
      continue;
    }
    let st = states.get(p.name);
    if (!st || st.phase !== phase) {
      st = { phase, t0: now, stage: 1, tStage: now, done: false };
      states.set(p.name, st);
    }
    if (st.done) continue;
    try {
      if (phase === "town") hintTown(p, st, now, salt);
      else if (phase === "fields") hintFields(p, st, now, salt);
      else if (phase === "hills") hintHills(p, st, now, salt);
    } catch (err) {
      console.warn("dream hint: " + err);
    }
  }
}
