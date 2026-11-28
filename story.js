import { system } from "@minecraft/server";
import { DIM4_DURATION_TICKS } from "./config.js";
import { valid, findPlayer, inTown, inFields, inHills, inSea } from "./utils.js";
import { isInsideCorruptedHouse } from "./dimen3.js";

const storyProgress = new Map();
const townIntroTimers = new Map();
const town2Timers = new Map();
const townReadyToAdvance = new Set();
const fieldIntroTimers = new Map();
const fieldAdvanceTimers = new Map();
const fieldReadyToAdvance = new Set();
const hillsIntroTimers = new Map();
const corruptedHouseTimers = new Map();
const corruptedTriggeredPlayers = new Set();
const fallingToDim4Players = new Set();
export const hillsDoneReadyToAdvance = new Set();
const seaEndTimers = new Map();

export function getStoryState(playerName) {
  if (!storyProgress.has(playerName)) {
    storyProgress.set(playerName, {
      cluesFound: 0,
      solvedPuzzles: new Set(),
      chapter: 1,
    });
  }
  return storyProgress.get(playerName);
}

function clearHandleList(map, key) {
  const handles = map.get(key);
  if (!handles) return;
  for (const h of handles) {
    try {
      system.clearRun(h);
    } catch {}
  }
  map.delete(key);
}

export function clearTownIntro(playerName) {
  clearHandleList(townIntroTimers, playerName);
}

export function clearTown2Sequence(playerName) {
  clearHandleList(town2Timers, playerName);
  townReadyToAdvance.delete(playerName);
}

export function clearFieldSequence(playerName) {
  clearHandleList(fieldIntroTimers, playerName);
  clearHandleList(fieldAdvanceTimers, playerName);
  fieldReadyToAdvance.delete(playerName);
}

export function clearHillsSequence(playerName) {
  clearHandleList(hillsIntroTimers, playerName);
  clearHandleList(corruptedHouseTimers, playerName);
  corruptedTriggeredPlayers.delete(playerName);
  fallingToDim4Players.delete(playerName);
  hillsDoneReadyToAdvance.delete(playerName);
}

export function clearSeaSequence(playerName) {
  clearHandleList(seaEndTimers, playerName);
}

export function clearAllStoryTimers(playerName) {
  clearTownIntro(playerName);
  clearTown2Sequence(playerName);
  clearFieldSequence(playerName);
  clearHillsSequence(playerName);
  clearSeaSequence(playerName);
}

export function isFallingToDim4(playerName) {
  return fallingToDim4Players.has(playerName);
}

export function markHillsDropLanded(playerName) {
  fallingToDim4Players.delete(playerName);
  hillsDoneReadyToAdvance.add(playerName);
}

export function triggerTown2Entered(player) {
  const name = player.name;
  if (!inTown(player) || town2Timers.has(name) || townReadyToAdvance.has(name)) return;
  clearTownIntro(name);
  const say = (msg) => {
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inTown(pl)) {
        clearTown2Sequence(name);
        return;
      }
      pl.sendMessage(msg);
    } catch {}
  };
  say("...chỗ này khác hẳn những nơi khác");
  const h1 = system.runTimeout(() => say("sao tự nhiên lạnh thế này"), 60);
  const h2 = system.runTimeout(() => say("tôi phải đi khỏi đây..."), 160);
  const h3 = system.runTimeout(() => {
    town2Timers.delete(name);
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inTown(pl)) return;
      townReadyToAdvance.add(name);
    } catch {}
  }, 260);
  town2Timers.set(name, [h1, h2, h3]);
}

export function triggerTownIntro(player) {
  clearTownIntro(player.name);
  clearTown2Sequence(player.name);
  const name = player.name;
  const say = (msg) => {
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inTown(pl)) {
        clearTownIntro(name);
        return;
      }
      pl.sendMessage(msg);
    } catch {}
  };
  say("ụa đầu tôi nhức quá");
  const h1 = system.runTimeout(() => {
    say("mà đây là đâu?");
  }, 100);
  const h2 = system.runTimeout(() => {
    say(" có thứ gì đó khác thường ở đây");
    clearTownIntro(name);
  }, 500);
  townIntroTimers.set(name, [h1, h2]);
}

export function triggerFieldIntro(player) {
  clearFieldSequence(player.name);
  const name = player.name;
  const h = system.runTimeout(() => {
    fieldIntroTimers.delete(name);
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inFields(pl)) return;
      pl.sendMessage("lại đâu nữa đây?");
    } catch {}
  }, 60);
  fieldIntroTimers.set(name, [h]);
}

export function triggerCoarseDirtSkullPlaced(player, onTeleportToDim3) {
  const name = player.name;
  const plNow = findPlayer(name);
  if (!plNow || !valid(plNow) || !inFields(plNow)) return;
  if (fieldAdvanceTimers.has(name) || fieldReadyToAdvance.has(name)) return;
  getStoryState(name).solvedPuzzles.add("dimen2_coarse_dirt_steve_head");
  const sayIfStillHere = (msg) => {
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inFields(pl)) {
        clearFieldSequence(name);
        return false;
      }
      pl.sendMessage(msg);
      return true;
    } catch {
      return false;
    }
  };
  if (!sayIfStillHere("...")) return;
  const hLine2 = system.runTimeout(() => {
    if (!sayIfStillHere("là do cậu ấy sai trước mà")) return;
    const hTele = system.runTimeout(() => {
      fieldAdvanceTimers.delete(name);
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inFields(pl)) return;
      fieldReadyToAdvance.add(name);
      try {
        onTeleportToDim3?.(pl);
      } catch {}
    }, 200);
    fieldAdvanceTimers.set(name, [hLine2, hTele]);
  }, 40);
  fieldAdvanceTimers.set(name, [hLine2]);
}

