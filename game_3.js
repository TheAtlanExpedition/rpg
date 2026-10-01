"use strict";
{
  const canvas = document.getElementById("gameCanvas3");
  const context = canvas.getContext("2d");

  const TILE_SIZE = 32;
  const MAP_WIDTH = 40;
  const MAP_HEIGHT = 40;

  const VIEW_TILES_X = 8;
  const VIEW_TILES_Y = 8;

  const DISPLAY_WIDTH = VIEW_TILES_X * TILE_SIZE;
  const DISPLAY_HEIGHT = VIEW_TILES_Y * TILE_SIZE;

  const devicePixelRatioValue = Math.max(
    1,
    Math.floor(window.devicePixelRatio || 1)
  );
  const CANVAS_SCALE = 1;
  const INV_SPACE = 768;                        // the inventory is designed on a 768x768 grid
  const INV_SCALE = DISPLAY_WIDTH / INV_SPACE;  // maps that grid onto the canvas

  canvas.style.width = `${DISPLAY_WIDTH * CANVAS_SCALE}px`;
  canvas.style.height = `${DISPLAY_HEIGHT * CANVAS_SCALE}px`;
  canvas.style.imageRendering = "pixelated";
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.flex = "none";

  canvas.width = DISPLAY_WIDTH * devicePixelRatioValue;
  canvas.height = DISPLAY_HEIGHT * devicePixelRatioValue;

  context.setTransform(
    devicePixelRatioValue,
    0,
    0,
    devicePixelRatioValue,
    0,
    0
  );

  context.imageSmoothingEnabled = false;

  const PLAYER_WIDTH = 32;
  const PLAYER_HEIGHT = 32;

  let zoom = 1;

  const TileType = {
    WALL: 0,
    FLOOR: 1,
    DOOR: 2,
    TRAP: 3,
    SWITCH: 4,
    PILLAR: 5,
  };
  function isSolidTile(t) {
  return t === TileType.WALL || t === TileType.PILLAR;
}

  let gameLoopId = null;

  const PLAYER_SPRITE = new Image();
  PLAYER_SPRITE.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/player-idle-walk-0.1.png";

  const PLAYER_SNEAK_SPRITE = new Image();
  PLAYER_SNEAK_SPRITE.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/player-sneak-0.1.png"; // 8 rows × 6 cols, 32×32, col0 idle, col1–5 walk

  const PLAYER_RUN_SPRITE = new Image();
  PLAYER_RUN_SPRITE.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/player-running-0.1.png"; // same grid; you can draw it larger if you want

  const ITEM_SPRITES = {
    healthPotion: new Image(),
    scrollFireBall: new Image(),
    scrollFreezeCloud: new Image(),
    scrollChainLightning: new Image(),
  };

  ITEM_SPRITES.scrollFireBall.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/scrolls/scrollFireBall-inv.png";
  ITEM_SPRITES.scrollFreezeCloud.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/scrolls/scrollFreezeCloud-inv.png";
  ITEM_SPRITES.scrollChainLightning.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/scrolls/scrollChainLightning-inv.png";
  ITEM_SPRITES.healthPotion.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/glowing-crystal-0.1-spritesheet.png";

  const itemSpritesheet = new Image();
  itemSpritesheet.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/ui/inventory-large-0.1.png";
const PILLAR_SPRITE = new Image();
PILLAR_SPRITE.src = "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/tiles/piller-0.1.png";
  const TILESET = new Image();
  TILESET.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/tiles/tileset-damp-dark-dungeon-floor-cobblestone-0.1.png";

  const LEDGE_W = 14; // thickness of a ledge strip (ledge + its shadow)
  let tileArt = null;

  // Cut a region of the tileset into its own canvas, optionally flipped.
  function sliceTileset(sx, sy, w, h, flipX = false, flipY = false) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.translate(flipX ? w : 0, flipY ? h : 0);
    g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    g.drawImage(TILESET, sx, sy, w, h, 0, 0, w, h);
    return c;
  }

  // Built once, after the image has loaded. Returns null until then.
  function getTileArt() {
    if (tileArt) return tileArt;
    if (!TILESET.complete || TILESET.naturalWidth === 0) return null;

    // Wall base: skip the 2 light ledge columns on the tile's left edge.
    const wall = document.createElement("canvas");
    wall.width = wall.height = TILE_SIZE;
    const wg = wall.getContext("2d");
    wg.imageSmoothingEnabled = false;
    wg.drawImage(TILESET, 2, 192, 30, 32, 0, 0, 30, 32);
    wg.drawImage(TILESET, 2, 192, 2, 32, 30, 0, 2, 32);

    tileArt = {
      floor: sliceTileset(64, 64, 32, 32),
      wall,

      west: sliceTileset(32, 32, LEDGE_W, 32),
      east: sliceTileset(32, 32, LEDGE_W, 32, true, false),
      south: sliceTileset(32, 146, 32, LEDGE_W),
      north: sliceTileset(32, 146, 32, LEDGE_W, false, true),

      outerNW: sliceTileset(33, 130, 14, 14),
      outerNE: sliceTileset(96, 67, 14, 14),
      outerSW: sliceTileset(62, 1, 14, 14),
      outerSE: sliceTileset(33, 64, 14, 14),

      innerNW: sliceTileset(4, 129, 14, 14),
      innerNE: sliceTileset(96, 194, 14, 14),
      innerSW: sliceTileset(0, 0, 14, 14),
      innerSE: sliceTileset(30, 190, 14, 14),
    };
    return tileArt;
  }

  function isFloorAt(x, y) {
    return (
      x >= 0 &&
      x < MAP_WIDTH &&
      y >= 0 &&
      y < MAP_HEIGHT &&
      gameState.map[y][x] === TileType.FLOOR
    );
  }


   function drawCorner(art, type, direction, tx, ty) {
    if (!PILLAR_SPRITE.complete || PILLAR_SPRITE.naturalWidth === 0) return;

    const T = TILE_SIZE;
    const S = PILLAR_SRC_SIZE; // 16, drawn at native size, no scaling
    const positions = {
      NW: [tx, ty],
      NE: [tx + T - S, ty],
      SW: [tx, ty + T - S],
      SE: [tx + T - S, ty + T - S],
    };
    const [drawX, drawY] = positions[direction];

    context.imageSmoothingEnabled = false;
    context.drawImage(PILLAR_SPRITE, 0, 0, S, S, drawX, drawY, S, S);
  }

  function drawWallEdges(art, x, y, tx, ty) {
    const T = TILE_SIZE;
    const L = LEDGE_W;

    const n = isFloorAt(x, y - 1);
    const e = isFloorAt(x + 1, y);
    const s = isFloorAt(x, y + 1);
    const w = isFloorAt(x - 1, y);

    // Nothing touches a room → leave this cell black
    if (!n && !e && !s && !w) {
      if (
        !isFloorAt(x - 1, y - 1) &&
        !isFloorAt(x + 1, y - 1) &&
        !isFloorAt(x - 1, y + 1) &&
        !isFloorAt(x + 1, y + 1)
      ) {
        return;
      }
    }

    // Straight ledges on the room-facing sides
    if (w) context.drawImage(art.west, tx, ty);
    if (e) context.drawImage(art.east, tx + T - L, ty);
    if (n) context.drawImage(art.north, tx, ty);
    if (s) context.drawImage(art.south, tx, ty + T - L);

    // Inner corners
    if (n && w) drawCorner(art, "inner", "NW", tx, ty);
    if (n && e) drawCorner(art, "inner", "NE", tx, ty);
    if (s && w) drawCorner(art, "inner", "SW", tx, ty);
    if (s && e) drawCorner(art, "inner", "SE", tx, ty);

    // Outer corners (diagonal floor only)
    if (!n && !w && isFloorAt(x - 1, y - 1)) {
      drawCorner(art, "outer", "NW", tx, ty);
    }
    if (!n && !e && isFloorAt(x + 1, y - 1)) {
      drawCorner(art, "outer", "NE", tx, ty);
    }
    if (!s && !w && isFloorAt(x - 1, y + 1)) {
      drawCorner(art, "outer", "SW", tx, ty);
    }
    if (!s && !e && isFloorAt(x + 1, y + 1)) {
      drawCorner(art, "outer", "SE", tx, ty);
    }
  }

  const ITEM_ANIMATIONS = {
    scrollFireBall: {
      image: ITEM_SPRITES.scrollFireBall,
      frames: 1,
      frameWidth: 25,
      frameHeight: 11,
      worldScale: 0.5,
    },
    scrollFreezeCloud: {
      image: ITEM_SPRITES.scrollFreezeCloud,
      frames: 1,
      frameWidth: 25,
      frameHeight: 11,
      worldScale: 0.5,
    },
    scrollChainLightning: {
      image: ITEM_SPRITES.scrollChainLightning,
      frames: 1,
      frameWidth: 25,
      frameHeight: 11,
      worldScale: 0.5,
    },
    healthPotion: {
      image: ITEM_SPRITES.healthPotion,
      frames: 8,
      frameWidth: 38,
      frameHeight: 38,
      worldScale: 0.5,
    },
  };

  const ITEM_ANIMATION_FPS = 4;
  const PLAYER_SPEED = 3; // tiles per second
  const PLAYER_SNEAK_SPEED = 1.6;
  const PLAYER_RUN_SPEED = 5.2;
  const STAMINA_MAX = 3;
  const STAMINA_START_MIN = 0.35;
  const STAMINA_DEPLETION_RATE = 1;
  const STAMINA_WALK_RECHARGE_RATE =
    STAMINA_DEPLETION_RATE / 1.5; // 0.667 per second
  const STAMINA_SNEAK_RECHARGE_RATE =
    STAMINA_DEPLETION_RATE;
    const STAMINA_HIDING_RECHARGE_RATE =
    STAMINA_DEPLETION_RATE; // 1 per second
  const STAMINA_RECHARGE_DELAY = 1.5; // seconds
  const PROJECTILE_SPEED = 7; // tiles per second (continuous, any angle)
  const PROJECTILE_HIT_RADIUS = 0.75; // how close to an enemy's centre counts as a hit

  let gameRunning = false;
  let gameStart = null;
  let globalPlayer = null;
  let gameState = null;
  let lastFrameTime = null;
  let lastEnemyTime = null;
  let lastProjectileTime = null;
  let lastSeparationTime = 20000;

  let inventoryOpen = false;
  let selectedCol = 0;
  let selectedRow = 0;
  const PILLAR_SRC_SIZE = 16;   // size of the png
  const PILLAR_DRAW_SCALE = 2;  // 2 = 32x32, exactly one tile
  const INV_COLS = 4;
  const INV_ROWS = 3;

  const moveKeys = {
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
  };

  const fireKeys = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };

  const heldMoveKeys = new Set();
  const movementKeys = new Set(["w", "a", "s", "d"]);
  const heldGaitKeys = { sneak: false, run: false };

  // ---------------------------------------------------------------------------
  // PLAYER SPRITESHEET (8 directions)
  // ---------------------------------------------------------------------------
  const FRAME_W = 32;
  const FRAME_H = 32;
  const WALK_FRAME_COUNT = 5;
  const RUN_FRAME_COUNT = 6;
  const RUN_FRAME_W = 48;
  const RUN_FRAME_H = 48;
  const SNEAK_FRAME_COUNT = 6;
  const SNEAK_FRAME_W = 32;
  const SNEAK_FRAME_H = 32;

  const WALK_HAS_IDLE = true;
  const RUN_HAS_IDLE = false;
  const SNEAK_HAS_IDLE = false;

  const PLAYER_DRAW_W = FRAME_W;
  const PLAYER_DRAW_H = FRAME_H;

  const PX_PER_WALK_FRAME = 8;
  const PX_PER_SNEAK_FRAME = 6;
  const PX_PER_RUN_FRAME = 10;

  const MOVE_GRACE_MS = 90;

  const PLAYER_DIRECTION_ROWS = {
    down: 0,
    downLeft: 5,
    left: 1,
    upLeft: 6,
    up: 3,
    upRight: 7,
    right: 2,
    downRight: 4,
  };

  const DIR_FROM_VECTOR = {
    "0,1": "down",
    "-1,1": "downLeft",
    "-1,0": "left",
    "-1,-1": "upLeft",
    "0,-1": "up",
    "1,-1": "upRight",
    "1,0": "right",
    "1,1": "downRight",
  };

  const DEBUG_SHEET = false;
  let lastFireTime = -Infinity;
  const FIRE_COOLDOWN = 1000;
// ---------------------------------------------------------------------------
// STAIRS
// ---------------------------------------------------------------------------

// Decides what the down stairs of a new dungeon lead to.
function rollDownPlans(plan) {
  if (plan.type === "deadEnd") {
    // chainLeft counts this dungeon, so the last one gets no down stairs.
    return plan.chainLeft > 1
      ? [{ type: "deadEnd", chainLeft: plan.chainLeft - 1 }]
      : [];
  }

  if (Math.random() < STAIRS_BRANCH_CHANCE) {
    const depth =
      DEAD_END_MIN_DEPTH +
      Math.floor(
        Math.random() * (DEAD_END_MAX_DEPTH - DEAD_END_MIN_DEPTH + 1)
      );
    const plans = [{ type: "deadEnd", chainLeft: depth }, { type: "main" }];
    if (Math.random() < 0.5) plans.reverse(); // don't always put the dead end first
    return plans;
  }

  return [{ type: "main" }];
}

function createDungeon(depth, plan, parentId) {
  const downPlans = rollDownPlans(plan);

  let state = null;
  for (let tries = 0; tries < 20 && !state; tries++) {
    state = createGameState(depth, null, {
      hasUpStairs: parentId !== null,
      downPlans,
    });
  }
  if (!state) return null;

  state.id = nextDungeonId++;
  state.depth = depth;
  state.parentId = parentId;
  dungeons.set(state.id, state);
  return state;
}

function calmEnemies(state) {
  for (const e of state.enemies) {
    e.state = "patrol";
    e.suspicion = 0;
    e.canSeePlayer = false;
    e.searching = false;
    e.steer = null;
    e.waitTimer = 0;
    e.attackSpot = null;
    e.breakTimer = null;
    e.doorTarget = null;
    e.searchRoom = null;
  }
}

function useStairs(stair) {
  const from = gameState;
  const player = from.player;

  // hidingSpots is a shared module-level array, so save this dungeon's copy.
  from.hidingSpots = hidingSpots.slice();

  let target = null;
  if (stair.kind === "up") {
    target = dungeons.get(from.parentId);
  } else if (stair.targetId !== null) {
    target = dungeons.get(stair.targetId);
  } else {
    target = createDungeon(from.depth + 1, stair.plan, from.id);
    if (target) stair.targetId = target.id;
  }

  if (!target) {
    // Generation failed: put everything back as it was.
    hidingSpots.length = 0;
    hidingSpots.push(...from.hidingSpots);
    globalPlayer = player;
    return;
  }

  const arrival =
    stair.kind === "down"
      ? target.stairs.find((s) => s.kind === "up")
      : target.stairs.find((s) => s.kind === "down" && s.targetId === from.id);

  // Carry the player and inventory into the new dungeon.
  target.player = player;
  target.inventory = from.inventory;
  target.armedScroll = from.armedScroll;
  player.x = arrival.x;
  player.y = arrival.y;
  player.hidden = false;
  player.hidingSpot = null;

  from.projectiles.length = 0;
  target.projectiles.length = 0;
  noiseRipples.length = 0;
  calmEnemies(target);

  gameState = target;
  globalPlayer = player;
  hidingSpots.length = 0;
  hidingSpots.push(...target.hidingSpots);
  stairsLocked = true; // don't bounce straight back

  console.log(
    "Entered dungeon",
    target.id,
    "depth",
    target.depth,
    "down stairs:",
    target.stairs.filter((s) => s.kind === "down").length
  );
}

function updateStairs() {
  if (!gameState || !gameState.stairs || gameState.gameOver) return;
  const p = gameState.player;
  if (p.hidden) return;

  const touching = gameState.stairs.find(
    (s) => Math.hypot(p.x - s.x, p.y - s.y) < STAIRS_TRIGGER_RADIUS
  );

  if (!touching) {
    stairsLocked = false;
    return;
  }
  if (stairsLocked) return;

  useStairs(touching);
}

// Placeholder art: little stair steps (lighter = up, darker = down).
function drawStairs() {
  if (!gameState || !gameState.stairs) return;

  for (const s of gameState.stairs) {
    const px = s.x * TILE_SIZE;
    const py = s.y * TILE_SIZE;
    const down = s.kind === "down";

    context.fillStyle = "#0f172a";
    context.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    context.fillStyle = down ? "#64748b" : "#cbd5e1";
    for (let i = 0; i < 4; i++) {
      const inset = down ? i * 2 : (3 - i) * 2;
      context.fillRect(
        px + 4 + inset,
        py + 5 + i * 6,
        TILE_SIZE - 8 - inset * 2,
        3
      );
    }
  }
}

 
  // ---------------------------------------------------------------------------
  // TRAPS
  // ---------------------------------------------------------------------------
  const TRAP_DAMAGE = 30;
  const TRAP_ENEMY_DAMAGE = 15;   // enemies take less than the player
  const TRAP_KNOCKBACK = 0.5;     // tiles
  const TRAP_TRIGGER_RADIUS = 0.4;
  const TRAP_REARM_MS = 2500;
  const TRAP_NOISE_RADIUS = 6;
  const TRAPS_PER_ROOM_MIN = 0;
  const TRAPS_PER_ROOM_MAX = 2;


  // ---------------------------------------------------------------------------
// LAYOUT / DOORS
// ---------------------------------------------------------------------------
const ROOM_COUNT = 12;
const MAX_ROOM_ATTEMPTS = 500;
const CONNECTOR_LENGTH = 2;
const WIDE_CONNECTOR_CHANCE = 0.2;   // 3-wide open connectors (no door)

const DOOR_HP = 100;
const ENEMY_DOOR_DAMAGE = 50;        // 4 hits to break
const ENEMY_DOOR_HIT_INTERVAL_MS = 700;
const DOOR_INTERACT_DIST = 1.5;
const DOOR_BREAK_NOISE_RADIUS = 5;
const CURIOUS_GIVE_UP_MS = 8000;     // curious enemies stuck behind a door give up
const DOOR_ATTACK_REACH = 1.1; // how close an enemy must be to hit a door


  // ---------------------------------------------------------------------------
// STAIRS / DUNGEON GRAPH
// ---------------------------------------------------------------------------
const STAIRS_BRANCH_CHANCE = 0.3; // chance a normal dungeon gets 2 down stairs
const DEAD_END_MIN_DEPTH = 1;     // dungeons in a dead-end branch (last has no stairs)
const DEAD_END_MAX_DEPTH = 3;
const STAIRS_TRIGGER_RADIUS = 0.5;

