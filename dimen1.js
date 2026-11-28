import { world } from "@minecraft/server";
import {
  CELL_X,
  CELL_Z,
  BASE_Y,
  RARE_ODDS,
  CORRUPTED_TOWN_PERCENT,
  CORRUPTED_TOWN_ID,
  TOWN2_MIN_CELLS,
  TOWN2_MAX_CELLS,
  MUSIC,
} from "./config.js";
import { inTown, mix } from "./utils.js";

const town2Heard = new Map();

export function resetDimen1State() {
  town2Heard.clear();
}

export function town2Cell(salt) {
  const span = TOWN2_MAX_CELLS - TOWN2_MIN_CELLS + 1;
  const dist = TOWN2_MIN_CELLS + (mix(7, 11, salt + 101) % span);
  const side = mix(13, 17, salt + 103) % 4;
  const t = (mix(19, 23, salt + 107) % (2 * dist + 1)) - dist;
  if (side === 0) return { cx: dist, cz: t };
  if (side === 1) return { cx: -dist, cz: t };
  if (side === 2) return { cx: t, cz: dist };
  return { cx: t, cz: -dist };
}

export function pickTownStructure(cx, cz, salt) {
  if (cx === 0 && cz === 0) return "dream:town_1";
  const g = town2Cell(salt);
  if (cx === g.cx && cz === g.cz) return "dream:town_2";
  const roll = mix(cx, cz, salt) % 1000;
  if (roll < CORRUPTED_TOWN_PERCENT * 10) return CORRUPTED_TOWN_ID;
  const far = Math.max(Math.abs(cx), Math.abs(cz)) >= TOWN2_MIN_CELLS;
  if (far && mix(cx, cz, salt + 3) % RARE_ODDS === 0) return "dream:town_2";
  return "dream:town_1";
}

export function placeTownCell(dim, cx, cz, salt) {
  const x0 = cx * CELL_X;
  const z0 = cz * CELL_Z;
  dim.runCommand(`structure load ${pickTownStructure(cx, cz, salt)} ${x0} ${BASE_Y} ${z0}`);
}

export function tickTownAudio(townBuiltSet, salt, onEnterTown2) {
  for (const p of world.getAllPlayers()) {
    if (!inTown(p)) continue;
    const cx = Math.floor(p.location.x / CELL_X);
    const cz = Math.floor(p.location.z / CELL_Z);
    const key = `${cx},${cz}`;
    if (!townBuiltSet.has(key) || pickTownStructure(cx, cz, salt) !== "dream:town_2") continue;
    let heard = town2Heard.get(p.name);
    if (!heard) {
      heard = new Set();
      town2Heard.set(p.name, heard);
    }
    if (heard.has(key)) continue;
    heard.add(key);
    try {
      p.playMusic(MUSIC[Math.floor(Math.random() * MUSIC.length)], {
        volume: 1,
        fade: 0,
        loop: false,
      });
    } catch (err) {
      console.warn("dream town2 music: " + err);
    }
    try {
      onEnterTown2?.(p);
    } catch (err) {
      console.warn("dream town2 enter: " + err);
    }
  }
}

export function nearestTown2(px, pz, salt, radius = 10) {
  const pcx = Math.floor(px / CELL_X);
  const pcz = Math.floor(pz / CELL_Z);
  let best = null;
  const consider = (cx, cz) => {
    const x = (cx + 0.5) * CELL_X;
    const z = (cz + 0.5) * CELL_Z;
    const dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.d) best = { cx, cz, x, z, d: dist };
  };
  const g = town2Cell(salt);
  consider(g.cx, g.cz);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (pickTownStructure(pcx + dx, pcz + dz, salt) === "dream:town_2") consider(pcx + dx, pcz + dz);
    }
  }
  return best;
}

export function isInTown2Cell(p, salt) {
  const cx = Math.floor(p.location.x / CELL_X);
  const cz = Math.floor(p.location.z / CELL_Z);
  return pickTownStructure(cx, cz, salt) === "dream:town_2";
}