export function triggerHillsIntro(player) {
  clearHillsSequence(player.name);
  const name = player.name;
  const h = system.runTimeout(() => {
    hillsIntroTimers.delete(name);
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inHills(pl)) return;
      pl.sendMessage("thật là 1 nơi kì lạ");
    } catch {}
  }, 60);
  hillsIntroTimers.set(name, [h]);
}

export function triggerCorruptedPinkHouseEntered(player) {
  const name = player.name;
  const plNow = findPlayer(name);
  if (!plNow || !valid(plNow) || !inHills(plNow)) return;
  if (corruptedTriggeredPlayers.has(name) || corruptedHouseTimers.has(name) || fallingToDim4Players.has(name)) {
    return;
  }
  corruptedTriggeredPlayers.add(name);
  try {
    plNow.sendMessage("§dĐầu bạn bỗng đau nhức dữ dội, mọi thứ trước mắt quay cuồng chóng mặt...");
    plNow.addEffect("nausea", 240, { amplifier: 1, showParticles: false });
    plNow.addEffect("blindness", 120, { amplifier: 0, showParticles: false });
  } catch {}
  const hDrop = system.runTimeout(() => {
    corruptedHouseTimers.delete(name);
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inHills(pl)) {
        corruptedTriggeredPlayers.delete(name);
        return;
      }
      const loc = pl.location;
      fallingToDim4Players.add(name);
      try {
        pl.addEffect("resistance", 600, { amplifier: 4, showParticles: false });
      } catch {}
      pl.teleport({ x: loc.x, y: 200, z: loc.z }, { dimension: pl.dimension });
    } catch {
      fallingToDim4Players.delete(name);
    }
  }, 200);
  corruptedHouseTimers.set(name, [hDrop]);
}

export function triggerSeaSequence(player, onSendBack) {
  clearSeaSequence(player.name);
  const name = player.name;
  const hNausea = system.runTimeout(() => {
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inSea(pl)) return;
      pl.addEffect("nausea", 160, { amplifier: 1, showParticles: false });
      pl.sendMessage("§7Cơn buồn nôn ập đến...");
    } catch {}
  }, DIM4_DURATION_TICKS);
  const hWake = system.runTimeout(() => {
    seaEndTimers.delete(name);
    try {
      const pl = findPlayer(name);
      if (!pl || !valid(pl) || !inSea(pl)) return;
      onSendBack?.(pl);
    } catch {}
  }, DIM4_DURATION_TICKS + 40);
  seaEndTimers.set(name, [hNausea, hWake]);
}

export function onPlayerEnteredPhase(player, phase, onSendBack) {
  if (phase === "town") {
    clearFieldSequence(player.name);
    clearHillsSequence(player.name);
    clearSeaSequence(player.name);
    triggerTownIntro(player);
  } else if (phase === "fields") {
    clearTownIntro(player.name);
    clearTown2Sequence(player.name);
    clearHillsSequence(player.name);
    clearSeaSequence(player.name);
    triggerFieldIntro(player);
  } else if (phase === "hills") {
    clearTownIntro(player.name);
    clearTown2Sequence(player.name);
    clearFieldSequence(player.name);
    clearSeaSequence(player.name);
    triggerHillsIntro(player);
  } else if (phase === "sea") {
    clearTownIntro(player.name);
    clearTown2Sequence(player.name);
    clearFieldSequence(player.name);
    clearHillsSequence(player.name);
    triggerSeaSequence(player, onSendBack);
  } else {
    clearAllStoryTimers(player.name);
  }
}

export function canAdvanceFromTown(player) {
  return townReadyToAdvance.has(player.name);
}

export function canAdvanceFromFields(player) {
  return fieldReadyToAdvance.has(player.name);
}

export function canAdvanceFromHills(player) {
  return hillsDoneReadyToAdvance.has(player.name);
}

export function canAdvanceFromSea(_player) {
  return false;
}

export function isFieldSequenceActive(playerName) {
  return fieldAdvanceTimers.has(playerName) || fieldReadyToAdvance.has(playerName);
}


export function clearEveryStoryState() {
  for (const m of [
    townIntroTimers,
    town2Timers,
    fieldIntroTimers,
    fieldAdvanceTimers,
    hillsIntroTimers,
    corruptedHouseTimers,
    seaEndTimers,
  ]) {
    for (const handles of m.values()) {
      for (const h of handles) {
        try {
          system.clearRun(h);
        } catch {}
      }
    }
    m.clear();
  }
  townReadyToAdvance.clear();
  fieldReadyToAdvance.clear();
  corruptedTriggeredPlayers.clear();
  fallingToDim4Players.clear();
  hillsDoneReadyToAdvance.clear();
  storyProgress.clear();
}