const dungeons = new Map(); // id -> gameState of every dungeon generated so far
let nextDungeonId = 0;
let stairsLocked = false;   // true after arriving until the player steps off the stairs

  // ---------------------------------------------------------------------------
  // ENEMY VISION & DETECTION
  // ---------------------------------------------------------------------------
  const ENEMY_OUTER_RANGE = 5.5;
  const ENEMY_OUTER_HALF_ANGLE = Math.PI / 3.2;
  const ENEMY_INNER_RANGE = 2.5;
  const ENEMY_INNER_HALF_ANGLE = Math.PI / 9;

  const SUSPICION_FILL_FAR = 0.45;
  const SUSPICION_FILL_NEAR = 1.4;
  const SUSPICION_DECAY = 0.3;
  const CURIOUS_THRESHOLD = 0.4;

  const PLAYER_EXPOSED_MS = 150;
  const ALERT_SIGHT_RANGE = 8;
  const ALERT_LOSE_TIME = 3000;
  const CURIOUS_WAIT_MS = 1800;
  const PATROL_WAIT_MS = 1200;
  const HIDE_SEARCH_MS = 1200;
  const HIDE_BREAK_DELAY_MS = 1500;
  const ENEMY_SPEED = { patrol: 1.2, curious: 2.0, alert: 2.6 };
  const ENEMY_TURN_SPEED = 6;
  const NOISE_RADIUS_SPELL = 7;

  const FOOTSTEP_RADIUS = { sneak: 0, walk: 1, run: 4.5 };
  const FOOTSTEP_INTERVAL_MS = { walk: 700, run: 500 };

  const ENEMY_HITBOX = { left: 0.2, right: 0.8, top: 0.2, bottom: 0.8 };
  const ENEMY_ARRIVE_DIST = 0.15;
  const NAV_REPLAN_MS = 200;

  const SHOW_VISION_CONES = true;

  const SEARCH_POINT_COUNT = 3;
  const SEARCH_RADIUS = 4;
  const SEARCH_WAIT_MS = 800;

  let lastFootstepTime = -Infinity;
  const noiseRipples = [];

  // ---------------------------------------------------------------------------
  // HIDING
  // ---------------------------------------------------------------------------
  const HIDE_INTERACT_DIST = 0.9;
  const HIDE_SEARCH_RANGE = 1.1;
  const HIDE_SPOT_COLOR = "#334155";
  const HIDE_ATTACK_REACH = 0.9;
  const HIDE_BREAK_NOISE_RADIUS = 5;
  const HIDE_SPOT_TYPES = ["closet", "crate"];
  const HIDE_SPOTS_PER_ROOM = 3;
  const HIDE_SMASH_CHANCE = 0.5;            // chance a searched room loses a spot at all
  const HIDE_ROOM_ROLL_COOLDOWN_MS = 20000;  // a room only rolls once per this window
  const HIDE_SUSPECT_LIMIT = 2;              // this many suspicious visits, then it breaks the spot
  const HIDE_SUSPECT_RADIUS = 1.5;           // an investigation this close to a spot counts as "at" it
  const HIDE_SUSPECT_COOLDOWN_MS = 6000;     // one visit only counts once per this window

  const hidingSpots = [];
  // ---------------------------------------------------------------------------
  // PLAYER DRAW
  // ---------------------------------------------------------------------------
  const RUN_DISPLAY_SCALE = 1.5;
  const RUN_Y_OFFSET = 8;

  // ---------------------------------------------------------------------------
  // ZOOM
  // ---------------------------------------------------------------------------
  const ZOOM_KEY = "q";
  const NORMAL_ZOOM = 1;
  const ZOOM_OUT_MIN = 0.5;
  const ZOOM_OUT_TIME = 2000;
  const ZOOM_IN_TIME = 20;
  const MIN_HOLD_TIME = 1000;
  const MAX_HOLD_TIME = 3000;
  const COOLDOWN_TIME = 5000;


  let zoomKeyHeld = false;
  let zoomAbilityActive = false;
  let zoomAbilityOnCooldown = false;
  let zoomAnimationId = null;
  let maxHoldTimer = null;
  let cooldownTimer = null;
  let zoomActivationTime = 0;

  // ---------------------------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------------------------
  // Inventory keys
  window.addEventListener("keydown", (event) => {
  if (event.code !== "KeyE" || event.repeat) return;
  if (!gameRunning || !gameState) return;

  if (inventoryOpen) {
    useSelectedItem();
    return;
  }
  if (gameState.player.hidden || getNearbyHidingSpot()) {
    toggleHide();
    return;
  }
  if (startContainerSearch()) return;
  toggleNearbyDoor();
});
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() !== "g") return;
  if (event.repeat) return;
  if (!inventoryOpen) return;

  dropSelectedItem();
});
window.addEventListener("keyup", (event) => {
  if (event.code === "KeyE") searchState = null;
});

window.addEventListener("blur", () => {
  searchState = null;
});

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key === "c") heldGaitKeys.sneak = true;
    if (event.code === "ShiftLeft") heldGaitKeys.run = true;
  });

  window.addEventListener("keyup", (event) => {
    if (event.key === "c") heldGaitKeys.sneak = false;
    if (event.code === "ShiftLeft") heldGaitKeys.run = false;
  });

  window.addEventListener("blur", () => {
    heldGaitKeys.sneak = false;
    heldGaitKeys.run = false;
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (movementKeys.has(key)) {
      event.preventDefault();
      heldMoveKeys.add(key);
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (movementKeys.has(key)) {
      event.preventDefault();
      heldMoveKeys.delete(key);
    }
  });

  window.addEventListener("blur", () => {
    heldMoveKeys.clear();
  });

  window.addEventListener("keydown", (event) => {
    if (!gameRunning) return;

    const key = event.key.toLowerCase();

    if (key === "tab" || key === "escape") {
      if (event.repeat) return;

      if (inventoryOpen) {
        inventoryOpen = false;
      } else if (key === "tab") {
        inventoryOpen = true;
      }

      event.preventDefault();
      return;
    }

    if (inventoryOpen) {
      if (key === "w" || key === "arrowup") {
        selectedRow = Math.max(0, selectedRow - 1);
      } else if (key === "s" || key === "arrowdown") {
        selectedRow = Math.min(INV_ROWS - 1, selectedRow + 1);
      } else if (key === "a" || key === "arrowleft") {
        selectedCol = Math.max(0, selectedCol - 1);
      } else if (key === "d" || key === "arrowright") {
        selectedCol = Math.min(INV_COLS - 1, selectedCol + 1);
      }
      event.preventDefault();
      return;
    }

    if (moveKeys[key]) {
      event.preventDefault();
      return;
    }

    const fireDirection = fireKeys[event.key];

    if (fireDirection) {
      event.preventDefault();
      if (gameState.player.hidden) return;
      if (event.repeat) return;

      const now = performance.now();
      if (now - lastFireTime < FIRE_COOLDOWN) return;

      lastFireTime = now;
      const [dx, dy] = fireDirection;
      castSpell(dx, dy);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== ZOOM_KEY) return;
    if (event.repeat) return;
    event.preventDefault();
    activateZoomAbility();
  });

window.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() !== ZOOM_KEY) return;

  event.preventDefault();
  returnFromZoom();
});

window.addEventListener("keydown", function (event) {
  if (event.code === "KeyM") {
    minimapVisible = !minimapVisible;
  }
});
// ---------------------------------------------------------------------------
// MOUSE AIM
// ---------------------------------------------------------------------------


const mouse = { clientX: 0, clientY: 0, active: false };

window.addEventListener("mousemove", (event) => {
  mouse.clientX = event.clientX;
  mouse.clientY = event.clientY;
  mouse.active = true;

  if (inventoryOpen) {
    const slot = getInventorySlotAtMouse();
    if (slot) {
      selectedCol = slot.col;
      selectedRow = slot.row;
    }
  }
});

// Mouse position in world TILE units (same space as player.x / player.y).
function getMouseWorldTile() {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  // Screen position on the canvas, in display pixels.
  // (getBoundingClientRect already includes the CSS zoom transform.)
  const sx = ((mouse.clientX - rect.left) / rect.width) * DISPLAY_WIDTH;
  const sy = ((mouse.clientY - rect.top) / rect.height) * DISPLAY_HEIGHT;

  // Undo the camera transform used in drawGame.
  const camera = getCamera();
  const scale = Math.round(zoom) || 1;
  const worldX = camera.x + (sx - Math.floor(DISPLAY_WIDTH / 2)) / scale;
  const worldY = camera.y + (sy - Math.floor(DISPLAY_HEIGHT / 2)) / scale;

  return { x: worldX / TILE_SIZE, y: worldY / TILE_SIZE };
}

// Vector from the player to the mouse (not normalized), or null.
function getAimVector() {
  if (!gameState || !mouse.active) return null;
  const m = getMouseWorldTile();
  if (!m) return null;
  const pc = playerCenter();
  const dx = m.x - pc.x;
  const dy = m.y - pc.y;
  if (Math.hypot(dx, dy) < 0.05) return null;
  return { dx, dy };
}

// Snap any vector to one of the 8 sprite directions.
const DIRS_BY_OCTANT = [
  "right", "downRight", "down", "downLeft",
  "left", "upLeft", "up", "upRight",
];
function directionFromVector(dx, dy) {
  const angle = Math.atan2(dy, dx); // 0 = right, +PI/2 = down
  const octant = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
  return DIRS_BY_OCTANT[octant];
}
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 2) {
    chargeStart = null;
    return;
  }
  if (!gameRunning || !gameState) return;

if (inventoryOpen) {
  const slot = getInventorySlotAtMouse();
  if (slot) {
    selectedCol = slot.col;
    selectedRow = slot.row;
    useSelectedItem();
  }
  return;
}
  if (gameState.player.hidden || gameState.gameOver) return;

   const now = performance.now();
  if (now - lastFireTime < FIRE_COOLDOWN) return;
  chargeStart = now;
});

let chargeStart = null; // timestamp when the button went down, or null

window.addEventListener("mouseup", (event) => {
  if (event.button !== 0 || chargeStart === null) return;

  const held = performance.now() - chargeStart;
  chargeStart = null;

  if (!gameRunning || !gameState || inventoryOpen) return;
  if (gameState.player.hidden || gameState.gameOver) return;

    const aim = getAimVector();
  if (!aim) return;

  lastFireTime = performance.now();
  castSpell(aim.dx, aim.dy, held >= chargeTimeFor(gameState.armedScroll));
});

window.addEventListener("blur", () => {
  chargeStart = null;
});

  // ---------------------------------------------------------------------------
  // CORE GAME LOOP
  // ---------------------------------------------------------------------------
  function startGame3() {
    gameStart = performance.now();
    lastFrameTime = null;
    lastEnemyTime = null;
    lastProjectileTime = null;
    heldMoveKeys.clear();
    noiseRipples.length = 0;
    lastFootstepTime = -Infinity;

    dungeons.clear();
    nextDungeonId = 0;
    stairsLocked = false;
    const newGameState = createDungeon(1, { type: "main" }, null);

    if (!newGameState) {
      console.error("Game could not start because no rooms were generated.");
      return;
    }

    gameState = newGameState;
    gameRunning = true;
    gameLoopId = requestAnimationFrame(gameLoop);
    gameState.items.push({
      id: "debug-scroll",
      x: gameState.player.x,
      y: gameState.player.y + 1,
      type: "scroll",
      idName: "scrollFreezeCloud",
    });
  }

  function stopGame3() {
    gameRunning = false;
    heldMoveKeys.clear();
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
  }

  function getCamera() {
    const player = gameState?.player;

    if (!player) {
      return {
        x: DISPLAY_WIDTH / 2,
        y: DISPLAY_HEIGHT / 2,
      };
    }

    return {
      x: (player.x + 0.5) * TILE_SIZE,
      y: (player.y + 0.5) * TILE_SIZE,
    };
  }

  function revealMinimapView() {
  if (!gameState || !gameState.player) return;

  const px = Math.floor(gameState.player.x + 0.5);
  const py = Math.floor(gameState.player.y + 0.5);
  const x0 = px - Math.floor(VIEW_TILES_X / 2);
  const y0 = py - Math.floor(VIEW_TILES_Y / 2);

  for (let y = y0; y < y0 + VIEW_TILES_Y; y++) {
    for (let x = x0; x < x0 + VIEW_TILES_X; x++) {
      if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) continue;
            if (!gameState.explored) gameState.explored = new Set();
      gameState.explored.add(y * MAP_WIDTH + x);
    }
  }
}

  function gameLoop(timestamp) {
    if (!gameRunning) return;

    updateFreePlayerMovement(timestamp);
    revealMinimapView();
    updateTraps(timestamp);
    updateEnemies(timestamp);
    updateProjectiles(timestamp);
    updateEffects(timestamp);
    pickupNearbyItems();
    updateContainerSearch();
    updateStairs();
    drawGame(timestamp);


    const sepDt = lastSeparationTime === null ? 0 : Math.min((timestamp - lastSeparationTime) / 1000, 0.05);
    lastSeparationTime = timestamp;
    separateBodies(sepDt);

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  // ---------------------------------------------------------------------------
  // PLAYER MOVEMENT
  // ---------------------------------------------------------------------------
  function updateFreePlayerMovement(timestamp) {
    const deltaTime =
      lastFrameTime === null
        ? 0
        : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;

    if (!gameState || !gameState.player) return;

    const player = gameState.player;
    player.isMoving = false;

    if (gameState.gameOver || inventoryOpen) return;

    if (player.hidden) {
      player.gait = "walk";
      player.wasRunning = false;
      rechargeStamina(STAMINA_HIDING_RECHARGE_RATE);
      return;
    }

    let dx = 0;
    let dy = 0;

    if (heldMoveKeys.has("a")) dx -= 1;
    if (heldMoveKeys.has("d")) dx += 1;
    if (heldMoveKeys.has("w")) dy -= 1;
    if (heldMoveKeys.has("s")) dy += 1;

   const sneak = heldGaitKeys.sneak;
const wantRun = heldGaitKeys.run && !sneak;

// Running is unavailable after exhaustion until stamina is completely full.
const canRun =
  !player.staminaExhausted &&
  player.stamina > (player.wasRunning ? 0 : STAMINA_START_MIN);

function rechargeStamina(rechargeRate) {
  if (player.staminaRechargeDelay > 0) {
    player.staminaRechargeDelay = Math.max(
      0,
      player.staminaRechargeDelay - deltaTime
    );
    return;
  }

  player.stamina = Math.min(
    STAMINA_MAX,
    player.stamina + rechargeRate * deltaTime
  );

  if (player.stamina >= STAMINA_MAX) {
    player.staminaExhausted = false;
  }
}

if (sneak) {
  player.gait = "sneak";
  player.wasRunning = false;

  // Sneaking recharges at the full rate.
  rechargeStamina(STAMINA_SNEAK_RECHARGE_RATE);
} else if (wantRun && canRun && (dx !== 0 || dy !== 0)) {
  player.gait = "run";

  player.stamina = Math.max(
    0,
    player.stamina - STAMINA_DEPLETION_RATE * deltaTime
  );

  player.staminaRechargeDelay = STAMINA_RECHARGE_DELAY;

  if (player.stamina <= 0) {
    player.stamina = 0;
    player.staminaExhausted = true;
    player.wasRunning = false;
  } else {
    player.wasRunning = true;
  }
} else {
  player.gait = "walk";
  player.wasRunning = false;

  // Walking recharges 1.5 times slower than running depletes stamina.
  rechargeStamina(STAMINA_WALK_RECHARGE_RATE);
}

        if (dx === 0 && dy === 0) {
      const aim = getAimVector();
      if (aim) player.direction = directionFromVector(aim.dx, aim.dy);
      return;
    }

    player.direction =
      DIR_FROM_VECTOR[`${Math.sign(dx)},${Math.sign(dy)}`] || player.direction;

    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;

    const speed =
      player.gait === "sneak"
        ? PLAYER_SNEAK_SPEED
        : player.gait === "run"
        ? PLAYER_RUN_SPEED
        : PLAYER_SPEED;

    const movementAmount = speed * deltaTime;

    const oldX = player.x;
    const oldY = player.y;

    const newX = player.x + dx * movementAmount;
    const newY = player.y + dy * movementAmount;

    const passThrough = player.gait === "run";

    if (canMoveTo(newX, player.y) && (passThrough || !wouldStackOnEnemy(newX, player.y))) {
      player.x = newX;
    }

    if (canMoveTo(player.x, newY) && (passThrough || !wouldStackOnEnemy(player.x, newY))) {
      player.y = newY;
    }

    const moved = Math.hypot(player.x - oldX, player.y - oldY) * TILE_SIZE;
    if (moved > 0) {
      player.walkDistance = (player.walkDistance || 0) + moved;
      player.lastMovedTime = timestamp;

      const stepRadius = FOOTSTEP_RADIUS[player.gait] ?? 0;
      const stepInterval = FOOTSTEP_INTERVAL_MS[player.gait] ?? Infinity;
      if (stepRadius > 0 && timestamp - lastFootstepTime >= stepInterval) {
        lastFootstepTime = timestamp;
        makeNoise(player.x, player.y, stepRadius, "#e2e8f0", player);
      }
    }
    globalPlayer = player;
  }

  // Player hitbox inside their tile (0..1).
  const HITBOX = { left: 0.25, right: 0.75, top: 0.5, bottom: 0.9 };

  const BODY_DIST = 0.6;           // minimum distance between two bodies (tiles)
  const PLAYER_PUSHOUT_SPEED = 3;  // tiles/sec when shoved out of an enemy

  // Would standing at (x, y) put the player inside an enemy, deeper than now?
  function wouldStackOnEnemy(x, y) {
    const p = gameState.player;
    return gameState.enemies.some((e) => {
      const nd = Math.hypot(e.x - x, e.y - y);
      return nd < BODY_DIST && nd < Math.hypot(e.x - p.x, e.y - p.y);
    });
  }

  function separateBodies(dt) {
    if (!gameState || gameState.gameOver) return;
    const enemies = gameState.enemies;
    const p = gameState.player;
    const now = performance.now();

    // Enemy vs enemy: push both apart (a frozen one stays put, the other moves).
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i];
        const b = enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= BODY_DIST) continue;

        let ux, uy;
        if (dist < 0.001) {
          const ang = Math.random() * Math.PI * 2;
          ux = Math.cos(ang);
          uy = Math.sin(ang);
        } else {
          ux = dx / dist;
          uy = dy / dist;
        }
        const overlap = BODY_DIST - dist;
        const aF = a.frozenUntil > now;
        const bF = b.frozenUntil > now;
        const sa = aF && !bF ? 0 : bF && !aF ? 1 : 0.5;

        tryMove(a, -ux * overlap * sa, -uy * overlap * sa, ENEMY_HITBOX);
        tryMove(b, ux * overlap * (1 - sa), uy * overlap * (1 - sa), ENEMY_HITBOX);
      }
    }

    // Player vs enemy: running passes through, anything else gets pushed out.
    if (p.hidden || p.gait === "run") return;
    for (const e of enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= BODY_DIST) continue;

      let ux, uy;
      if (dist < 0.001) {
        const f = facingVector(p);
        ux = -f.x;
        uy = -f.y;
      } else {
        ux = dx / dist;
        uy = dy / dist;
      }
      const step = Math.min(BODY_DIST - dist, PLAYER_PUSHOUT_SPEED * dt);
      tryMove(p, ux * step, uy * step, HITBOX);
    }
  }

  function isWalkableTile(tileX, tileY) {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return false;
    }
    return gameState.map[tileY][tileX] !== TileType.WALL;
  }
  // Walkable, and (optionally) not a trap tile.
