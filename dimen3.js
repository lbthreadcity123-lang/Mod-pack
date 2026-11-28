import { world } from "@minecraft/server";
import {
  DIM3_ID,
  HILLS_TILE,
  HILLS_GROUND_Y,
  HOUSE3_GRID,
  HOUSE3_SIZE,
  HOUSE3_TYPES,
  HOUSE3_MIN_HEIGHT,
  HOUSE3_MAX_HEIGHT,
  PINKHOUSE_CHANCE,
  CORRUPTED_HOUSE_ID,
  CORRUPTED_HOUSE_CHANCE,
  HILLS_TREE_MAX,
} from "./config.js";
import { inHills, getPlayerLoadRange, mix, randomHouseRotation } from "./utils.js";

export const housesDone = new Set();
export const corruptedHouses = [];

export function resetDimen3State() {
  housesDone.clear();
  corruptedHouses.length = 0;
}

export function placeHillsPlane(dim, tx, tz, salt = 0) {
  const x0 = tx * HILLS_TILE;
  const z0 = tz * HILLS_TILE;
  const x1 = x0 + HILLS_TILE - 1;
  const z1 = z0 + HILLS_TILE - 1;
  dim.runCommand(`fill ${x0} ${HILLS_GROUND_Y} ${z0} ${x1} ${HILLS_GROUND_Y} ${z1} grass_block`);
  const n = mix(tx, tz, salt + 201) % (HILLS_TREE_MAX + 1);
  for (let i = 0; i < n; i++) {
    const x = x0 + 4 + (mix(tx, tz, salt + 211 + i) % (HILLS_TILE - 12));
    const z = z0 + 4 + (mix(tx, tz, salt + 223 + i) % (HILLS_TILE - 12));
    if (tx === 0 && tz === 0 && Math.hypot(x - 15, z - 15) < 14) continue;
    dim.runCommand(`structure load dream:tree ${x} ${HILLS_GROUND_Y} ${z} 0_degrees`);
  }
}

function houseSite(hx, hz, salt) {
  const r = mix(hx, hz, salt + 51);
  const spawnRoll = (r % 1000) / 1000;
  const corruptedRoll = ((r >>> 6) % 1000) / 1000;
  const spanHeights = HOUSE3_MAX_HEIGHT - HOUSE3_MIN_HEIGHT + 1;
  const heightOffset = HOUSE3_MIN_HEIGHT + ((r >>> 10) % spanHeights);
  const half = (HOUSE3_GRID >> 1) - (HOUSE3_SIZE >> 1);
  const isCorrupted = !(hx === 0 && hz === 0) && corruptedRoll < CORRUPTED_HOUSE_CHANCE;
  return {
    spawn: !(hx === 0 && hz === 0) && (isCorrupted || spawnRoll < PINKHOUSE_CHANCE),
    isCorrupted,
    ox: hx * HOUSE3_GRID + half,
    oz: hz * HOUSE3_GRID + half,
    y: HILLS_GROUND_Y + heightOffset,
    type: ((r >>> 18) % HOUSE3_TYPES) + 1,
  };
}

function placePinkHouse(dim, s, hillsBuiltSet, key) {
  if (!s.spawn) return true;
  const x0 = s.ox - 1;
  const z0 = s.oz - 1;
  const x1 = s.ox + HOUSE3_SIZE;
  const z1 = s.oz + HOUSE3_SIZE;
  for (let tx = Math.floor(x0 / HILLS_TILE); tx <= Math.floor(x1 / HILLS_TILE); tx++) {
    for (let tz = Math.floor(z0 / HILLS_TILE); tz <= Math.floor(z1 / HILLS_TILE); tz++) {
      if (!hillsBuiltSet.has(`${tx},${tz}`)) return false;
    }
  }
  dim.runCommand(`fill ${x0} ${s.y} ${z0} ${x1} ${s.y + 14} ${z1} air`);
  const houseRot = randomHouseRotation();
  const structId = s.isCorrupted ? CORRUPTED_HOUSE_ID : `dream:pinkhouse_${s.type}`;
  dim.runCommand(`structure load ${structId} ${s.ox} ${s.y} ${s.oz} ${houseRot}`);
  if (s.isCorrupted) {
    corruptedHouses.push({
      key,
      minX: s.ox,
      maxX: s.ox + HOUSE3_SIZE,
      minY: s.y - 1,
      maxY: s.y + 12,
      minZ: s.oz,
      maxZ: s.oz + HOUSE3_SIZE,
    });
  }
  return true;
}

export function tickHillsHouses(hillsBuiltSet, salt) {
  const players = world.getAllPlayers().filter(inHills);
  if (players.length === 0) return;
  const dim = world.getDimension(DIM3_ID);
  for (const p of players) {
    const range = getPlayerLoadRange(p);
    const gx = Math.floor(p.location.x / HOUSE3_GRID);
    const gz = Math.floor(p.location.z / HOUSE3_GRID);
    const r = Math.ceil(range / HOUSE3_GRID) + 1;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const key = `${gx + dx},${gz + dz}`;
        if (housesDone.has(key)) continue;
        const s = houseSite(gx + dx, gz + dz, salt);
        const centerX = s.ox + (HOUSE3_SIZE >> 1);
        const centerZ = s.oz + (HOUSE3_SIZE >> 1);
        const d = Math.hypot(centerX - p.location.x, centerZ - p.location.z);
        if (d > range) continue;
        try {
          if (placePinkHouse(dim, s, hillsBuiltSet, key)) {
            housesDone.add(key);
          }
        } catch {}
      }
    }
  }
}

export function isInsideCorruptedHouse(loc) {
  if (!loc) return false;
  for (const h of corruptedHouses) {
    if (
      loc.x >= h.minX &&
      loc.x <= h.maxX &&
      loc.y >= h.minY &&
      loc.y <= h.maxY &&
      loc.z >= h.minZ &&
      loc.z <= h.maxZ
    ) {
      return true;
    }
  }
  return false;
}

export function nearestCorruptedHouse(px, pz, salt, radius = 10) {
  const gx = Math.floor(px / HOUSE3_GRID);
  const gz = Math.floor(pz / HOUSE3_GRID);
  let best = null;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const s = houseSite(gx + dx, gz + dz, salt);
      if (!s.isCorrupted) continue;
      const x = s.ox + (HOUSE3_SIZE >> 1);
      const z = s.oz + (HOUSE3_SIZE >> 1);
      const dist = Math.hypot(x - px, z - pz);
      if (!best || dist < best.d) best = { x, z, d: dist };
    }
  }
  return best;
}
