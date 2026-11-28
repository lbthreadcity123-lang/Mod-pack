import { world, system } from "@minecraft/server";
import {
  DIM1_ID,
  DIM2_ID,
  DIM3_ID,
  DIM4_ID,
  LOAD_CHUNKS,
  MIN_LOAD_RANGE,
} from "./config.js";

export function valid(obj) {
  try {
    if (obj === undefined || obj === null) return false;
    const v = obj.isValid;
    return typeof v === "function" ? !!v.call(obj) : !!v;
  } catch {
    return false;
  }
}

export function findPlayer(name) {
  return world.getAllPlayers().find((p) => p.name === name);
}

export function dimIs(p, id) {
  try {
    return p.dimension.id === id;
  } catch {
    return false;
  }
}

export const inTown = (p) => dimIs(p, DIM1_ID);
export const inFields = (p) => dimIs(p, DIM2_ID);
export const inHills = (p) => dimIs(p, DIM3_ID);
export const inSea = (p) => dimIs(p, DIM4_ID);
export const inAnyDream = (p) => inTown(p) || inFields(p) || inHills(p) || inSea(p);

export function currentPhaseOfPlayer(p) {
  if (inTown(p)) return "town";
  if (inFields(p)) return "fields";
  if (inHills(p)) return "hills";
  if (inSea(p)) return "sea";
  return null;
}

export function getPlayerLoadRange(_p) {
  return Math.max(MIN_LOAD_RANGE, LOAD_CHUNKS * 16);
}

export function behindPlayer(player, dist) {
  const loc = player.location;
  const v = player.getViewDirection();
  let hx = -v.x;
  let hz = -v.z;
  const len = Math.hypot(hx, hz);
  if (len < 0.01) {
    hx = 0;
    hz = -1;
  } else {
    hx /= len;
    hz /= len;
  }
  return { x: loc.x + hx * dist, y: loc.y, z: loc.z + hz * dist };
}

export function withTimeout(promise, ticks) {
  return new Promise((resolve, reject) => {
    const h = system.runTimeout(() => reject(new Error("quá thời gian chờ")), ticks);
    promise.then(
      (v) => {
        system.clearRun(h);
        resolve(v);
      },
      (e) => {
        system.clearRun(h);
        reject(e);
      }
    );
  });
}

export function safe(label, fn) {
  try {
    fn();
  } catch (err) {
    console.warn(`dream: bỏ qua "${label}" vì lỗi: ${err}`);
  }
}

export function randomHouseRotation() {
  return `${Math.floor(Math.random() * 4) * 90}_degrees`;
}

export function newSalt() {
  return (Math.random() * 0x7fffffff) | 0;
}

export function mix(x, z, k) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(k | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}