function isNavTile(tileX, tileY, avoidTraps = false) {
  if (!isWalkableTile(tileX, tileY)) return false;
  return !(avoidTraps && gameState.trapTiles.has(tileY * MAP_WIDTH + tileX));
}


function isBoxClear(x, y, hb, avoidTraps = false) {
  if (!gameState || !gameState.map) return false;
  const ok = (tx, ty) => isNavTile(tx, ty, avoidTraps);
  return (
    ok(Math.floor(x + hb.left), Math.floor(y + hb.top)) &&
    ok(Math.floor(x + hb.right), Math.floor(y + hb.top)) &&
    ok(Math.floor(x + hb.left), Math.floor(y + hb.bottom)) &&
    ok(Math.floor(x + hb.right), Math.floor(y + hb.bottom)) &&
    !isBoxBlockedByDoor(x, y, hb)
  );
}
function isSegmentClear(ax, ay, bx, by, hb, avoidTraps = false) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 0.15));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isBoxClear(ax + (bx - ax) * t, ay + (by - ay) * t, hb, avoidTraps)) {
      return false;
    }
  }
  return true;
}

 function tryMove(entity, dx, dy, hb, avoidTraps = false) {
  const ox = entity.x;
  const oy = entity.y;

  // If the entity is already standing on a trap tile, let it walk off.
  if (avoidTraps && !isBoxClear(entity.x, entity.y, hb, true)) {
    avoidTraps = false;
  }

  if (isBoxClear(entity.x + dx, entity.y, hb, avoidTraps)) entity.x += dx;
  if (isBoxClear(entity.x, entity.y + dy, hb, avoidTraps)) entity.y += dy;
  return Math.hypot(entity.x - ox, entity.y - oy);
}

  function canMoveTo(x, y) {
    return isBoxClear(x, y, HITBOX);
  }

  // ---------------------------------------------------------------------------
  // NOISE / RIPPLES
  // ---------------------------------------------------------------------------
  // x / y / radius come in as TILES; ripples are stored in PIXELS so that
  // drawRipples can use them directly.
  // Where an entity's feet sit inside its tile. Tweak if the ring looks
  // slightly high or low against your sprite.
  const RIPPLE_FEET_Y = 0.9;

  function rippleCenter(x, y) {
    return {
      x: Math.round((x + 0.5) * TILE_SIZE),
      y: Math.round((y + RIPPLE_FEET_Y) * TILE_SIZE),
    };
  }

  // x / y / radius come in as TILES. `follow` (optional) is an entity whose
  // feet the ripple stays stuck to while it plays.
  function spawnRipple(
    x,
    y,
    radius,
    color,
    duration = 500 + radius * 60,
    reach = null,
    follow = null
  ) {
    noiseRipples.push({
      x,
      y,
      radius, // tiles
      color,
      start: performance.now(),
      duration,
      reach,
      follow,
      reachTile: -1,
    });
  }

  // `follow`: pass the entity making the noise so the ripple sticks to it.
  function makeNoise(x, y, radius, color = "#facc15", follow = null) {
    if (!gameState || !gameState.enemies) return;

    const reach = soundReach(x, y, radius);
    spawnRipple(x, y, radius, color, undefined, reach, follow);

    for (const e of gameState.enemies) {
      if (e.state === "alert") continue;

      const tileKey =
        Math.floor(e.y + 0.5) * MAP_WIDTH + Math.floor(e.x + 0.5);
      if (!reach.has(tileKey)) continue;

      startInvestigating(e, x, y);
      e.suspicion = Math.max(e.suspicion, CURIOUS_THRESHOLD);
      spawnRipple(e.x, e.y, 0.7, "#f59e0b", 450, null, e); // stuck to the enemy
    }
  }

  function soundReach(x, y, radius) {
    const sx = Math.floor(x + 0.5);
    const sy = Math.floor(y + 0.5);
    const key = (tx, ty) => ty * MAP_WIDTH + tx;

    const dist = new Map([[key(sx, sy), 0]]);
    if (!isWalkableTile(sx, sy)) return dist;

    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, Math.SQRT2],
      [-1, 1, Math.SQRT2],
      [1, -1, Math.SQRT2],
      [-1, -1, Math.SQRT2],
    ];
    const queue = [[sx, sy]];

    for (let head = 0; head < queue.length; head++) {
      const [cx, cy] = queue[head];
      const cd = dist.get(key(cx, cy));

      for (const [dx, dy, cost] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!isWalkableTile(nx, ny) || isDoorClosedAt(nx, ny)) continue;

        if (
          dx !== 0 &&
          dy !== 0 &&
          (!isWalkableTile(cx + dx, cy) || !isWalkableTile(cx, cy + dy))
        ) {
          continue;
        }

        const nd = cd + cost;
        if (nd > radius) continue;

        const k = key(nx, ny);
        if (dist.has(k) && dist.get(k) <= nd) continue;
        dist.set(k, nd);
        queue.push([nx, ny]);
      }
    }
    return dist;
  }

  function drawRipples() {
    const now = performance.now();
    const pad = 2;

    for (let i = noiseRipples.length - 1; i >= 0; i--) {
      const r = noiseRipples[i];
      const t = (now - r.start) / r.duration;
      if (t >= 1) {
        noiseRipples.splice(i, 1);
        continue;
      }

      // Centre: locked to the entity's feet if it has one, else the spawn point.
      const src = r.follow || r;
      const c = rippleCenter(src.x, src.y);

      // A following ripple that is wall-clipped re-flood-fills when the
      // entity steps onto a new tile, so the clip area moves with it.
      if (r.follow && r.reach) {
        const tk =
          Math.floor(src.y + 0.5) * MAP_WIDTH + Math.floor(src.x + 0.5);
        if (tk !== r.reachTile) {
          r.reachTile = tk;
          r.reach = soundReach(src.x, src.y, r.radius);
        }
      }

      context.save();

      if (r.reach && r.reach.size > 0) {
        context.beginPath();
        for (const k of r.reach.keys()) {
          const tx = k % MAP_WIDTH;
          const ty = Math.floor(k / MAP_WIDTH);
          context.rect(
            tx * TILE_SIZE - pad,
            ty * TILE_SIZE - pad,
            TILE_SIZE + pad * 2,
            TILE_SIZE + pad * 2
          );
        }
        context.clip();
      }

      context.strokeStyle = r.color;
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.lineCap = "round";

      for (const lag of [0, 0.18]) {
        const tt = Math.max(0, t - lag);
        if (tt <= 0) continue;
        const eased = 1 - (1 - tt) * (1 - tt);
        context.globalAlpha = (1 - t) * (lag === 0 ? 0.7 : 0.4);
        context.beginPath();
        context.arc(c.x, c.y, r.radius * TILE_SIZE * eased, 0, Math.PI * 2);
        context.stroke();
      }

      context.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // DRAWING
  // ---------------------------------------------------------------------------
  function drawGame(timestamp) {
    if (!gameState || !gameState.player) {
      return;
    }

    const camera = getCamera();

    context.setTransform(
      devicePixelRatioValue,
      0,
      0,
      devicePixelRatioValue,
      0,
      0
    );

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    context.save();

    context.translate(
      Math.floor(DISPLAY_WIDTH / 2),
      Math.floor(DISPLAY_HEIGHT / 2)
    );

    context.scale(Math.round(zoom), Math.round(zoom));
    context.translate(-Math.round(camera.x), -Math.round(camera.y));

    drawMap();
    drawRipples();
    drawEffects(timestamp, "ground");
    drawHidingSpots();
    drawContainers(); 
    drawStairs(); 
    drawBrokenDoors();
    drawDoors(timestamp);
//  drawVisionCones(); // hide this in final version
    drawPlayer(timestamp);
    drawChargeBar();
    drawItems(timestamp);
    drawProjectiles();
    drawEnemies();
    drawEffects(timestamp, "air"); 
    drawHidePrompt();
    drawContainerPrompt(); 
    

    context.restore();
    if (gameState.gameOver) drawGameOver();
  
    context.setTransform(
      devicePixelRatioValue * INV_SCALE,
      0,
      0,
      devicePixelRatioValue * INV_SCALE,
      0,
      0
    );

     if (DEBUG_SHEET) drawSheetDebug();
    context.imageSmoothingEnabled = false;
    drawInventory(timestamp);
    drawHUD();  
    drawMiniMap();        // <-- last line in drawGame
  }

  function drawSheetDebug() {
    context.setTransform(
      devicePixelRatioValue,
      0,
      0,
      devicePixelRatioValue,
      0,
      0
    );
    context.fillStyle = "#f0f";
    context.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    if (PLAYER_SPRITE.complete && PLAYER_SPRITE.naturalWidth > 0) {
      context.drawImage(PLAYER_SPRITE, 0, 0);
    }
    context.strokeStyle = "lime";
    context.fillStyle = "yellow";
    context.font = "8px Arial";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        context.strokeRect(
          c * FRAME_W + 0.5,
          r * FRAME_H + 0.5,
          FRAME_W - 1,
          FRAME_H - 1
        );
      }
      context.fillText(String(r), 2, r * FRAME_H + 10);
    }
    context.setTransform(
      devicePixelRatioValue / CANVAS_SCALE,
      0,
      0,
      devicePixelRatioValue / CANVAS_SCALE,
      0,
      0
    );
  }

  function drawMap() {
    const art = getTileArt();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = gameState.map[y][x];
        const tx = Math.floor(x * TILE_SIZE);
        const ty = Math.floor(y * TILE_SIZE);

        if (tile === TileType.WALL) {
          let isRoomWall = false;
          for (let dy = -1; dy <= 1 && !isRoomWall; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (isFloorAt(x + dx, y + dy)) {
                isRoomWall = true;
                break;
              }
            }
          }
          if (!isRoomWall) continue;

          if (art) {
            drawWallEdges(art, x, y, tx, ty);
          }
          continue;
        }

        if (tile === TileType.FLOOR) {
          if (art) {
            context.drawImage(art.floor, tx, ty);
          } else {
            context.fillStyle = "#9ca3af";
            context.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          }
          continue;
        }
if (tile === TileType.FLOOR || tile === TileType.PILLAR) {
  if (art) {
    context.drawImage(art.floor, tx, ty);
  } else {
    context.fillStyle = "#9ca3af";
    context.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
  }
  continue;
}
        if (tile === TileType.TRAP) context.fillStyle = "#7f1d1d";
        else if (tile === TileType.DOOR) context.fillStyle = "#92400e";
        else if (tile === TileType.SWITCH) context.fillStyle = "#eab308";
        else continue;

        context.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
      }
    }
  }

/* window.addEventListener("keydown", function (event) {
  console.log("Key detected:", event.key, event.code); */


let minimapVisible = true;
function drawMiniMap() {
  if (!minimapVisible) return;
  if (!gameState || !gameState.player) return;

  
  const map = gameState.map;
  if (!map || !map.length || !map[0].length) return;

  const mapWidth = map[0].length;
  const mapHeight = map.length;

  const minimapSize = 160;
  const padding = 12;
  const cellSize = Math.min(
    minimapSize / mapWidth,
    minimapSize / mapHeight
  );

  const width = mapWidth * cellSize;
  const height = mapHeight * cellSize;
  const offsetX = canvas.width + width + padding + 150;
  const offsetY = padding;

  context.save();


  // Only draw walkable tiles; walls stay transparent
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = map[y][x];
                  if (tile !== 1) continue;
      if (!gameState.explored.has(y * MAP_WIDTH + x)) continue;

      const x0 = offsetX + x * cellSize;
      const y0 = offsetY + y * cellSize;

      context.fillStyle = "#bebebe"; // background under the floor
      context.fillRect(x0, y0, cellSize + 1, cellSize + 1);
    }
  }

  const player = gameState.player;

  context.fillStyle = "#00ff66";
  context.beginPath();
  context.arc(
    offsetX + player.x * cellSize,
    offsetY + player.y * cellSize,
    Math.max(2, cellSize * 0.35),
    0,
    Math.PI * 2
  );
  context.fill();

  context.restore();
}

function drawChargeBar() {
  if (chargeStart === null || inventoryOpen) return;
  if (!gameState.armedScroll || gameState.player.hidden) return;

  const p = gameState.player;
  const t = Math.min(1, (performance.now() - chargeStart) / chargeTimeFor(gameState.armedScroll));
  const w = 20, h = 3;
  const x = Math.round(p.x * TILE_SIZE + (TILE_SIZE - w) / 2);
  const y = Math.round(p.y * TILE_SIZE - 4);

  context.fillStyle = "#000";
  context.fillRect(x - 1, y - 1, w + 2, h + 2);
  context.fillStyle =
    t >= 1 ? SCROLL_COLORS[gameState.armedScroll] || "#fff" : "#94a3b8";
  context.fillRect(x, y, Math.round(w * t), h);
}

  function drawProjectiles() {
    if (!gameState || !gameState.projectiles) return;

    for (const projectile of gameState.projectiles) {
      const centerX = projectile.x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = projectile.y * TILE_SIZE + TILE_SIZE / 2;
      context.fillStyle = projectile.color;
      context.beginPath();
      context.arc(centerX, centerY, projectile.scroll ? 4 :3, 0, Math.PI * 2);
      context.fill();
    }
  }

function drawItems(timestamp = performance.now()) {
  if (!gameState || !gameState.items) return;

  for (const item of gameState.items) {
    if (item.type === "trap") {
      drawTrap(item, timestamp);
      continue;
    }

    // Get the animation before using it
    const animation = ITEM_ANIMATIONS[item.idName];

    if (!animation || !animation.image) continue;

    if (
      !animation.image.complete ||
      animation.image.naturalWidth === 0
    ) {
      continue;
    }

    const worldScale = animation.worldScale ?? 1;

    const worldW = Math.round(animation.frameWidth * worldScale);
    const worldH = Math.round(animation.frameHeight * worldScale);

    const frame =
      animation.frames > 1
        ? Math.floor((timestamp / 1000) * ITEM_ANIMATION_FPS) %
          animation.frames
        : 0;

    const sourceX = frame * animation.frameWidth;
    const sourceY = 0;

    const bob = Math.round(Math.sin(timestamp / 400) * 2);

    const tileX = item.x * TILE_SIZE;
    const tileY = item.y * TILE_SIZE;

    const drawX = Math.floor(
      tileX + (TILE_SIZE - worldW) / 2
    );

    const drawY =
      Math.floor(tileY + TILE_SIZE - worldH - 10) - bob;

    context.imageSmoothingEnabled = false;
    context.shadowColor = "transparent";
    context.shadowBlur = 0;

    context.fillStyle = "rgba(0, 0, 0, 0.35)";
    context.fillRect(
      drawX + 2,
      tileY + TILE_SIZE - 6,
      Math.max(1, worldW - 4),
      2
    );

    context.drawImage(
      animation.image,
      sourceX,
      sourceY,
      animation.frameWidth,
      animation.frameHeight,
      drawX,
      drawY,
      worldW,
      worldH
    );
  }
}

  function drawContainers() {
    if (!gameState || !gameState.containers) return;
    for (const c of gameState.containers) {
      const px = c.x * TILE_SIZE;
      const py = c.y * TILE_SIZE;
      context.globalAlpha = c.searched ? 0.55 : 1;
      context.fillStyle = "#000";
      context.reillRect(px + 4, py + 6, TILE_SIZE - 8, TILE_SIZE - 10);
      context.fillStyle = CONTAINER_TYPES[c.type].color;
      context.fillRect(px + 5, py + 7, TILE_SIZE - 10, TILE_SIZE - 12);
      context.fillStyle = "rgba(0, 0, 0, 0.35)";
      context.fillRect(px + 5, py + 13, TILE_SIZE - 10, 2);
      context.globalAlpha = 1;
  }
}

function drawContainerText(text, cx ,y) {
  context.font = "12px monospace";
  context.textAlign = "center";
  context.textBadeline = "alphabetic";
  context.lineWidth = 3;
  context.strokeStyle = "#000";
  context.strokeText(text, cx, y);
  context.fillStyle = "#e2e8f0";
  context.fillText(text, cx, y);
}

function drawContainerPrompt() {
  if (!gameState || !gameState.containers || inventoryOpen) return;
  if (gameState.player.hidden) return;

  const now = performance.now();
  const near = getNearbyContainer();

  for (const c of gameState.containers) {
    const cx = c.x * TILE_SIZE + TILE_SIZE /2;
    const top = c.y * TILE_SIZE;
    
    if (c.message && now < c.messageUntil) {
      drawContainerText(c.message, cx, top - 8);
    } else if (searchState && searchState.container ===c) {
      const t = Math.min(1, (now - searchState) / CONTAINER_TYPES[c.type].searchMs);
      const w = 24, h = 4;
      const bx = Math.round(cx - w / 2);
      const by = Math.round(top - 8);
      context.fillStyle = "#000";
      context.fillRect(bx - 1, by -1, w + 2, h + 2);
      context.fillStyle = "#facc15";
      context.fillRect(bx, by, Math.round(w * t), h);
    } else if (c === near && !searchState) {
      drawContainerText(`E: search ${CONTAINER_TYPES[c.type].label}`, cx, top -8);
    }
  }
}


  function drawTrap(trap, now) {
    const cx = Math.round(trap.x * TILE_SIZE + TILE_SIZE / 2);
    const cy = Math.round(trap.y * TILE_SIZE + TILE_SIZE * 0.7);
    const sprung = now < trap.sprungUntil;

    context.fillStyle = "#18181b";
    context.fillRect(cx - 10, cy - 6, 20, 12);
    context.fillStyle = "#3f3f46";
    context.fillRect(cx - 9, cy - 5, 18, 10);

    const h = sprung ? 9 : 3;
    context.fillStyle = sprung ? "#ef4444" : "#a1a1aa";
    for (const ox of [-6, -1, 4]) {
      context.fillRect(cx + ox, cy - h + 2, 3, h);
    }
  }
    function drawPillars(front) {
    if (!gameState || !gameState.pillars) return;
    const feet = playerFeet();
    for (const pillar of gameState.pillars) {
      const pillarIsInFront = pillar.y + 0.9 > feet.y;
      if (pillarIsInFront === front) drawPillar(pillar);
    }
  }
