export const DIM1_ID = "dream:town";
export const DIM2_ID = "dream:world2";
export const DIM3_ID = "dream:world3";
export const DIM4_ID = "dream:world4";
export const OVERWORLD = "minecraft:overworld";

export const LOAD_CHUNKS = 8;
export const MIN_LOAD_RANGE = 112;
export const LOAD_INTERVAL = 1;

export const TOWN_PRELOAD_RADIUS = 2;
export const FIELD_PRELOAD_RADIUS = 2;
export const HILLS_PRELOAD_RADIUS = 2;
export const SEA_PRELOAD_RADIUS = 2;

export const CELL_X = 45;
export const CELL_Z = 50;
export const CELL_H = 30;
export const BASE_Y = 60;
export const PLACE_PER_RUN = 4;
export const CHECK_PER_RUN = 32;
export const RARE_ODDS = 200;
export const CORRUPTED_TOWN_PERCENT = 35;
export const TOWN2_MIN_CELLS = 5;
export const TOWN2_MAX_CELLS = 8;
export const CORRUPTED_TOWN_ID = "dream:dream_corrupted_town";
export const SPAWN = { x: 22, y: BASE_Y + 12, z: 25 };

export const FIELD_CELL = 50;
export const GROUND_Y = 64;
export const TREE_SIZE = 5;
export const FIELD_SPAWN = { x: 31, y: GROUND_Y + 1, z: 25 };
export const FIELD_PLACE_PER_RUN = 12;
export const FIELD_HOUSE_PERCENT = 35;
export const FIELD_EXTRA_STRUCT_PERCENT = 15;
export const FIELD_EXTRA_STRUCT_ID = "dream:dream_structure_1";
export const TREE_Z_SPACING = 30;
export const GRAVE_STRUCTURE_ID = "dream:dream_gravel";
export const GRAVE_SPAWN_PERCENT = 20;
export const HOUSE5_STRUCTURE_ID = "dream:dream_house_5";
export const HOUSE5_SPAWN_RADIUS = 55;
export const HOUSE5_SPAWN_CHANCE = 0.08;

export const HILLS_TILE = 60;
export const HILLS_GROUND_Y = 64;
export const HILLS_SPAWN = { x: 15, y: HILLS_GROUND_Y + 2, z: 15 };
export const HILLS_PLACE_PER_RUN = 5;
export const HOUSE3_GRID = 20;
export const HOUSE3_SIZE = 10;
export const HOUSE3_TYPES = 3;
export const HOUSE3_MIN_HEIGHT = 1;
export const HOUSE3_MAX_HEIGHT = 30;
export const PINKHOUSE_CHANCE = 0.9;
export const CORRUPTED_HOUSE_ID = "dream:dream_corruptedpinkhouse";
export const CORRUPTED_HOUSE_CHANCE = 0.04;
export const FALL_WAKE_Y = HILLS_GROUND_Y + 2;

export const SEA_TILE = 64;
export const SEA_STONE_Y = -1;
export const SEA_WATER_Y = 0;
export const SEA_SPAWN = { x: 8, y: SEA_WATER_Y + 2, z: 8 };
export const SEA_PLACE_PER_RUN = 5;
export const SEA_LAMP_CHANCE = 0.22;
export const LAMP_STRUCTURE_ID = "dream:dream_lamp";
export const STONEHOUSE_ROW_STEP = 18;
export const STONEHOUSE_ROW_Z = 28;
export const STONEHOUSE_TYPES = 3;
export const DIM4_DURATION_TICKS = 2400;

export const RETURN_STAGGER = 60;
export const SLEEP_NEEDED = 60;
export const SLEEP_CHECK = 10;
export const NIGHT_FROM = 12542;
export const NIGHT_TO = 23459;
export const ALLOW_ENTER_COMMAND = true;

export const ROLL_EVERY = 200;
export const ROLL_CHANCE = 0.30;
export const FOOTSTEP_VS_MUSIC = 0.5;
export const STALKER_TICKS = 300;
export const STEP = 5;
export const FOLLOW_DISTANCE = 6;
export const FOOTSTEP_CLIPS = 15;
export const MUSIC = [
  "dream.music.wrong_place",
  "dream.music.spooky",
  "dream.music.drone",
  "dream.music.lurking",
  "dream.music.flesh",
  "dream.music.cave_mc",
  "dream.music.scary_cave",
  "dream.music.silly_loop",
  "dream.music.ghostly",
];

export const RESCUE_DROP = 2;
export const VOID_TRIGGER_Y = -60;
export const DREAM_TIMES = Object.freeze({
  town: 14000,
  fields: 1000,
  hills: 13000,
  sea: 15000,
});

export const HINT_TOWN_TICKS = 2400;
export const HINT_FIELDS_GRAVE_TICKS = 2400;
export const HINT_FIELDS_HOUSE_TICKS = 2400;
export const HINT_HILLS_TICKS = 3600;
export const HINT_FOUND_RADIUS = 10;


// ---- Quái ngẫu nhiên: The Watcher & The Kil (chỉ spawn trong các dimen) ----
export const MON_ROLL_EVERY = 600;          // 30 giây / lần quay
export const MON_KIL_CHANCE = 0.10;         // tỉ lệ The Kil (chỉ 1 lần mỗi lần vào giấc mơ)
export const MON_WATCHER_HUNT_CHANCE = 0.20; // Watcher trường hợp 2 (lao vào đấm)
export const MON_WATCHER_CALM_CHANCE = 0.30; // Watcher trường hợp 1 (chỉ đứng nhìn)

export const WATCHER_DIST = 30;     // spawn cách người chơi
export const WATCHER_NEAR = 15;     // lại gần hơn mức này thì kích hoạt
export const WATCHER_FAR = 60;      // đi xa hơn mức này thì biến mất
export const WATCHER_LIFE = 400;    // 20 giây
export const WATCHER_RUN_SPEED = 9; // block/giây khi lao vào
export const WATCHER_HIT_DAMAGE = 1;

export const KIL_DIST = 20;
export const KIL_LIFE = 400;        // 20 giây
export const KIL_SPEED = 5.6;       // block/giây (bằng người chơi chạy nhanh)
export const KIL_DAMAGE = 6;        // 3 tim

export const HILLS_TREE_MAX = 3;