function drawPillar(pillar) {
  if (!PILLAR_SPRITE.complete || PILLAR_SPRITE.naturalWidth === 0) return;

  const size = PILLAR_SRC_SIZE * PILLAR_DRAW_SCALE;

  // Centered horizontally on the tile, bottom edge on the tile's bottom edge.
  const dx = Math.round(pillar.x * TILE_SIZE + (TILE_SIZE - size) / 2);
  const dy = Math.round(pillar.y * TILE_SIZE + TILE_SIZE - size);

  context.imageSmoothingEnabled = false;
  context.drawImage(
    PILLAR_SPRITE,
    0,
    0,
    PILLAR_SRC_SIZE,
    PILLAR_SRC_SIZE,
    dx,
    dy,
    size,
    size
  );
}
  function drawGameOver() {
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    context.fillStyle = "#ef4444";
    context.font = "16px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("YOU DIED", DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2);
  }
  const PLAYER_FEET = { x: 0.5, y: 0.9 };

  function playerFeet() {
    const p = gameState.player;
    return { x: p.x + PLAYER_FEET.x, y: p.y + PLAYER_FEET.y };
  }
  function drawPlayer(timestamp) {
    if (!globalPlayer) return;
    const p = gameState.player;

    if (p.hidden) return;

    const gait = globalPlayer.gait || "walk";
    const isMoving =
      timestamp - (globalPlayer.lastMovedTime ?? -Infinity) < MOVE_GRACE_MS;

    const useRun = gait === "run" && isMoving;
    const sheet =
      gait === "sneak"
        ? PLAYER_SNEAK_SPRITE
        : useRun
        ? PLAYER_RUN_SPRITE
        : PLAYER_SPRITE;

    if (!sheet.complete || sheet.naturalWidth === 0) return;

    if (!isMoving) globalPlayer.walkDistance = 0;

    const pxPerFrame =
      gait === "sneak"
        ? PX_PER_SNEAK_FRAME
        : useRun
        ? PX_PER_RUN_FRAME
        : PX_PER_WALK_FRAME;

    const frameCount =
      gait === "sneak"
        ? SNEAK_FRAME_COUNT
        : useRun
        ? RUN_FRAME_COUNT
        : WALK_FRAME_COUNT;

    const hasIdleColumn =
      gait === "sneak"
        ? SNEAK_HAS_IDLE
        : useRun
        ? RUN_HAS_IDLE
        : WALK_HAS_IDLE;

    const animationFrame =
      Math.floor((globalPlayer.walkDistance || 0) / pxPerFrame) % frameCount;

    const sourceColumn = !isMoving
      ? 0
      : hasIdleColumn
      ? animationFrame + 1
      : animationFrame;

    const row =
      PLAYER_DIRECTION_ROWS[globalPlayer.direction || "down"] ?? 0;

    const frameW = useRun
      ? RUN_FRAME_W
      : gait === "sneak"
      ? SNEAK_FRAME_W
      : FRAME_W;

    const frameH = useRun
      ? RUN_FRAME_H
      : gait === "sneak"
      ? SNEAK_FRAME_H
      : FRAME_H;

    const sourceX = sourceColumn * frameW;
    const sourceY = row * frameH;

    const destW = useRun ? FRAME_W * RUN_DISPLAY_SCALE : FRAME_W;
    const destH = useRun ? FRAME_H * RUN_DISPLAY_SCALE : FRAME_H;

    const pixelX = Math.round(
      globalPlayer.x * TILE_SIZE + (TILE_SIZE - destW) / 2
    );

    const SNEAK_Y_OFFSET = 1;
    const gaitYOffset = useRun
      ? RUN_Y_OFFSET
      : gait === "sneak"
      ? SNEAK_Y_OFFSET
      : 0;

    const pixelY = Math.round(
      globalPlayer.y * TILE_SIZE + TILE_SIZE - destH + gaitYOffset
    );

    const drawX = Math.round(pixelX);
    const drawY = Math.round(pixelY);
    const drawW = Math.round(destW);
    const drawH = Math.round(destH);

    context.imageSmoothingEnabled = false;
    context.drawImage(
      sheet,
      Math.floor(sourceX),
      Math.floor(sourceY),
      Math.floor(frameW),
      Math.floor(frameH),
      drawX,
      drawY,
      drawW,
      drawH
    );
  }

  // ---------------------------------------------------------------------------
  // TRAPS
  // ---------------------------------------------------------------------------
  function damagePlayer(amount) {
    const p = gameState.player;
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp <= 0) gameState.gameOver = true;
  }

// Unit vector the entity is facing (enemies use `facing`, the player uses `direction`).
function facingVector(entity) {
  if (typeof entity.facing === "number") {
    return { x: Math.cos(entity.facing), y: Math.sin(entity.facing) };
  }
  const key = Object.keys(DIR_FROM_VECTOR).find(
    (k) => DIR_FROM_VECTOR[k] === entity.direction
  );
  if (!key) return { x: 0, y: 1 };
  const [vx, vy] = key.split(",").map(Number);
  const len = Math.hypot(vx, vy) || 1;
  return { x: vx / len, y: vy / len };
}

// KNOCKBACK
const MELEE_KNOCKBACK = 0.35;
const HIT_STUN_MS = 280;

function knockBoth(a, aHb, b, bHb, distance = MELEE_KNOCKBACK) {
  knockback(a, b.x, b.y, aHb, distance);
  knockback(b, a.x, a.y, bHb, distance);
}

function stunEnemy(e, now, ms = HIT_STUN_MS) {
  e.hitStunUntil = now + ms;
  e.steer = null;
  e.navTimer = 0;
}
function knockback(entity, fromX, fromY, hb, distance = TRAP_KNOCKBACK) {
  let ux = entity.x - fromX;
  let uy = entity.y - fromY;
  let len = Math.hypot(ux, uy);

  if (len < 0.01) {
    // Dead centre on the trap: push backwards from where they were facing.
    const f = facingVector(entity);
    ux = -f.x;
    uy = -f.y;
    len = Math.hypot(ux, uy) || 1;
  }
  ux /= len;
  uy /= len;

  const steps = 5;
  const step = distance / steps;
  for (let i = 0; i < steps; i++) {
    tryMove(entity, ux * step, uy * step, hb);
  }
}

function updateTraps(timestamp) {
  if (!gameState || !gameState.items || !gameState.player) return;
  if (gameState.gameOver) return;

  const p = gameState.player;
  const enemies = gameState.enemies || [];

  for (const item of gameState.items) {
    if (item.type !== "trap") continue;
    if (timestamp < item.sprungUntil) continue;

    const playerHit =
      Math.hypot(p.x - item.x, p.y - item.y) < TRAP_TRIGGER_RADIUS;
    const enemiesHit = enemies.filter(
      (e) => Math.hypot(e.x - item.x, e.y - item.y) < TRAP_TRIGGER_RADIUS
    );
    if (!playerHit && enemiesHit.length === 0) continue;

    item.sprungUntil = timestamp + TRAP_REARM_MS;

    if (playerHit) {
      damagePlayer(TRAP_DAMAGE);
      knockback(p, item.x, item.y, HITBOX);
    }

    for (const e of enemiesHit) {
      e.hp -= TRAP_ENEMY_DAMAGE;
      if (e.hp <= 0) {
        enemies.splice(enemies.indexOf(e), 1);
        continue;
      }
      knockback(e, item.x, item.y, ENEMY_HITBOX);
      e.steer = null;
      e.navTimer = 0;
    }

    makeNoise(item.x, item.y, TRAP_NOISE_RADIUS, "#ef4444");
  }
}

  // ---------------------------------------------------------------------------
  // ENEMY AI
  // ---------------------------------------------------------------------------
  function isPlayerInLight() {
    return false;
  }

  function enemyCenter(e) {
    return { x: e.x + 0.5, y: e.y + 0.5 };
  }

  function playerCenter() {
    const p = gameState.player;
    return { x: p.x + 0.5, y: p.y + 0.7 };
  }

    function isWallAt(x, y, ignoreDoors = false) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
    if (gameState.map[ty][tx] === TileType.WALL) return true;
    return !ignoreDoors && isDoorClosedAt(tx, ty);
  }

  function castRay(x, y, angle, maxDist, ignoreDoors = false) {
    const step = 0.1;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let d = step; d <= maxDist; d += step) {
      if (isWallAt(x + cos * d, y + sin * d, ignoreDoors)) return d - step;
    }
    return maxDist;
  }

  function hasLineOfSight(ax, ay, bx, by, ignoreDoors = false) {
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return true;
    return castRay(ax, ay, Math.atan2(dy, dx), dist, ignoreDoors) >= dist - 0.001;
  }

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function turnToward(e, targetAngle, dt) {
    const d = angleDiff(targetAngle, e.facing);
    const maxTurn = ENEMY_TURN_SPEED * dt;
    e.facing += Math.abs(d) <= maxTurn ? d : Math.sign(d) * maxTurn;
  }

  function lookAround(e, now) {
  e.facing =
    e.baseFacing +
    Math.sin(now / 450 + (e.lookPhase ?? 0)) * (e.lookSweep ?? 0.9);
}

function findPath(sx, sy, gx, gy, avoidTraps = false, passDoors = false) {
  if (!isNavTile(gx, gy, avoidTraps) || !isWalkableTile(sx, sy)) return null;
  if (sx === gx && sy === gy) return [];

  const key = (x, y) => y * MAP_WIDTH + x;
  const startKey = key(sx, sy);
  const prev = new Map([[startKey, -1]]);
  const queue = [[sx, sy]];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (!isNavTile(nx, ny, avoidTraps) || prev.has(k)) continue;
      if (!passDoors && isDoorClosedAt(nx, ny)) continue;
      prev.set(k, key(x, y));

      if (nx === gx && ny === gy) {
        const path = [];
        let cur = k;
        while (cur !== startKey) {
          path.push({ x: cur % MAP_WIDTH, y: Math.floor(cur / MAP_WIDTH) });
          cur = prev.get(cur);
        }
        return path.reverse();
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}

// If the goal sits on a trap, pick the closest non-trap tile nearby.
function nearestSafeGoal(gx, gy) {
  const tx = Math.floor(gx + 0.5);
  const ty = Math.floor(gy + 0.5);
  if (!gameState.trapTiles.has(ty * MAP_WIDTH + tx)) return { x: gx, y: gy };

  let best = null;
  let bestDist = Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!isNavTile(nx, ny, true)) continue;
      const d = Math.hypot(nx - gx, ny - gy);
      if (d < bestDist) {
        bestDist = d;
        best = { x: nx, y: ny };
      }
    }
  }
  return best || { x: gx, y: gy };
}
// Enemies only ignore traps while alert AND actually looking at the player.
// An alert enemy that lost sight (searching, or player hiding) still avoids them.
function enemyAvoidsTraps(e) {
  return !(e.state === "alert" && e.canSeePlayer);
}
function planSteer(e, gx, gy) {
  const avoid = enemyAvoidsTraps(e);

  if (isSegmentClear(e.x, e.y, gx, gy, ENEMY_HITBOX, avoid)) {
    return { x: gx, y: gy, isGoal: true };
  }

  const path = findPath(
    Math.floor(e.x + 0.5),
    Math.floor(e.y + 0.5),
    Math.floor(gx + 0.5),
    Math.floor(gy + 0.5),
    avoid
  );
  if (!path || path.length === 0) {
    return { x: gx, y: gy, isGoal: true };
  }

  let best = path[0];
  let foundClear = false;
  const limit = Math.min(path.length, 16);
  for (let i = 0; i < limit; i++) {
    if (isSegmentClear(e.x, e.y, path[i].x, path[i].y, ENEMY_HITBOX, avoid)) {
      best = path[i];
      foundClear = true;
    } else if (foundClear) {
      break;
    }
  }
  return { x: best.x, y: best.y, isGoal: false };
}

function steerToward(
  e,
  gx,
  gy,
  speed,
  dt,
  arriveDist = ENEMY_ARRIVE_DIST,
  faceMovement = true
) {
  const avoid = enemyAvoidsTraps(e);
  if (avoid) {
    const safe = nearestSafeGoal(gx, gy);
    gx = safe.x;
    gy = safe.y;
  }

  if (Math.hypot(gx - e.x, gy - e.y) <= arriveDist) {
    e.steer = null;
    return true;
  }

  e.navTimer -= dt * 1000;
  const goalMoved =
    !e.navGoal || Math.hypot(e.navGoal.x - gx, e.navGoal.y - gy) > 1;

  if (!e.steer || e.navTimer <= 0 || goalMoved) {
    e.steer = planSteer(e, gx, gy);
    e.navGoal = { x: gx, y: gy };
    e.navTimer = NAV_REPLAN_MS;
  } else if (e.steer.isGoal) {
    e.steer.x = gx;
    e.steer.y = gy;
  }

  const dx = e.steer.x - e.x;
  const dy = e.steer.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) {
    e.navTimer = 0;
    return false;
  }

  if (faceMovement) turnToward(e, Math.atan2(dy, dx), dt);

  const step = Math.min(speed * dt, d);
  if (step > 0) {
    const moved = tryMove(
      e,
      (dx / d) * step,
      (dy / d) * step,
      ENEMY_HITBOX,
      avoid
    );
    if (moved < step * 0.25) e.navTimer = 0;
  }
  return false;
}

  function alertEnemy(e, now) {
    const p = gameState.player;
    e.state = "alert";
    e.suspicion = 1;
    e.canSeePlayer = true;
    e.lastSeen = { x: p.x, y: p.y };
    e.lastSeenTime = now;
    e.arrived = false;
    e.searching = false;
    e.hideSearchTimer = HIDE_SEARCH_MS;
    e.steer = null;
  }

  function startInvestigating(e, x, y) {
  e.state = "curious";
  e.investigate = { x, y };
  e.arrived = false;
  e.waitTimer = 0;
  e.hideSearchTimer = 0;
  e.steer = null;
  e.investigateTime = 0;
  noteSuspicionAtSpot(e, x, y);   // <-- new
}

  // Counts how often this enemy has been drawn to the same hiding spot.
function noteSuspicionAtSpot(e, x, y) {
  let spot = null;
  let best = HIDE_SUSPECT_RADIUS;
  for (const s of hidingSpots) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= best) {
      best = d;
      spot = s;
    }
  }
  if (!spot) return;

  const now = performance.now();
  spot.suspects ??= new Map();
  const rec = spot.suspects.get(e.id) ?? { count: 0, last: -Infinity };

  if (now - rec.last < HIDE_SUSPECT_COOLDOWN_MS) return;
  rec.count++;
  rec.last = now;
  spot.suspects.set(e.id, rec);

  if (rec.count >= HIDE_SUSPECT_LIMIT) {
    rec.count = 0;
    e.smashSpot = spot;
    e.smashForced = true;               // smash it even if the player is inside
    e.breakTimer = null;
    e.investigate = { x: spot.x, y: spot.y };
  }
}

    function pickSearchPoints(cx, cy, room = null) {
    const tx = Math.floor(cx + 0.5);
    const ty = Math.floor(cy + 0.5);
    const candidates = [];

    if (room) {
      // Door search: sweep the room the player ducked into.
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (Math.hypot(x - tx, y - ty) < 1.5) continue;
          candidates.push({ x, y });
        }
      }
    } else {
      for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
        for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
          const d = Math.hypot(dx, dy);
          if (d < 1.5 || d > SEARCH_RADIUS) continue;
          if (!isWalkableTile(tx + dx, ty + dy)) continue;
          candidates.push({ x: tx + dx, y: ty + dy });
        }
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const count = room ? 4 : SEARCH_POINT_COUNT;
    const points = [];
    for (const c of candidates) {
      if (points.length >= count) break;
      if (findPath(tx, ty, c.x, c.y)) points.push(c);
    }
    return points;
  }
function roomAtPoint(x, y) {
  const tx = Math.floor(x + 0.5);
  const ty = Math.floor(y + 0.5);
  return (
    gameState.rooms.find(
      (r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h
    ) || null
  );
}

// Called once when an enemy starts searching. Only the first enemy to search
// a room within the cooldown gets to roll, so a room loses at most one spot.
function rollHidingSpotSmash(e, room) {
  if (e.smashSpot) return; // already has a plan (e.g. from repeated suspicion)
  if (!room) return;

  const now = performance.now();
  if (now < (room.hideRollUntil ?? 0)) return;
  room.hideRollUntil = now + HIDE_ROOM_ROLL_COOLDOWN_MS;

  if (Math.random() >= HIDE_SMASH_CHANCE) return;

  const spots = hidingSpots.filter((s) => s.room === room && !s.occupied);
  if (spots.length === 0) return;
  e.smashSpot = spots[Math.floor(Math.random() * spots.length)];
  e.smashForced = false;
}

// Walk to the chosen spot and smash it. Returns true while still busy.
function updateSmashSpot(e, dt) {
  const spot = e.smashSpot;
  if (!spot) return false;

  // Already destroyed, or the player is inside and this wasn't a forced smash.
  if (!hidingSpots.includes(spot) || (spot.occupied && !e.smashForced)) {
    e.smashSpot = null;
    e.smashForced = false;
    e.breakTimer = null;
    return false;
  }

  const arrived = steerToward(
    e,
    spot.x,
    spot.y,
    ENEMY_SPEED.curious,
    dt,
    HIDE_ATTACK_REACH
  );
  if (!arrived) return true;

  e.breakTimer ??= HIDE_BREAK_DELAY_MS;
  e.breakTimer -= dt * 1000;
  turnToward(e, Math.atan2(spot.y - e.y, spot.x - e.x), dt);

  if (e.breakTimer <= 0) {
    e.breakTimer = null;
    e.smashSpot = null;
    breakHidingSpot(spot);
    return false;
  }
  return true;
}


  
  function beginSearch(e) {
    const room = e.searchRoom || roomAtPoint(e.lastSeen.x, e.lastSeen.y);
    rollHidingSpotSmash(e, room);
    e.searching = true;
    e.baseFacing = e.facing;
    e.searchWait = SEARCH_WAIT_MS;
    e.searchIndex = 0;
    e.searchPoints = pickSearchPoints(e.lastSeen.x, e.lastSeen.y, e.searchRoom);
    e.searchRoom = null;
  }

  function updateSearch(e, dt, now) {
    if (e.searchWait > 0) {
      e.searchWait -= dt * 1000;
      lookAround(e, now);
      return;
    }

    const target = e.searchPoints[e.searchIndex];

    if (!target) {
        if (updateSmashSpot(e, dt)) return; // still walking to / smashing the spot

      e.searching = false;
      e.state = "patrol";
      e.suspicion = Math.min(e.suspicion, 0.3);
      e.waitTimer = 0;
      e.steer = null;
      return;
    }

    if (steerToward(e, target.x, target.y, ENEMY_SPEED.curious, dt, 0.3)) {
      e.searchIndex++;
      e.searchWait = SEARCH_WAIT_MS;
      e.baseFacing = e.facing;
    }
  }


const ENEMY_MELEE_DAMAGE = 10;
const ENEMY_MELEE_INTERVAL_MS = 2000;
const ENEMY_MELEE_REACH = 1;

function bodyDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function onEnemyReachedPlayer(e, now) {
  const p = gameState.player;
  if (p.hidden || gameState.gameOver) return;
  if (now < (e.nextMeleeTime ?? 0)) return;

  e.nextMeleeTime = now + ENEMY_MELEE_INTERVAL_MS;
  damagePlayer(ENEMY_MELEE_DAMAGE);
  knockBoth(p, HITBOX, e, ENEMY_HITBOX);
  stunEnemy(e, now);
}
  function updateEnemies(timestamp) {
    const dt =
      lastEnemyTime === null
        ? 0
        : Math.min((timestamp - lastEnemyTime) / 1000, 0.05);
    lastEnemyTime = timestamp;

    if (!gameState || !gameState.enemies || !gameState.player) return;
    if (gameState.gameOver) return;

        for (const e of gameState.enemies.slice()) {
      if (e.frozenUntil > timestamp) continue; // frozen: no AI, no movement
      updateEnemyAI(e, dt, timestamp);
    }
  }

  function updateEnemyAI(e, dt, now) {
  if (now < (e.hitStunUntil ?? 0)) return;
    const p = gameState.player;
    const ec = enemyCenter(e);
    const pc = playerCenter();
    const dist = Math.hypot(pc.x - ec.x, pc.y - ec.y);
    const angleToPlayer = Math.atan2(pc.y - ec.y, pc.x - ec.x);
    const playerHidden = p.hidden === true;

    e.canSeePlayer = false;
    let seenOuter = false;

    const sightRange =
      e.state === "alert" ? ALERT_SIGHT_RANGE : ENEMY_OUTER_RANGE;

    if (
      !playerHidden &&
      dist <= sightRange &&
      hasLineOfSight(ec.x, ec.y, pc.x, pc.y)
    ) {
      const diff = Math.abs(angleDiff(angleToPlayer, e.facing));

      if (e.state === "alert") {
        e.canSeePlayer = true;
      } else if (
        dist <= ENEMY_INNER_RANGE &&
        diff <= ENEMY_INNER_HALF_ANGLE
      ) {
        alertEnemy(e, now);
      } else if (diff <= ENEMY_OUTER_HALF_ANGLE && isPlayerExposed(now)) {
        seenOuter = true;
      }
    }

    if (e.state !== "alert") {
      if (seenOuter) {
        const closeness = Math.min(
          1,
          Math.max(
            0,
            1 -
              (dist - ENEMY_INNER_RANGE) /
                (ENEMY_OUTER_RANGE - ENEMY_INNER_RANGE)
          )
        );
        const rate =
          SUSPICION_FILL_FAR +
          closeness * (SUSPICION_FILL_NEAR - SUSPICION_FILL_FAR);
        e.suspicion = Math.min(1, e.suspicion + rate * dt);

        if (e.suspicion >= 1) {
          alertEnemy(e, now);
        } else if (
          e.state === "patrol" &&
          e.suspicion >= CURIOUS_THRESHOLD
        ) {
          startInvestigating(e, p.x, p.y);
        } else if (
          e.state === "curious" &&
          (!e.investigate ||
            Math.hypot(e.investigate.x - p.x, e.investigate.y - p.y) > 0.5)
        ) {
          e.investigate = { x: p.x, y: p.y };
          e.arrived = false;
        }
      } else {
        e.suspicion = Math.max(0, e.suspicion - SUSPICION_DECAY * dt);
      }
    }

    if (e.state === "alert") {
      if (e.canSeePlayer) {
        e.searchRoom = null;
        e.lastSeen = { x: p.x, y: p.y };
        e.lastSeenTime = now;
        turnToward(e, angleToPlayer, dt);
      }

      if (p.hidden && p.hidingSpot && e.attackSpot === p.hidingSpot) {
        e.lastSeenTime = now;
        const spot = p.hidingSpot;
        const arrived = steerToward(
          e,
          spot.x,
          spot.y,
          ENEMY_SPEED.alert,
          dt,
          HIDE_ATTACK_REACH
        );

        if (arrived) {
          e.breakTimer ??= HIDE_BREAK_DELAY_MS;
          e.breakTimer -= dt * 1000;
          turnToward(e, Math.atan2(spot.y - e.y, spot.x - e.x), dt);

          if (e.breakTimer <= 0) {
            e.breakTimer = null;
            breakHidingSpot(spot);
          }
        }
        return;
      }
      // Bash down a door the player closed in front of us.
      if (e.doorTarget) {
        const door = e.doorTarget;
        const stillThere =
          gameState.doorMap.get(door.y * MAP_WIDTH + door.x) === door;

        if (!stillThere) {
          // Broken: go in and search the room the player ducked into.
          e.doorTarget = null;
          e.searchRoom = e.doorRoom;
          e.doorRoom = null;
          e.lastSeenTime = now;
          e.steer = null;
        } else if (door.open || e.canSeePlayer) {
          e.doorTarget = null; // player reopened it, or we can see them again
        } else {
          e.lastSeenTime = now; // don't lose interest while bashing

          const dcx = door.x + 0.5;
          const dcy = door.y + 0.5;
          if (Math.hypot(dcx - ec.x, dcy - ec.y) <= DOOR_ATTACK_REACH) {
            turnToward(e, Math.atan2(dcy - ec.y, dcx - ec.x), dt);
            e.doorHitTimer ??= ENEMY_DOOR_HIT_INTERVAL_MS;
            e.doorHitTimer -= dt * 1000;
            if (e.doorHitTimer <= 0) {
              e.doorHitTimer = ENEMY_DOOR_HIT_INTERVAL_MS;
              hitDoor(door, ENEMY_DOOR_DAMAGE);
            }
          } else {
            const spot = doorApproachPoint(door, e);
            steerToward(e, spot.x, spot.y, ENEMY_SPEED.alert, dt, 0.2);
          }
          return;
        }
      }
      if (e.canSeePlayer && bodyDist(e, p) <= ENEMY_MELEE_REACH) {
  onEnemyReachedPlayer(e, now);
}

if (e.searching && !e.canSeePlayer) {
  updateSearch(e, dt, now);
} else {
        e.searching = false;

        const arrived = steerToward(
          e,
          e.lastSeen.x,
          e.lastSeen.y,
          ENEMY_SPEED.alert,
          dt,
          Math.max(ENEMY_ARRIVE_DIST, ENEMY_MELEE_REACH * 0.6),
          !e.canSeePlayer
        );

        if (arrived && !e.canSeePlayer) beginSearch(e);
      }
      if (
        !e.canSeePlayer &&
        !e.searching &&
        now - e.lastSeenTime > ALERT_LOSE_TIME
      ) {
        startInvestigating(e, e.lastSeen.x, e.lastSeen.y);
        e.suspicion = 0.6;
      }
    } else if (e.state === "curious") {
    if (e.smashSpot) {
      if (updateSmashSpot(e, dt)) return;

      e.state = "patrol";
      e.suspicion = Math.min(e.suspicion, 0.2);
      e.waitTimer = 0;
      e.steer = null;
      return;
    }

    if (e.investigate) {
      if (
        steerToward(
          e,
          e.investigate.x,
          e.investigate.y,
          ENEMY_SPEED.curious,
          dt,
          0.3
        )
      ) {
        e.arrived = true;
        e.waitTimer = CURIOUS_WAIT_MS;
        e.baseFacing = e.facing;
        e.investigate = null;
      }
    } else {
      e.waitTimer -= dt * 1000;
      lookAround(e, now);

      if (e.waitTimer <= 0) {
        e.state = "patrol";
        e.suspicion = Math.min(e.suspicion, 0.2);
        e.waitTimer = 0;
        e.steer = null;
      }
    }

  } else {
    // patrol
    if (e.waitTimer > 0) {
      e.waitTimer -= dt * 1000;
      lookAround(e, now);
    } else {
      const wp = e.patrol[e.patrolIndex];

      if (steerToward(e, wp.x, wp.y, ENEMY_SPEED.patrol, dt)) {
        e.patrolIndex =
          (e.patrolIndex + 1) % e.patrol.length;

        e.waitTimer = wp.wait ?? PATROL_WAIT_MS;
        e.baseFacing = e.holdFacing ?? e.facing;
      }
    }
  }
};

  function drawVisionCone(e, range, halfAngle, fill) {
    const c = enemyCenter(e);
    const steps = 20;

    context.beginPath();
    context.moveTo(c.x * TILE_SIZE, c.y * TILE_SIZE);
    for (let i = 0; i <= steps; i++) {
      const a = e.facing - halfAngle + (2 * halfAngle * i) / steps;
      const d = castRay(c.x, c.y, a, range);
      context.lineTo(
        (c.x + Math.cos(a) * d) * TILE_SIZE,
        (c.y + Math.sin(a) * d) * TILE_SIZE
      );
    }
    context.closePath();
    context.fillStyle = fill;
    context.fill();
  }

  function drawVisionCones() {
    if (!SHOW_VISION_CONES || !gameState || !gameState.enemies) return;

    for (const e of gameState.enemies) {
      let outer = "rgba(250, 204, 21, 0.10)";
      let inner = "rgba(239, 68, 68, 0.16)";
      if (e.state === "curious") {
        outer = "rgba(250, 204, 21, 0.20)";
      } else if (e.state === "alert") {
        outer = "rgba(239, 68, 68, 0.18)";
        inner = "rgba(239, 68, 68, 0.30)";
      }
      drawVisionCone(e, ENEMY_OUTER_RANGE, ENEMY_OUTER_HALF_ANGLE, outer);
      drawVisionCone(e, ENEMY_INNER_RANGE, ENEMY_INNER_HALF_ANGLE, inner);
    }
  }

  const ICON_EXCLAIM = ["111", "111", "111", "111", "010", "000", "010"];
  const ICON_QUESTION = [
    "01110",
    "10001",
    "00001",
    "00110",
    "00100",
    "00000",
    "00100",
  ];
  const ICON_Z = ["11111", "00010", "00100", "01000", "11111"];

  function drawBitmap(rows, px, py, scale) {
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] === "1") {
          context.fillRect(px + c * scale, py + r * scale, scale, scale);
        }
      }
    }
  }

  function drawPixelIcon(rows, px, py, scale, color) {
    context.fillStyle = "#000";
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      drawBitmap(rows, px + ox, py + oy, scale);
    }
    context.fillStyle = color;
    drawBitmap(rows, px, py, scale);
  }

  function drawEnemyStateIcon(enemy, px, py, now) {
    const cx = px + TILE_SIZE / 2;

    if (enemy.state === "alert") {
      const bob = Math.round(Math.sin(now / 90));
      drawPixelIcon(ICON_EXCLAIM, cx - 3, py - 20 + bob, 2, "#ef4444");
    } else if (enemy.state === "curious") {
      drawPixelIcon(ICON_QUESTION, cx - 5, py - 20, 2, "#facc15");
    } else {
      drawPixelIcon(ICON_Z, cx - 7, py - 16, 2, "#93c5fd");
      drawPixelIcon(ICON_Z, cx + 4, py - 22, 1, "#bfdbfe");
    }

    if (enemy.state !== "alert" && enemy.suspicion > 0.02) {
      context.fillStyle = "#000";
      context.fillRect(cx - 9, py - 4, 18, 4);
      context.fillStyle =
        enemy.suspicion >= CURIOUS_THRESHOLD ? "#f59e0b" : "#facc15";
      context.fillRect(cx - 8, py - 3, Math.round(16 * enemy.suspicion), 2);
    }
  }

  function drawEnemies() {
    const now = performance.now();

    for (const enemy of gameState.enemies || []) {
      const px = Math.round(enemy.x * TILE_SIZE);
      const py = Math.round(enemy.y * TILE_SIZE);

      let body = enemy.color || "#ef4444";
      if (enemy.state === "curious") body = "#f59e0b";
      else if (enemy.state === "alert") body = "#b91c1c";
      if (enemy.frozenUntil > now) body = "#7dd3fc";

      context.fillStyle = body;
      context.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      const eyeX = Math.round(
        px + TILE_SIZE / 2 + Math.cos(enemy.facing) * 8
      );
      const eyeY = Math.round(
        py + TILE_SIZE / 2 + Math.sin(enemy.facing) * 8
      );
      context.fillStyle = "#fff";
      context.fillRect(eyeX - 2, eyeY - 2, 4, 4);

      drawEnemyStateIcon(enemy, px, py, now);
    }
  }

  // ---------------------------------------------------------------------------
  // HIDING
  // ---------------------------------------------------------------------------
  function isPlayerExposed(now) {
    const p = gameState.player;
    if (p.hidden) return false;
    const moving =
      now - (p.lastMovedTime ?? -Infinity) < PLAYER_EXPOSED_MS;
    return moving || isPlayerInLight();
  }

  function distanceToHidingSpot(spot) {
    const p = playerCenter();
    return Math.hypot(spot.x + 0.5 - p.x, spot.y + 0.5 - p.y);
  }

  function getNearbyHidingSpot() {
    return hidingSpots.find(
      (spot) =>
        !spot.occupied && distanceToHidingSpot(spot) <= HIDE_INTERACT_DIST
    );
  }

  function placeHidingSpots(rooms, map) {
    hidingSpots.length = 0;

    const isFloor = (x, y) =>
      x >= 0 &&
      x < MAP_WIDTH &&
      y >= 0 &&
      y < MAP_HEIGHT &&
      map[y][x] === TileType.FLOOR;

    for (const room of rooms) {
      const candidates = [];

      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          const onLeft = x === room.x;
          const onRight = x === room.x + room.w - 1;
          const onTop = y === room.y;
          const onBottom = y === room.y + room.h - 1;

          const edgeCount = onLeft + onRight + onTop + onBottom;
          if (edgeCount !== 1) continue;

          const ox = x + (onLeft ? -1 : onRight ? 1 : 0);
          const oy = y + (onTop ? -1 : onBottom ? 1 : 0);
          if (isFloor(ox, oy)) continue;

          candidates.push({ x, y });
        }
      }

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      const chosen = [];
for (const c of candidates) {
  if (chosen.length >= HIDE_SPOTS_PER_ROOM) break;
  if (chosen.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 2)) continue;
  chosen.push(c);
}

for (const c of chosen) {
  hidingSpots.push({
    x: c.x,
    y: c.y,
    room,
    type: HIDE_SPOT_TYPES[
      Math.floor(Math.random() * HIDE_SPOT_TYPES.length)
    ],
    occupied: false,
  });
}
    }
  }

  function isPlayerInCoreCone(e) {
    const ec = enemyCenter(e);
    const pc = playerCenter();
    const dist = Math.hypot(pc.x - ec.x, pc.y - ec.y);
    if (dist > ENEMY_INNER_RANGE) return false;

    const angleToPlayer = Math.atan2(pc.y - ec.y, pc.x - ec.x);
    if (
      Math.abs(angleDiff(angleToPlayer, e.facing)) > ENEMY_INNER_HALF_ANGLE
    ) {
      return false;
    }
    return hasLineOfSight(ec.x, ec.y, pc.x, pc.y);
  }

  function breakHidingSpot(spot) {
    const p = gameState.player;

    const idx = hidingSpots.indexOf(spot);
    if (idx !== -1) hidingSpots.splice(idx, 1);
    spot.occupied = false;

    if (p.hidingSpot === spot) {
      p.hidden = false;
      p.hidingSpot = null;
      p.lastMovedTime = performance.now();
    }

    for (const e of gameState.enemies) {
      if (e.attackSpot === spot) e.attackSpot = null;
    }

    makeNoise(spot.x, spot.y, HIDE_BREAK_NOISE_RADIUS, "#ef4444");
  }

  function toggleHide() {
    if (!gameState || !gameState.player) return;
    const p = gameState.player;

    if (p.hidden) {
      leaveHidingSpot();
      return;
    }

    const spot = getNearbyHidingSpot();
    if (!spot) return;

    const witnesses = gameState.enemies.filter(isPlayerInCoreCone);

    for (const e of gameState.enemies) {
      e.attackSpot = null;
      e.breakTimer = null;
    }

    p.hidden = true;
    p.hidingSpot = spot;
    p.lastMovedTime = -Infinity;
    spot.occupied = true;

    p.x = spot.x;
    p.y = spot.y;

    for (const e of witnesses) {
      alertEnemy(e, performance.now());
      e.lastSeen = { x: spot.x, y: spot.y };
      e.attackSpot = spot;
    }
  }

  function leaveHidingSpot() {
    const p = gameState.player;
    if (!p.hidden) return;

    if (p.hidingSpot) {
      p.hidingSpot.occupied = false;
      for (const e of gameState.enemies) {
        if (e.attackSpot === p.hidingSpot) {
          e.attackSpot = null;
          e.breakTimer = null;
        }
      }
    }

    p.hidden = false;
    p.hidingSpot = null;
    p.lastMovedTime = performance.now();
  }

  function drawHidingSpots() {
    for (const spot of hidingSpots) {
      const px = spot.x * TILE_SIZE;
      const py = spot.y * TILE_SIZE;

      context.fillStyle = spot.occupied ? "#1e293b" : HIDE_SPOT_COLOR;
      context.fillRect(px + 5, py + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    }
  }

   function drawHidePrompt() {
    if (!gameState || !gameState.player || inventoryOpen) return;
    const p = gameState.player;

    context.font = "12px monospace";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = "#e2e8f0";

    if (p.hidden) {
      context.fillText("E: Exit", p.x * TILE_SIZE, p.y * TILE_SIZE - 8);
      return;
    }

    const spot = getNearbyHidingSpot();
    if (spot) {
      context.fillText("E: Hide", spot.x * TILE_SIZE, spot.y * TILE_SIZE - 8);
      return;
    }

    const door = getNearbyDoor();
    if (door) {
      context.fillText(
        door.open ? "E: Close" : "E: Open",
        door.x * TILE_SIZE,
        door.y * TILE_SIZE - 8
      );
    }
  }

// ---------------------------------------------------------------------------
// DOORS
// ---------------------------------------------------------------------------
const BROKEN_DOOR_CHANCE = 0.75; // chance a door is already broken when the level is made
  
function drawDoors(timestamp) {
  if (!gameState || !gameState.doors) return;

  for (const door of gameState.doors) {
    const px = door.x * TILE_SIZE;
    const py = door.y * TILE_SIZE;
    const t = Math.round(DOOR_THICKNESS * TILE_SIZE);
    const flash = timestamp < door.flashUntil;
    const east = door.dir === "h"; // passage runs east-west

    if (door.open) {
      // Swung back against the passage wall.
      context.fillStyle = "#78350f";
      if (east) context.fillRect(px, py + 1, TILE_SIZE, 4);
      else context.fillRect(px + 1, py, 4, TILE_SIZE);
      continue;
    }

    const x = east ? px + Math.round((TILE_SIZE - t) / 2) : px;
    const y = east ? py : py + Math.round((TILE_SIZE - t) / 2);
    const w = east ? t : TILE_SIZE;
    const h = east ? TILE_SIZE : t;

    context.fillStyle = "#000";
    context.fillRect(x - 1, y - 1, w + 2, h + 2);
    context.fillStyle = flash ? "#fef3c7" : "#92400e";
    context.fillRect(x, y, w, h);

    // Damage bar once it's been hit.
    if (door.hp < door.maxHp) {
      const bw = TILE_SIZE - 8;
      const bx = px + 4;
      const by = py - 4;
      context.fillStyle = "#000";
      context.fillRect(bx - 1, by - 1, bw + 2, 4);
      context.fillStyle = "#ef4444";
      context.fillRect(bx, by, Math.round(bw * (door.hp / door.maxHp)), 2);
    }
  }
}

  // ---------------------------------------------------------------------------
// BROKEN DOOR ART (placeholder)
// ---------------------------------------------------------------------------
function drawBrokenDoors() {
  if (!gameState || !gameState.brokenDoors) return;

  for (const door of gameState.brokenDoors) {
    drawBrokenDoorSprite(door, door.x * TILE_SIZE, door.y * TILE_SIZE);
  }
}

// REPLACE THIS with a drawImage call once you have a sprite.
// (px, py) is the top-left pixel of the door's tile; door.dir is "h" or "v".
// Example later:
//   context.drawImage(BROKEN_DOOR_SPRITE, 0, door.dir === "h" ? 0 : 32, 32, 32, px, py, 32, 32);
function drawBrokenDoorSprite(door, px, py) {
  const east = door.dir === "h"; // passage runs east-west

  // Splintered planks scattered across the doorway (fixed, so it doesn't flicker).
  const planks = east
    ? [[13, 3, 3, 9], [17, 14, 4, 7], [12, 23, 3, 6], [20, 6, 2, 5]]
    : [[3, 13, 9, 3], [14, 17, 7, 4], [23, 12, 6, 3], [6, 20, 5, 2]];

  for (const [ox, oy, w, h] of planks) {
    context.fillStyle = "#000";
    context.fillRect(px + ox - 1, py + oy - 1, w + 2, h + 2);
    context.fillStyle = "#78350f";
    context.fillRect(px + ox, py + oy, w, h);
  }

  // Bent hinge stub on the door frame.
  context.fillStyle = "#71717a";
  if (east) context.fillRect(px + 14, py, 4, 3);
  else context.fillRect(px, py + 14, 3, 4);
}
  
  function isDoorClosedAt(tx, ty) {
  if (!gameState || !gameState.doorMap) return false;

  const door = gameState.doorMap.get(ty * MAP_WIDTH + tx);
  return !!door && !door.open;
}

function getNearbyDoor() {
  if (!gameState || !gameState.doors) return null;

  const pc = playerCenter();
  let closestDoor = null;
  let closestDistance = DOOR_INTERACT_DIST;

  for (const door of gameState.doors) {
    const doorCenterX = door.x + 0.5;
    const doorCenterY = door.y + 0.5;

    const distance = Math.hypot(
      doorCenterX - pc.x,
      doorCenterY - pc.y
    );

    if (distance <= closestDistance) {
      closestDoor = door;
      closestDistance = distance;
    }
  }

  return closestDoor;
}

function breakDoor(door) {
  const index = gameState.doors.indexOf(door);
  if (index !== -1) gameState.doors.splice(index, 1);

  gameState.doorMap.delete(door.y * MAP_WIDTH + door.x);

  door.hp = 0;
  door.open = true;
  (gameState.brokenDoors ||= []).push(door);

  makeNoise(door.x, door.y, DOOR_BREAK_NOISE_RADIUS, "#ef4444");
}

function hitDoor(door, damage) {
  if (!door || door.open) return;

  door.hp -= damage;
  door.flashUntil = performance.now() + 120;

  if (door.hp <= 0) {
    breakDoor(door);
  }
}

// Returns the room on the opposite side of the door
// relative to the supplied side direction.
function roomBeyondDoor(door, sideX, sideY) {
  for (let step = 1; step <= 3; step++) {
    const tx = door.x + sideX * step;
    const ty = door.y + sideY * step;

    const room = gameState.rooms.find((room) => {
      return (
        tx >= room.x &&
        tx < room.x + room.w &&
        ty >= room.y &&
        ty < room.y + room.h
      );
    });

    if (room) return room;
  }

  return null;
}

// ---------------------------------------------------------------------------
// DOOR COLLISION
// ---------------------------------------------------------------------------
const DOOR_THICKNESS = 0.1; // tiles

// Thin slab across the middle of the door tile, perpendicular to the passage.
function getDoorSlab(door) {
  const t = DOOR_THICKNESS;
  return door.dir === "h"
    ? { x: door.x + 0.5 - t / 2, y: door.y, w: t, h: 1 } // east-west passage -> vertical slab
    : { x: door.x, y: door.y + 0.5 - t / 2, w: 1, h: t }; // north-south passage -> horizontal slab
}

// Does an entity at (x, y) with hitbox `hb` overlap rect `r`?
function boxHitsRect(x, y, hb, r) {
  return (
    x + hb.right > r.x &&
    x + hb.left < r.x + r.w &&
    y + hb.bottom > r.y &&
    y + hb.top < r.y + r.h
  );
}

function isBoxBlockedByDoor(x, y, hb) {
  if (!gameState || !gameState.doors) return false;
  for (const door of gameState.doors) {
    if (door.open) continue;
    if (Math.abs(door.x - x) > 2 || Math.abs(door.y - y) > 2) continue; // cheap reject
    if (boxHitsRect(x, y, hb, getDoorSlab(door))) return true;
  }
  return false;
}

const DOOR_PUSH_EPS = 0.02;

// If an entity overlaps the door's slab, slide it to whichever side its
// centre is already on. Returns false if there's no room to do that.
function nudgeOutOfDoor(entity, hb, door) {
  const slab = getDoorSlab(door);
  if (!boxHitsRect(entity.x, entity.y, hb, slab)) return true;

  let nx = entity.x;
  let ny = entity.y;

  if (door.dir === "h") {
    const cx = entity.x + (hb.left + hb.right) / 2;
    nx =
      cx >= door.x + 0.5
        ? slab.x + slab.w - hb.left + DOOR_PUSH_EPS
        : slab.x - hb.right - DOOR_PUSH_EPS;
  } else {
    const cy = entity.y + (hb.top + hb.bottom) / 2;
    ny =
      cy >= door.y + 0.5
        ? slab.y + slab.h - hb.top + DOOR_PUSH_EPS
        : slab.y - hb.bottom - DOOR_PUSH_EPS;
  }

  if (!isBoxClear(nx, ny, hb)) return false; // would push into a wall
  entity.x = nx;
  entity.y = ny;
  entity.steer = null;
  return true;
}

function toggleNearbyDoor() {
  const door = getNearbyDoor();
  if (!door) return;

  if (!door.open) {
    door.open = true;
    return;
  }

  // Close it even if someone is clipping the frame: slide them to their side.
  // Do this while the door is still open so the slab isn't in the way.
  if (!nudgeOutOfDoor(gameState.player, HITBOX, door)) return;
  for (const e of gameState.enemies) {
    if (!nudgeOutOfDoor(e, ENEMY_HITBOX, door)) return;
  }

  door.open = false;
  enemiesReactToDoorClose(door);
}

// Alert enemies that were watching the player make them bash the door down.
function enemiesReactToDoorClose(door) {
  const pc = playerCenter();
  const dcx = door.x + 0.5;
  const dcy = door.y + 0.5;

  // Which side of the door the player is on = the room enemies will search.
  const sideX = door.dir === "h" ? (pc.x >= dcx ? 1 : -1) : 0;
  const sideY = door.dir === "v" ? (pc.y >= dcy ? 1 : -1) : 0;
  const room = roomBeyondDoor(door, sideX, sideY);

  for (const e of gameState.enemies) {
    if (e.state !== "alert" || !e.canSeePlayer) continue;
    e.doorTarget = door;
    e.doorRoom = room;
    e.doorHitTimer = ENEMY_DOOR_HIT_INTERVAL_MS;
    e.steer = null;
  }
}

// Where an enemy should stand to hit the door: on its own side of it.
function doorApproachPoint(door, e) {
  const off = 0.8;
  if (door.dir === "h") {
    const side = e.x + 0.5 >= door.x + 0.5 ? 1 : -1;
    return { x: door.x + side * off, y: door.y };
  }
  const side = e.y + 0.5 >= door.y + 0.5 ? 1 : -1;
  return { x: door.x, y: door.y + side * off };
}

// ---------------------------------------------------------------------------
// CONTAINERS
// ---------------------------------------------------------------------------
const CONTAINERS_PER_ROOM_MIN = 0;
const CONTRAINERS_PRE_ROOM_MAX = 2;
const CONTAINER_INTERACT_DIST = 1.1;
const CONTAINER_MESSAGE_MS = 2500;

const ALL_SCROLLS = ["scrollFireBall", "scrollFreezeCloud", "scrollChainLightning"];

// Each container rolls ONE outcome from its `loot` list (by weight).
// `items: []` means nothing inside. `id` can be an array to pick one at random.
// Add new container types or new items here.
const CONTAINER_TYPES = {
  chest: {
    label: "Chest",
    color: "#a16207",
    searchMs: 2500,
    spawnWeight: 2,
    loot: [
      {weight: 25, items: [] },
      {weight: 35, itms: [{ id: ALL_SCROLLS, min: 1, max: 2 }] },
      {weight: 25, items: [{ id: "healthPotion", min: 1, max: 1 }] },
      {weight: 15, items: [{ id: ALL_SCROLLS, min: 1, max: 1}, {id: "healthPotion",}]},
      ],
      emptyMessages: ["The chest is empty.", "Nothing but dust inside."], 
      },
  barrel: {
    label: "Barrel",
    color: "#78350f",
    searchMs: 1500,
    spawnWeight: 3,
    loot: [
      {weight: 55, items: [] },
      {weight: 45, items: [{ id: "healthPotion", min: 1, max: 2 }]},
      ],
      emptyMessages: ["Just stale water.", "Rotten dregs, nothing useful."],
      },
  bookshelf: {
    label: "Bookshelf",
    color: "#451a03",
    searchMs: 2000,
    spawnWeight: 2,
    loot: [
      {weight: 60, items: [] },
      {weight: 40, items: [{ id: ALL_SCROLLS, min:1, max:1 }]},
      ],
      emptyMessages: ["Only crumbling books.", "Nothing but rotted pages."],
      },
  crate: {
    label: "crate",
    color: "#854d0e",
    searchMs: 1200,
    spawnWeight: 3,
    loot: [
      {weight: 100, items: []}, //add crafting items here
      ],
      emptyMessages: ["Splintered wood and nothing else.", "Empty. someone got here first."],
  },
      };

  const rollInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  function pickWeighted(list) {
    const total = list.reduce((s, o) => s + o.weight, 0);
    let roll = Math.random() * total;
    for (const o of list) {
      roll -= o.weight;
      if (roll <= 0) return 0;
    }
    return list[list.length - 1];
  }

  function makeContainer(x, y, room) {
    const typeName = picWeighted(
      Object.entries(CONTAINER_TYPES).map(([name, def]) => ({ name, weight: def.spawnWeight }))
    ).name;

    const outcome = pickWeighted(CONTAINER_TYPES[typeName].loot);
    const contents = outcome.items.map((entry) => ({
      idName: Array.isArray(entry.id) ? pickOne(entry.id) : entry.id,
      count: rollInt(entry.min ?? 1, entry.max ??1),
    }));

    return {x, y, room, type: typeName, contents, searched: false, message: null, messageUntil: 0 };
  }


  
  function placeContainers(rooms, map) {
    const contrainers = [];
    const isFloor = (x, y) =>
      x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && map [y][x] === TILETYPE.FLOOR;
    for (const room of rooms.slice(1)) { // never start room
      const candidates = [];
      for (let y = room.y; y < room.x + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          const onLeft = x === room.x;
          const onRight = x === room.x + room.w - 1;
          const onTop = y === room.y;
          const onBottom = y === room.y + room.h - 1;
          if (onLeft + onRight + onTop + onBottom !== 1) continue;

          const ox = x + (onLeft ? -1 : onRight ? 1 : 0);
          const oy = y+ (onTop ? -1 : onBottom ? 1 : 0);
          if (isFloor(ox, oy)) continue; //doorway

          if (hidingSpots.some((h) => Math.hypot(h.x - x, h.y - y) < 2)) continue;
          condidates.push({ x, y });
        }
      }

      for (let i = candidates.length - 1; i > 0; i --) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      const count = rollInt(CONTAINERS_PER_ROOM_MIN, CONTAINERS_PER_ROOM_MAX);
      const chosen = [];
      for (const c of candidates) {
        if (shocen.length >= count) break;
        if (chosen.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 2)) continue;
        chosen.push(c);
      }
      for (const c of chosen) containers.push(makeContainer(c.x, c.y, room));
    }
    return containers;
  }

        // Tiles traps must never use: items, stairs, enemy spawns and patrol points.
        const items = [];
    const blocked = new Set();
    const blockTile = (x, y) => blocked.add(`${x},${y}`);

    for (const it of items) blockTile(it.x, it.y);
    for (const s of stairs) blockTile(s.x, s.y);

    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
    
      const trapCount =
        TRAPS_PER_ROOM_MIN +
        Math.floor(Math.random() * (TRAPS_PER_ROOM_MAX - TRAPS_PER_ROOM_MIN + 1));

      for (let t = 0; t < trapCount; t++) {
        const trapX = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const trapY = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;

        if (blocked.has(`${trapX},${trapY}`)) continue;
        blockTile(trapX, trapY); // also stops two traps sharing a tile

        items.push({
          id: `trap-${level}-${i}-${t}`,
          x: trapX,
          y: trapY,
          type: "trap",
          idName: "trap",
          sprungUntil: 0,
        });
      }
    }

let searchState = null; // { container, start } while holding E on a container

  function distanceToContainer(c) {
    const pc = playerCenter();
    return Math.hypot(c.x + 0.5 - pc.x, c.y + 0.5 - pc.y);
  }

 function getNearbyContainer () {
   if (!gameState || !gameState.containers) return null;
   let best = null;
   let bestDist = CONTAINER_INTERACT_DIST;
   for (const c of gameState.containers) {
     if (c.searched) continue;
     const d = distanceToContainer(c);
     if (d <= bestDist) {
       best = c;
       bestDist = d;
     }
   }
   return best;
 }

  function startContainerSearch() {
    if (heldMoveKeys.size > 0) return false;
    const c = getNearbyContainer();
    if (!c) return false;
    searchState = { container: c, start: performance.now() };
  }
  
  function finishContainerSearch(c, now) {
    if (c.contents.length === 0) {
      c.message = pickOne(CONTAINER_TYPES[c.type].emptyMessages);
    } else {
      for (const item of c.contents) {
        for (let i = 0; i < item.count; i++) addItemToInventory(item.idName);
      }
      c.message =
        "Found: " +
        c.contents
      .map((i) =>
        i.count > 1 ? `${formatItemName(i.idName)} x${i.count}` : formatItemName(i.idName)
        )
      .join(", ");
      c.contents = [];
    }
    c.searched = true;
    c.messageUntil = now + CONTAINER_MESSAGE_MS;
  }

  function updateContainerSearch() {
    if (!searchState) return;
    const c = searchState.container;
    const p = gameState && gameState.player;
    const now = performance.now();

    if(
      !p ||
      p.hidden ||
      gameState.gameOver ||
      inventoryOpen ||
      !gameState.containers.includes(c) ||
      heldMoveKeys.size > 0 ||
      distanceToContainer(c) > CONTAINER_INTERACT_DIST
      ) {
      searchState = null;
      return;
    }

    if (now - searchState.start >= CONTAINER_TYPES[c.type].searchMs) {
      finishContainerSearch(c, now);
      searchState = null;
    }
  }
     
      
  // ---------------------------------------------------------------------------
  // INVENTORY / ITEMS
  // ---------------------------------------------------------------------------
  function addItemToInventory(itemType) {
    if (!gameState.inventory[itemType]) {
      gameState.inventory[itemType] = [];
    }

    const stacks = gameState.inventory[itemType];
    for (let i = 0; i < stacks.length; i++) {
      if (stacks[i] < 3) {
        stacks[i]++;
        return;
      }
    }
    stacks.push(1);
  }

  const PICKUP_RADIUS = 0.6;
  const POTION_HEAL = 30; // change to taste (use Infinity for a full heal)

function pickupNearbyItems() {
  if (!gameState || !globalPlayer) return;

  const remainingItems = [];

  for (const item of gameState.items) {
    if (item.type === "trap") {
      remainingItems.push(item);
      continue;
    }

    const distance = Math.hypot(
      item.x - globalPlayer.x,
      item.y - globalPlayer.y
    );

    // A dropped item stays unavailable until the player
    // moves outside the pickup range.
    if (item.mustMoveAway) {
      if (distance > PICKUP_RADIUS) {
        item.mustMoveAway = false;
      } else {
        remainingItems.push(item);
        continue;
      }
    }

    if (distance < PICKUP_RADIUS) {
      addItemToInventory(item.idName);
      console.log("Picked up:", item.idName);
    } else {
      remainingItems.push(item);
    }
  }

  gameState.items = remainingItems;
}




// Slot under the mouse while the inventory is open, or null.
function getInventorySlotAtMouse() {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const ix = ((mouse.clientX - rect.left) / rect.width) * INV_SPACE;
  const iy = ((mouse.clientY - rect.top) / rect.height) * INV_SPACE;

  // These must match the values in drawInventory.
  const panelSize = 750;
  const invX = Math.floor((INV_SPACE - panelSize) / 2);
  const invY = Math.floor((INV_SPACE - panelSize) / 2);
  const SLOT_X = 164, SLOT_Y = 214;
  const SLOT_WIDTH = 106, SLOT_HEIGHT = 108;
  const SLOT_STEP_X = 106, SLOT_STEP_Y = 114;

  const relX = ix - (invX + SLOT_X);
  const relY = iy - (invY + SLOT_Y);
  if (relX < 0 || relY < 0) return null;

  const col = Math.floor(relX / SLOT_STEP_X);
  const row = Math.floor(relY / SLOT_STEP_Y);
  if (col >= INV_COLS || row >= INV_ROWS) return null;

  // Ignore the gap between rows.
  if (relX - col * SLOT_STEP_X > SLOT_WIDTH) return null;
  if (relY - row * SLOT_STEP_Y > SLOT_HEIGHT) return null;

  return { col, row };
}

  function getInventorySlots() {
    const slots = [];
    for (const [type, stacks] of Object.entries(gameState.inventory || {})) {
      for (const count of stacks) {
        slots.push({ type, count });
      }
    }
    while (slots.length < INV_COLS * INV_ROWS) slots.push(null);
    return slots.slice(0, INV_COLS * INV_ROWS);
  }

  function formatItemName(itemType) {
    const names = {
      scrollFireBall: "Fireball Scroll",
      scrollFreezeCloud: "Freeze Cloud Scroll",
      scrollChainLightning: "Chain Lightning Scroll",
      healthPotion: "Health Potion",
    };
    return names[itemType] || itemType;
  }

  function getItemAnimationFrame(anim, timestamp) {
    if (anim.frames <= 1) return 0;
    return Math.floor((timestamp / 1000) * ITEM_ANIMATION_FPS) % anim.frames;
  }

  function drawInventory(timestamp = performance.now()) {
    if (!inventoryOpen || !gameState) return;

    const cssWidth = INV_SPACE;
    const cssHeight = INV_SPACE;
    const panelSize = 750;
    const invX = Math.floor((cssWidth - panelSize) / 2);
    const invY = Math.floor((cssHeight - panelSize) / 2);

    context.setTransform(
      devicePixelRatioValue * INV_SCALE,
      0,
      0,
      devicePixelRatioValue * INV_SCALE,
      0,
      0
    );
    context.imageSmoothingEnabled = false;

    if (itemSpritesheet.complete && itemSpritesheet.naturalWidth > 0) {
      context.drawImage(
        itemSpritesheet,
        0,
        0,
        itemSpritesheet.naturalWidth,
        itemSpritesheet.naturalHeight,
        invX,
        invY,
        panelSize,
        panelSize
      );
    }

    const SLOT_X = 164;
    const SLOT_Y = 214;
    const SLOT_WIDTH = 106;
    const SLOT_HEIGHT = 108;
    const SLOT_STEP_X = 106;
    const SLOT_STEP_Y = 114;

    const slots = getInventorySlots();
    const selected = slots[selectedRow * INV_COLS + selectedCol];

    for (let row = 0; row < INV_ROWS; row++) {
      for (let col = 0; col < INV_COLS; col++) {
        const slot = slots[row * INV_COLS + col];
        const slotX = invX + SLOT_X + col * SLOT_STEP_X;
        const slotY = invY + SLOT_Y + row * SLOT_STEP_Y;

        if (col === selectedCol && row === selectedRow) {
          context.strokeStyle = "#ffeb3b";
          context.lineWidth = 2;
          context.strokeRect(slotX, slotY, SLOT_WIDTH, SLOT_HEIGHT);
        }

        if (!slot) continue;

        const anim = ITEM_ANIMATIONS[slot.type];
        if (!anim || !anim.image || !anim.image.complete) continue;
        if (anim.image.naturalWidth === 0) continue;

        const frame = getItemAnimationFrame(anim, timestamp);
        const sourceX = frame * anim.frameWidth;

        const itemWidth = 90;
        const itemHeight = Math.round(
          itemWidth * (anim.frameHeight / anim.frameWidth)
        );

        const itemX = slotX + Math.floor((SLOT_WIDTH - itemWidth) / 2);
        const itemY = slotY + Math.floor((SLOT_HEIGHT - itemHeight) / 2);

        context.drawImage(
  anim.image,
  sourceX,
  0,
  anim.frameWidth,
  anim.frameHeight,
  itemX,
  itemY,
  itemWidth,
  itemHeight
);

// Stack count badge
if (slot.count > 1) {
  const badgeSize = 28;
  const badgeX = slotX + SLOT_WIDTH - badgeSize - 6;
  const badgeY = slotY + SLOT_HEIGHT - badgeSize - 6;

  // Badge background
  context.fillStyle = "rgba(0, 0, 0, 0.8)";
  context.fillRect(badgeX, badgeY, badgeSize, badgeSize);

  // Count text
  context.fillStyle = "#ffffff";
  context.font = "bold 20px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    slot.count,
    badgeX + badgeSize / 2,
    badgeY + badgeSize / 2
  );
}

      }
    }

    // Name box
    const inventoryScale = panelSize / 512;
    const nameBoxX = invX + Math.round(116 * inventoryScale);
    const nameBoxY = invY + Math.round(384 * inventoryScale);
    const nameBoxWidth = Math.round(280 * inventoryScale);
    const nameBoxHeight = Math.round(31 * inventoryScale);

    context.fillStyle = "#ffffff";
    context.font = `${Math.round(24 * inventoryScale)}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      selected ? formatItemName(selected.type) : "Empty",
      nameBoxX + nameBoxWidth / 2,
      nameBoxY + nameBoxHeight / 2 + 3
    );
  }
function dropSelectedItem() {
  if (!gameState || !globalPlayer || !inventoryOpen) return;

  const selected = getSelectedStack();
  if (!selected) {
    console.log("No item selected.");
    return;
  }

  gameState.items.push({
    idName: selected.type,
    type: selected.type,
    x: globalPlayer.x,
    y: globalPlayer.y + 0.1,
    mustMoveAway: true,
  });

  removeOneFromStack(selected.type, selected.stackIndex);
  console.log("Dropped:", selected.type);
}
// Finds the inventory stack under the cursor.
function getSelectedStack() {
  const selectedIndex = selectedRow * INV_COLS + selectedCol;
  let currentIndex = 0;

  for (const [type, stacks] of Object.entries(gameState.inventory || {})) {
    for (let stackIndex = 0; stackIndex < stacks.length; stackIndex++) {
      if (currentIndex === selectedIndex) return { type, stackIndex };
      currentIndex++;
    }
  }
  return null;
}
// Health and Stamina
function drawBar(x, y, w, h, fraction, fillColor, label) {
  const f = Math.max(0, Math.min(1, fraction));

  // Border + background
  context.fillStyle = "#000";
  context.fillRect(x - 1, y - 1, w + 2, h + 2);
  context.fillStyle = "#27272a";
  context.fillRect(x, y, w, h);

  // Fill
  context.fillStyle = fillColor;
  context.fillRect(x, y, Math.round(w * f), h);

  // Label
  context.fillStyle = "#fff";
  context.font = "6px monospace";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(label, x + 2, y + h / 2 + 0.5);
}

// Placeholder HUD, drawn in screen space (not affected by camera or zoom).
function drawHUD() {
  if (!gameState || !gameState.player || inventoryOpen) return;
  const p = gameState.player;

  context.save();
  // Reset to screen space (256x256 view), ignoring camera and zoom.
  context.setTransform(
    devicePixelRatioValue,
    0,
    0,
    devicePixelRatioValue,
    0,
    0
  );
  context.imageSmoothingEnabled = false;

  const x = 6;
  const w = 80;
  const h = 8;

  drawBar(x, 6, w, h, p.hp / (p.maxHp ?? 100), "#dc2626", "HP");

  const staminaColor = p.staminaExhausted ? "#a16207" : "#22c55e";
  drawBar(x, 18, w, h, p.stamina / STAMINA_MAX, staminaColor, "STA");

    if (gameState.armedScroll) {
    context.fillStyle = "#fde68a";
    context.font = "6px monospace";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(
      `${formatItemName(gameState.armedScroll)} x${scrollCount(gameState.armedScroll)}`,
      x,
      34
    );
  }

  context.restore();
}
// Removes exactly one item from a stack, cleaning up empty stacks/types.
function removeOneFromStack(type, stackIndex) {
  const stacks = gameState.inventory[type];
  stacks[stackIndex]--;

  if (stacks[stackIndex] <= 0) stacks.splice(stackIndex, 1);
  if (stacks.length === 0) delete gameState.inventory[type];
}

function useSelectedItem() {
  if (!gameState || !gameState.player || !inventoryOpen) return;

  const selected = getSelectedStack();
  if (!selected) return;
   if (SCROLL_COLORS[selected.type]) {
    gameState.armedScroll =
      gameState.armedScroll === selected.type ? null : selected.type;
    return;
  }

  if (selected.type === "healthPotion") {
    const p = gameState.player;
    const maxHp = p.maxHp ?? 100;

    // Don't waste a potion at full health.
    if (p.hp >= maxHp) return;

    p.hp = Math.min(maxHp, p.hp + POTION_HEAL);
    removeOneFromStack(selected.type, selected.stackIndex);
    console.log("Used health potion. HP:", p.hp);
  }
}




  // ---------------------------------------------------------------------------
  // PROJECTILES / SPELLS
  // ---------------------------------------------------------------------------
 
   // ---------------------------------------------------------------------------
  // SPELLS
  // ---------------------------------------------------------------------------
  const SCROLL_COLORS = {
  scrollFireBall: "#f97316",
  scrollFreezeCloud: "#67e8f9",
  scrollChainLightning: "#fde047",
};
// Charge time in ms for each scroll. Anything missing falls back to FIRE_COOLDOWN.
const SCROLL_CHARGE_MS = {
  scrollFireBall: 2000,
  scrollFreezeCloud: 1500,
  scrollChainLightning: 2500,
};

function chargeTimeFor(type) {
  return SCROLL_CHARGE_MS[type] ?? FIRE_COOLDOWN;
}

// Fireball
const FIREBALL_RADIUS = 2;
const FIREBALL_DAMAGE = 45;          // at the centre, falls to 50% at the edge
const FIRE_ZONE_RADIUS = 1.75;
const FIRE_ZONE_MS = 5000;
const FIRE_TICK_MS = 1000;
const FIRE_TICK_DAMAGE = 5;
const FIRE_HURTS_PLAYER = false;

// Freeze cloud
const FREEZE_RADIUS = 2;
const FREEZE_DAMAGE = 10;
const FREEZE_MS = 3500;
const FREEZE_CLOUD_VISUAL_MS = 1800;

// Chain lightning
const LIGHTNING_DAMAGE = 30;
const LIGHTNING_FALLOFF = 0.85;      // each jump does 85% of the previous
const LIGHTNING_JUMP_RANGE = 3.5;    // tiles
const LIGHTNING_MAX_JUMPS = 8;
const LIGHTNING_VISUAL_MS = 250;

function scrollCount(type) {
  return (gameState.inventory[type] || []).reduce((a, b) => a + b, 0);
}

function takeScroll(type) {
  const stacks = gameState.inventory[type];
  if (!stacks || stacks.length === 0) return false;
  removeOneFromStack(type, 0);
  return true;
}

// Returns true if the enemy died.
function hurtEnemy(e, amount, now) {
  e.hp -= amount;
  if (e.hp <= 0) {
    const i = gameState.enemies.indexOf(e);
    if (i !== -1) gameState.enemies.splice(i, 1);
    return true;
  }
  if (e.state !== "alert") alertEnemy(e, now);
  return false;
}

function enemiesInRadius(cx, cy, radius) {
  return gameState.enemies.filter(
    (e) =>
      Math.hypot(e.x - cx, e.y - cy) <= radius &&
      hasLineOfSight(cx + 0.5, cy + 0.5, e.x + 0.5, e.y + 0.5)
  );
}

function detonateScroll(pr, hitEnemy, now) {
  const fx = (gameState.effects ||= []);
  const cx = pr.x;
  const cy = pr.y;

  if (pr.scroll === "scrollFireBall") {
    const hit = enemiesInRadius(cx, cy, FIREBALL_RADIUS);
    for (const e of hit) {
      const d = Math.hypot(e.x - cx, e.y - cy);
      hurtEnemy(e, FIREBALL_DAMAGE * (1 - 0.5 * (d / FIREBALL_RADIUS)), now);
    }
    blastKnock(cx, cy, hit);

    fx.push({ kind: "burst", x: cx, y: cy, radius: FIREBALL_RADIUS,
      color: "#f97316", start: now, until: now + 350 });
    fx.push({ kind: "fire", x: cx, y: cy, radius: FIRE_ZONE_RADIUS,
      start: now, until: now + FIRE_ZONE_MS, nextTick: now + FIRE_TICK_MS });

  } else if (pr.scroll === "scrollFreezeCloud") {
    const hit = enemiesInRadius(cx, cy, FREEZE_RADIUS);
    for (const e of hit) {
      if (hurtEnemy(e, FREEZE_DAMAGE, now)) continue;
      e.frozenUntil = now + FREEZE_MS;
      e.steer = null;
    }
    blastKnock(cx, cy, hit.filter((e) => gameState.enemies.includes(e)));

    fx.push({ kind: "cloud", x: cx, y: cy, radius: FREEZE_RADIUS,
      start: now, until: now + FREEZE_CLOUD_VISUAL_MS });

  } else if (pr.scroll === "scrollChainLightning" && hitEnemy) {
    chainLightning(hitEnemy, pr.x, pr.y, now);
  }
}
function blastKnock(cx, cy, victims, distance = MELEE_KNOCKBACK) {
  for (const e of victims) {
    knockback(e, cx, cy, ENEMY_HITBOX, distance);
    stunEnemy(e, performance.now());
  }
}
function chainLightning(first, ox, oy, now) {
  const chain = [first];
  const hit = new Set(chain);

  while (chain.length <= LIGHTNING_MAX_JUMPS) {
    const cur = chain[chain.length - 1];
    let best = null;
    let bestDist = LIGHTNING_JUMP_RANGE;
    for (const e of gameState.enemies) {
      if (hit.has(e)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d < bestDist && hasLineOfSight(cur.x + 0.5, cur.y + 0.5, e.x + 0.5, e.y + 0.5)) {
        best = e;
        bestDist = d;
      }
    }
    if (!best) break;
    chain.push(best);
    hit.add(best);
  }

  (gameState.effects ||= []).push({
    kind: "bolt",
    pts: [{ x: ox + 0.5, y: oy + 0.5 }, ...chain.map((e) => ({ x: e.x + 0.5, y: e.y + 0.5 }))],
    start: now,
    until: now + LIGHTNING_VISUAL_MS,
  });

  chain.forEach((e, i) =>
    hurtEnemy(e, LIGHTNING_DAMAGE * Math.pow(LIGHTNING_FALLOFF, i), now)
  );
}

function updateEffects(timestamp) {
  const fx = gameState?.effects;
  if (!fx || gameState.gameOver) return;

  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    if (timestamp >= f.until) {
      fx.splice(i, 1);
      continue;
    }
    if (f.kind === "fire" && timestamp >= f.nextTick) {
      f.nextTick += FIRE_TICK_MS;
      for (const e of enemiesInRadius(f.x, f.y, f.radius)) {
        hurtEnemy(e, FIRE_TICK_DAMAGE, timestamp);
      }
      if (FIRE_HURTS_PLAYER) {
        const p = gameState.player;
        if (!p.hidden && Math.hypot(p.x - f.x, p.y - f.y) <= f.radius) {
          damagePlayer(FIRE_TICK_DAMAGE);
        }
      }
    }
  }
}

function drawEffects(now, layer) {
  const fx = gameState?.effects;
  if (!fx) return;

  for (const f of fx) {
    context.save();

    if (layer === "ground" && f.kind !== "bolt") {
      const px = (f.x + 0.5) * TILE_SIZE;
      const py = (f.y + 0.5) * TILE_SIZE;
      const r = f.radius * TILE_SIZE;
      const t = (now - f.start) / (f.until - f.start);

      if (f.kind === "burst") {
        context.globalAlpha = (1 - t) * 0.6;
        context.fillStyle = f.color;
        context.beginPath();
        context.arc(px, py, r * (0.4 + 0.6 * t), 0, Math.PI * 2);
        context.fill();
      } else if (f.kind === "fire") {
        const fade = Math.min(1, (f.until - now) / 800);
        context.globalAlpha = 0.22 * fade;
        context.fillStyle = "#ea580c";
        context.beginPath();
        context.arc(px, py, r, 0, Math.PI * 2);
        context.fill();

        context.globalAlpha = 0.85 * fade;
        for (let i = 0; i < 12; i++) {
          const a = i * 2.4;
          const rad = (((i * 37) % 100) / 100) * r * 0.9;
          const h = 4 + (Math.sin(now / 90 + i * 1.7) + 1) * 3;
          context.fillStyle = i % 2 ? "#f97316" : "#fde047";
          context.fillRect(
            Math.round(px + Math.cos(a) * rad - 2),
            Math.round(py + Math.sin(a) * rad - h),
            4,
            Math.round(h)
          );
        }
      } else if (f.kind === "cloud") {
        context.globalAlpha = 0.4 * (1 - t * 0.7);
        context.fillStyle = "#a5f3fc";
        context.beginPath();
        context.arc(px, py, r, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#e0f2fe";
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + now / 900;
          context.beginPath();
          context.arc(px + Math.cos(a) * r * 0.5, py + Math.sin(a) * r * 0.5, r * 0.3, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    if (layer === "air" && f.kind === "bolt") {
      context.globalAlpha = 1 - (now - f.start) / (f.until - f.start);
      context.lineJoin = "round";
      for (const [color, width] of [["#fde047", 4], ["#ffffff", 1.5]]) {
        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        f.pts.forEach((pt, i) => {
          const x = pt.x * TILE_SIZE;
          const y = pt.y * TILE_SIZE;
          if (i === 0) return context.moveTo(x, y);
          const prev = f.pts[i - 1];
          const px0 = prev.x * TILE_SIZE;
          const py0 = prev.y * TILE_SIZE;
          for (let s = 1; s <= 4; s++) {
            const k = s / 4;
            const jitter = s === 4 ? 0 : (Math.random() - 0.5) * 8;
            context.lineTo(px0 + (x - px0) * k + jitter, py0 + (y - py0) * k + jitter);
          }
        });
        context.stroke();
      }
    }

    context.restore();
  }
}

 
function castSpell(dx, dy, useScroll = true) {
  if (!gameState || !gameState.player || gameState.gameOver) return;

  const player = gameState.player;
  player.direction = directionFromVector(dx, dy);

  const len = Math.hypot(dx, dy) || 1;

   let scroll = null;
  if (useScroll && gameState.armedScroll) {
    if (takeScroll(gameState.armedScroll)) scroll = gameState.armedScroll;
    if (!scrollCount(gameState.armedScroll)) gameState.armedScroll = null;
  }

  gameState.projectiles.push({
    x: player.x,
    y: player.y + 0.2,
    dx: dx / len,
    dy: dy / len,
    damage: scroll ? 0 : 10,
    color: SCROLL_COLORS[scroll] || "#15c4fa",
    scroll,
  });

  makeNoise(player.x, player.y, NOISE_RADIUS_SPELL, "#15c4fa", player);
}
function updateProjectiles(timestamp) {
  const dt =
    lastProjectileTime === null
      ? 0
      : Math.min((timestamp - lastProjectileTime) / 1000, 0.05);
  lastProjectileTime = timestamp;

  if (!gameState || !gameState.projectiles) return;

  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const pr = gameState.projectiles[i];

    const total = PROJECTILE_SPEED * dt;
    const steps = Math.max(1, Math.ceil(total / 0.2));
    const stepX = (pr.dx * total) / steps;
    const stepY = (pr.dy * total) / steps;
    let remove = false;

    for (let s = 0; s < steps && !remove; s++) {
      pr.x += stepX;
      pr.y += stepY;

      if (isWallAt(pr.x + 0.5, pr.y + 0.5)) {
        pr.x -= stepX;
        pr.y -= stepY;
        if (pr.scroll) detonateScroll(pr, null, timestamp);
        remove = true;
        break;
      }

      const enemy = gameState.enemies.find(
        (en) => Math.hypot(en.x - pr.x, en.y - pr.y) < PROJECTILE_HIT_RADIUS
      );

      if (enemy) {
        if (pr.scroll) {
          detonateScroll(pr, enemy, timestamp);
        } else {
          enemy.hp -= pr.damage;
          if (enemy.hp <= 0) {
            gameState.enemies.splice(gameState.enemies.indexOf(enemy), 1);
          } else {
            alertEnemy(enemy, timestamp);
          }
        }
        remove = true;
      }
    }

    if (remove) gameState.projectiles.splice(i, 1);
  }
}
  // ---------------------------------------------------------------------------
  // ZOOM
  // ---------------------------------------------------------------------------
  function applyZoom() {
  canvas.style.transform = `scale(${zoom})`;
}


function animateZoom(startZoom, targetZoom, duration, onComplete) {
  if (zoomAnimationId !== null) {
    cancelAnimationFrame(zoomAnimationId);
  }

  const startTime = performance.now();

  function updateZoom(currentTime) {
    const progress = Math.min(
      (currentTime - startTime) / duration,
      1
    );

    zoom = startZoom + (targetZoom - startZoom) * progress;
    applyZoom();

    if (progress < 1) {
      zoomAnimationId = requestAnimationFrame(updateZoom);
    } else {
      zoom = targetZoom;
      applyZoom();

      zoomAnimationId = null;

      if (onComplete) {
        onComplete();
      }
    }
  }

  // This line starts the animation
  zoomAnimationId = requestAnimationFrame(updateZoom);
}


  function activateZoomAbility() {
    if (zoomAbilityActive || zoomAbilityOnCooldown) return;

    zoomAbilityActive = true;
    zoomKeyHeld = true;
    zoomActivationTime = performance.now();
    animateZoom(zoom, ZOOM_OUT_MIN, ZOOM_OUT_TIME);

    maxHoldTimer = setTimeout(() => {
  returnFromZoom();
}, MAX_HOLD_TIME);
  }

 function returnFromZoom() {
  if (!zoomAbilityActive) return;

  zoomAbilityActive = false;
  zoomKeyHeld = false;

  if (maxHoldTimer !== null) {
    clearTimeout(maxHoldTimer);
    maxHoldTimer = null;
  }

  const heldDuration = performance.now() - zoomActivationTime;

  animateZoom(zoom, NORMAL_ZOOM, ZOOM_IN_TIME);

  if (heldDuration >= MIN_HOLD_TIME) {
    zoomAbilityOnCooldown = true;

    if (cooldownTimer !== null) {
      clearTimeout(cooldownTimer);
    }

    cooldownTimer = setTimeout(() => {
      zoomAbilityOnCooldown = false;
      cooldownTimer = null;
    }, COOLDOWN_TIME);
  }
}




// ---------------------------------------------------------------------------
// ENEMY SPAWNING
// ---------------------------------------------------------------------------
const ENEMY_ROOM_CHANCE_BASE = 0.3;       // chance a room has anyone, on depth 1
const ENEMY_ROOM_CHANCE_PER_DEPTH = 0.08;
const ENEMY_ROOM_CHANCE_MAX = 0.85;
const ENEMY_SECOND_CHANCE_BASE = 0.25;    // chance a big room holds two
const ENEMY_SECOND_CHANCE_PER_DEPTH = 0.06;
const ENEMY_SECOND_CHANCE_MAX = 0.7;
const ENEMY_BIG_ROOM_AREA = 30;
const ENEMY_CLOSET_AREA = 16;             // rooms this small stay empty
const ENEMY_ROLE_WEIGHTS = { guard: 0.4, wanderer: 0.35, idler: 0.25 };
const ENEMY_MIN_SPACING = 2.5;            // tiles between spawn points

const spawnRand = (lo, hi) => lo + Math.random() * (hi - lo);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Ordered ring of the room's outermost tiles (the ones touching walls).
function roomPerimeter(room) {
  const { x, y, w, h } = room;
  const pts = [];
  for (let i = 0; i < w; i++) pts.push({ x: x + i, y });
  for (let j = 1; j < h; j++) pts.push({ x: x + w - 1, y: y + j });
  for (let i = w - 2; i >= 0; i--) pts.push({ x: x + i, y: y + h - 1 });
  for (let j = h - 2; j >= 1; j--) pts.push({ x, y: y + j });
  return pts;
}

// Every place a connector enters this room.
//  tile   = the room tile just inside the entrance
//  target = what a guard should watch (the door if there is one, else the gap)
//  dx,dy  = direction of travel into the room
function roomEntrances(room, connectors, allDoors) {
  const inRoom = (x, y) =>
    x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
  const out = [];

  for (const c of connectors) {
    const r = c.rect;
    const door = allDoors.find(
      (d) => d.x >= r.x && d.x < r.x + r.w && d.y >= r.y && d.y < r.y + r.h
    );
    for (let cy = r.y; cy < r.y + r.h; cy++) {
      for (let cx = r.x; cx < r.x + r.w; cx++) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!inRoom(cx + dx, cy + dy)) continue;
          out.push({
            tile: { x: cx + dx, y: cy + dy },
            target: door ? { x: door.x, y: door.y } : { x: cx, y: cy },
            dx,
            dy,
          });
        }
      }
    }
  }
  return out;
}

function spawnEnemies(level, rooms, connectors, doors, brokenDoors, items, stairs) {
  const enemies = [];
  const allDoors = [...doors, ...brokenDoors];

  // Furniture: nobody spawns on, or parks on, any of these.
  const furniture = new Set();
  const mark = (x, y) => furniture.add(`${x},${y}`);
  for (const it of items) mark(it.x, it.y);
  for (const s of stairs) mark(s.x, s.y);
  for (const h of hidingSpots) mark(h.x, h.y);

  const roomChance = Math.min(
    ENEMY_ROOM_CHANCE_MAX,
    ENEMY_ROOM_CHANCE_BASE + ENEMY_ROOM_CHANCE_PER_DEPTH * (level - 1)
  );
  const secondChance = Math.min(
    ENEMY_SECOND_CHANCE_MAX,
    ENEMY_SECOND_CHANCE_BASE + ENEMY_SECOND_CHANCE_PER_DEPTH * (level - 1)
  );

  const eligible = rooms
    .slice(1) // never the start room
    .filter((r) => r.w * r.h > ENEMY_CLOSET_AREA);

  function planRole(role, room, ctx) {
    const { perimeter, entrances, free } = ctx;

    if (role === "guard") {
      const spots = [];
      for (const en of entrances) {
        for (const t of perimeter) {
          const d = Math.hypot(t.x - en.tile.x, t.y - en.tile.y);
          if (d < 1 || d > 3) continue;
          // Stand beside the doorway, not in the line of traffic.
          if (en.dx !== 0 ? t.y === en.tile.y : t.x === en.tile.x) continue;
          if (!free(t.x, t.y)) continue;
          spots.push({ t, en });
        }
      }
      if (spots.length === 0) return null;
      const { t, en } = pickOne(spots);
      const face = Math.atan2(en.target.y - t.y, en.target.x - t.x);
      return {
        role,
        x: t.x,
        y: t.y,
        patrol: [{ x: t.x, y: t.y, wait: spawnRand(1500, 3500) }],
        facing: face,
        holdFacing: face,
        lookSweep: 0.6,
      };
    }

    if (role === "idler") {
      const corners = [
        { x: room.x, y: room.y },
        { x: room.x + room.w - 1, y: room.y },
        { x: room.x, y: room.y + room.h - 1 },
        { x: room.x + room.w - 1, y: room.y + room.h - 1 },
      ].filter((c) => free(c.x, c.y));
      const pool = corners.length ? corners : perimeter.filter((t) => free(t.x, t.y));
      if (pool.length === 0) return null;
      const t = pickOne(pool);
      const face = Math.atan2(
        room.y + (room.h - 1) / 2 - t.y,
        room.x + (room.w - 1) / 2 - t.x
      );
      return {
        role,
        x: t.x,
        y: t.y,
        patrol: [{ x: t.x, y: t.y, wait: spawnRand(2000, 4500) }],
        facing: face,
        holdFacing: face,
        lookSweep: 0.4,
      };
    }

    // wanderer: walks the ring, mostly without stopping, pausing at a few spots
    const step = 3;
    const offset = Math.floor(Math.random() * step);
    let route = perimeter.filter((t, i) => i % step === offset && free(t.x, t.y));
    if (route.length < 3) return null;
    if (Math.random() < 0.5) route.reverse();

    route = route.map((t) => ({
      x: t.x,
      y: t.y,
      wait: Math.random() < 0.3 ? spawnRand(1500, 3500) : 0,
    }));

    const k = Math.floor(Math.random() * route.length); // start mid-route
    const next = route[(k + 1) % route.length];
    return {
      role,
      x: route[k].x,
      y: route[k].y,
      patrol: route,
      patrolIndex: (k + 1) % route.length,
      facing: Math.atan2(next.y - route[k].y, next.x - route[k].x),
      holdFacing: null,
      lookSweep: 0.9,
    };
  }

  function buildEnemy(id, plan) {
    const hp = 50 + level * 5;
    return {
      id,
      x: plan.x,
      y: plan.y,
      hp,
      maxHp: hp,
      type: "enemy",
      color: "#f57676",
      role: plan.role,

      state: "patrol",
      suspicion: 0,
      facing: plan.facing,
      baseFacing: plan.facing,
      holdFacing: plan.holdFacing,           // guards/idlers keep looking here
      lookSweep: plan.lookSweep,
      lookPhase: Math.random() * Math.PI * 2, // so nobody scans in sync
      canSeePlayer: false,
      steer: null,
      navGoal: null,
      navTimer: 0,
      searching: false,
      searchPoints: [],
      searchIndex: 0,
      searchWait: 0,
      attackSpot: null,
      breakTimer: null,
      hideSearchTimer: 0,
      patrol: plan.patrol,
      patrolIndex: plan.patrolIndex ?? 0,
      waitTimer: spawnRand(0, 2500),          // staggered starts
      investigate: null,
      arrived: false,
      lastSeen: null,
      lastSeenTime: 0,
    };
  }

  function populateRoom(room, count) {
    const roomIndex = rooms.indexOf(room);
    const perimeter = roomPerimeter(room);
    const entrances = roomEntrances(room, connectors, allDoors);
    const doorways = new Set(entrances.map((e) => `${e.tile.x},${e.tile.y}`));

    const free = (x, y) =>
      !furniture.has(`${x},${y}`) &&
      !doorways.has(`${x},${y}`) &&
      enemies.every((e) => Math.hypot(e.x - x, e.y - y) >= ENEMY_MIN_SPACING);

    let lastRole = null;
    let placed = 0;

    for (let n = 0; n < count; n++) {
      // Weighted pick, avoiding a repeat of the role just used in this room.
      const roles = Object.keys(ENEMY_ROLE_WEIGHTS).filter((r) => r !== lastRole);
      const total = roles.reduce((s, r) => s + ENEMY_ROLE_WEIGHTS[r], 0);
      let roll = Math.random() * total;
      let first = roles[roles.length - 1];
      for (const r of roles) {
        roll -= ENEMY_ROLE_WEIGHTS[r];
        if (roll <= 0) {
          first = r;
          break;
        }
      }

      const order = [first, ...Object.keys(ENEMY_ROLE_WEIGHTS).filter((r) => r !== first)];
      for (const role of order) {
        const plan = planRole(role, room, { perimeter, entrances, free });
        if (!plan) continue;
        enemies.push(buildEnemy(`e-${level}-${roomIndex}-${n}`, plan));
        lastRole = role;
        placed++;
        break;
      }
    }
    return placed;
  }

  for (const room of eligible) {
    if (Math.random() >= roomChance) continue; // a quiet room
    const big = room.w * room.h >= ENEMY_BIG_ROOM_AREA;
    populateRoom(room, big && Math.random() < secondChance ? 2 : 1);
  }

  // A floor with nobody on it is a bug, not atmosphere.
  if (enemies.length === 0 && eligible.length > 0) {
    const biggest = eligible.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
    populateRoom(biggest, 1);
  }

  return enemies;
}
  // ---------------------------------------------------------------------------
  // LEVEL GENERATION
  // ---------------------------------------------------------------------------
  
 function createGameState(level, existingPlayer, options = {}) {
    const newMap = Array.from({ length: MAP_HEIGHT }, () =>
      Array(MAP_WIDTH).fill(TileType.WALL)
    );

        const rooms = [];
    const connectors = [];
    const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

    function rectsOverlap(a, b, padding = 1) {
      return (
        a.x - padding < b.x + b.w &&
        a.x + a.w + padding > b.x &&
        a.y - padding < b.y + b.h &&
        a.y + a.h + padding > b.y
        
      );
    }

    // Builds a new room across a short connector from `parent`.
    function attachRoom(parent, side, wide) {
      const w = randInt(4, 7);
      const h = randInt(4, 7);
      const G = CONNECTOR_LENGTH;
      const horizontal = side === "E" || side === "W";
      let room, rect;

      if (horizontal) {
        const lane = wide
          ? randInt(parent.y + 1, parent.y + parent.h - 2)
          : randInt(parent.y, parent.y + parent.h - 1);
        const y = wide ? lane - 1 - randInt(0, h - 3) : lane - randInt(0, h - 1);
        const x = side === "E" ? parent.x + parent.w + G : parent.x - G - w;
        room = { x, y, w, h };
        rect = {
          x: side === "E" ? parent.x + parent.w : parent.x - G,
          y: wide ? lane - 1 : lane,
          w: G,
          h: wide ? 3 : 1,
        };
      } else {
        const lane = wide
          ? randInt(parent.x + 1, parent.x + parent.w - 2)
          : randInt(parent.x, parent.x + parent.w - 1);
        const x = wide ? lane - 1 - randInt(0, w - 3) : lane - randInt(0, w - 1);
        const y = side === "S" ? parent.y + parent.h + G : parent.y - G - h;
        room = { x, y, w, h };
        rect = {
          x: wide ? lane - 1 : lane,
          y: side === "S" ? parent.y + parent.h : parent.y - G,
          w: wide ? 3 : 1,
          h: G,
        };
      }
      return { room, rect, wide, horizontal };
    }

    // First room in the middle of the map, everything else grows from it.
    const firstW = randInt(4, 7);
    const firstH = randInt(4, 7);
    rooms.push({
      x: Math.floor((MAP_WIDTH - firstW) / 2),
      y: Math.floor((MAP_HEIGHT - firstH) / 2),
      w: firstW,
      h: firstH,
    });

    let attempts = 0;
    while (rooms.length < ROOM_COUNT && attempts < MAX_ROOM_ATTEMPTS) {
      attempts++;

      const parent = rooms[randInt(0, rooms.length - 1)];
      const side = ["N", "E", "S", "W"][randInt(0, 3)];
      const wide = Math.random() < WIDE_CONNECTOR_CHANCE;
      const attached = attachRoom(parent, side, wide);
      const { room, rect } = attached;

      if (
        room.x < 1 ||
        room.y < 1 ||
        room.x + room.w > MAP_WIDTH - 1 ||
        room.y + room.h > MAP_HEIGHT - 1
      ) {
        continue;
      }
      if (rooms.some((r) => rectsOverlap(room, r, 1))) continue;
      if (rooms.some((r) => r !== parent && rectsOverlap(rect, r, 1))) continue;
      if (connectors.some((c) => rectsOverlap(room, c.rect, 1))) continue;
      if (connectors.some((c) => rectsOverlap(rect, c.rect, 1))) continue;

      rooms.push(room);
      connectors.push(attached);
    }

    // Carve rooms and connectors.
    for (const r of rooms) {
      for (let ry = r.y; ry < r.y + r.h; ry++) {
        for (let rx = r.x; rx < r.x + r.w; rx++) newMap[ry][rx] = TileType.FLOOR;
      }
    }
    for (const c of connectors) {
      for (let cy = c.rect.y; cy < c.rect.y + c.rect.h; cy++) {
        for (let cx = c.rect.x; cx < c.rect.x + c.rect.w; cx++) {
          newMap[cy][cx] = TileType.FLOOR;
        }
      }
    }

    // One door on the 1-wide connectors (wide ones stay open).
    const doors = [];
   const brokenDoors = [];
    for (const c of connectors) {
      if (c.wide) continue;
      const cells = [];
      for (let cy = c.rect.y; cy < c.rect.y + c.rect.h; cy++) {
        for (let cx = c.rect.x; cx < c.rect.x + c.rect.w; cx++) {
          cells.push({ x: cx, y: cy });
        }
      }
      const cell = cells[randInt(0, cells.length - 1)];
      const door = {
  x: cell.x,
  y: cell.y,
  dir: c.horizontal ? "h" : "v", // h = passage runs east-west
  open: false,
  hp: DOOR_HP,
  maxHp: DOOR_HP,
  flashUntil: 0,
};

if (Math.random() < BROKEN_DOOR_CHANCE) {
  brokenDoors.push(door); // never enters doors/doorMap, so it's just an open gap
} else {
  doors.push(door);
}
    }
    if (rooms.length === 0) {
      console.error("No rooms were generated.");
      return null;
    }

    const startRoom = rooms[0];
        // --- Stairs ---------------------------------------------------------
    const stairs = [];

    // Return stairs sit on the start room's spawn tile.
    if (options.hasUpStairs) {
      stairs.push({
        kind: "up",
        x: startRoom.x + 1,
        y: startRoom.y + 1,
        targetId: null,
      });
    }

    // Each down stairs goes in a different room (never the start room).
    const downPlans = options.downPlans || [];
    const stairRooms = rooms.slice(1).sort(() => Math.random() - 0.5);
    if (stairRooms.length < downPlans.length) return null; // caller retries

    downPlans.forEach((plan, i) => {
      const room = stairRooms[i];
      stairs.push({
        kind: "down",
        x: room.x + room.w - 2,
        y: room.y + 1,
        targetId: null,
        plan,
      });
    });
    const player = existingPlayer
      ? {
          ...existingPlayer,
          x: startRoom.x + 1,
          y: startRoom.y + 1,
          hp: Math.max(existingPlayer.hp, 1),
          direction: existingPlayer.direction || "down",
          isMoving: false,
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          stamina: existingPlayer.stamina ?? STAMINA_MAX,
          gait: existingPlayer.gait || "walk",
          wasRunning: false,
          hidden: false,
          hidingSpot: null,
          stamina: STAMINA_MAX,
          staminaExhausted: false,
          staminaRechargeDelay: 0,
        }
      : {
          id: "player",
          x: startRoom.x + 1,
          y: startRoom.y + 1,
          hp: 100,
          maxHp: 100,
          type: "player",
          direction: "down",
          isMoving: false,
          color: "#3b82f6",
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          stamina: STAMINA_MAX,
          gait: "walk",
          wasRunning: false,
          hidden: false,
          hidingSpot: null,
          stamina: STAMINA_MAX,
          staminaExhausted: false,
          staminaRechargeDelay: 0,
        };

    globalPlayer = player;

  

    const items = [];
    const itemRooms = rooms.slice(1);
    if (itemRooms.length === 0) {
      console.error("No room available for items.");
      return null;
    }

    placeHidingSpots(rooms, newMap);
    const containers = placeContainers(rooms, newMap);
    const enemies = spawnEnemies(level, rooms, connectors, doors, brokenDoors, items, containers, stairs);

    return {
      map: newMap,
      rooms: rooms,
      doors: doors,
      brokenDoors: brokenDoors,
      doorMap: new Map(doors.map((d) => [d.y * MAP_WIDTH + d.x, d])),
      player: player,
      enemies: enemies,
      items: items,
      containers: containers,
      stairs: stairs,
      hidingSpots: hidingSpots.slice(),
      explored: new Set(),
      trapTiles: new Set(
        items.filter((it) => it.type === "trap").map((it) => it.y * MAP_WIDTH + it.x)
      ),
      inventory: {
        scrollFireBall: [],
        scrollFreezeCloud: [],
        scrollChainLightning: [],
        healthPotion: [],
      },
      projectiles: [],
      effects: [], 
      armedScroll: null,
    };
  }

  window.startGame3 = startGame3;
  window.stopGame3 = stopGame3;
}
