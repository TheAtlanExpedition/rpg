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

  // Integer DPR only: fractional values (125%, 150%) cause uneven sprite pixels.
  const devicePixelRatioValue = Math.max(
    1,
    Math.floor(window.devicePixelRatio || 1)
  );
  const CANVAS_SCALE = 3;

  canvas.style.width = `${DISPLAY_WIDTH * CANVAS_SCALE}px`;
  canvas.style.height = `${DISPLAY_HEIGHT * CANVAS_SCALE}px`;
  canvas.style.imageRendering = "pixelated";
  // Stop page CSS / flex parents from squashing the canvas on one axis.
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
  const ITEM_SIZE = 32;

  let zoom = 1;

  const TileType = {
    WALL: 0,
    FLOOR: 1,
    DOOR: 2,
    TRAP: 3,
    SWITCH: 4,
  };

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
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/bb830fd6234e9dbabdefddcc4d706d9aa52b3fd7/assets/sprites/items/Potion-1.svg";

  const itemSpritesheet = new Image();
  itemSpritesheet.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/ui/inventory-large-0.1.png";

  const TILESET = new Image();
  TILESET.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/tiles/tileset-damp-dark-dungeon-floor-cobblestone-0.1.png"; // path relative to your HTML page

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

      // Replace these coordinates with the actual corner locations
      // in your tileset.
      outerNW: sliceTileset(33, 64, 14, 14),
      outerNE: sliceTileset(96, 67, 14, 14),
      outerSW: sliceTileset(62, 1, 14, 14), // was 32×32
      outerSE: sliceTileset(33, 130, 14, 14),

      innerNW: sliceTileset(4, 129, 14, 14),
      innerNE: sliceTileset(96, 194, 14, 14),
      innerSW: sliceTileset(0, 0, 14, 14),
      innerSE: sliceTileset(34, 194, 14, 14),
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

  function drawWallCorner(art, tx, ty, dx, dy) {
    const T = TILE_SIZE;
    const L = LEDGE_W;

    // Select the horizontal and vertical ledge pieces.
    const horizontal = dy < 0 ? art.north : art.south;
    const vertical = dx < 0 ? art.west : art.east;

    // Source regions inside the ledge canvases.
    const hsx = dx < 0 ? 0 : T - L;
    const vsy = dy < 0 ? 0 : T - L;

    // Destination corner inside the wall tile.
    const cornerX = dx < 0 ? tx : tx + T - L;
    const cornerY = dy < 0 ? ty : ty + T - L;

    // Horizontal part of the elbow.
    context.drawImage(horizontal, hsx, 0, L, L, cornerX, cornerY, L, L);

    // Vertical part of the elbow.
    context.drawImage(vertical, 0, vsy, L, L, cornerX, cornerY, L, L);
  }

  function drawCorner(art, type, direction, tx, ty) {
    const T = TILE_SIZE;
    const L = LEDGE_W;
    const positions = {
      NW: [tx, ty],
      NE: [tx + T - L, ty],
      SW: [tx, ty + T - L],
      SE: [tx + T - L, ty + T - L],
    };
    const [drawX, drawY] = positions[direction];
    context.drawImage(art[`${type}${direction}`], drawX, drawY);
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
      // optional: still check diagonals for outer corners only
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
    },
    scrollFreezeCloud: {
      image: ITEM_SPRITES.scrollFreezeCloud,
      frames: 1,
      frameWidth: 25,
      frameHeight: 11,
    },
    scrollChainLightning: {
      image: ITEM_SPRITES.scrollChainLightning,
      frames: 1,
      frameWidth: 25,
      frameHeight: 11,
    },
    healthPotion: {
      image: ITEM_SPRITES.healthPotion,
      frames: 1,
      frameWidth: 25,
      frameHeight: 11,
    },
  };

  const ITEM_ANIMATION_FPS = 2;
  const PLAYER_SPEED = 3; // tiles per second
  const PLAYER_SNEAK_SPEED = 1.6;
  const PLAYER_RUN_SPEED = 5.2;
  const STAMINA_MAX = 3;
  const STAMINA_START_MIN = 0.35;
  const PROJECTILE_SPEED = 5; // tiles per second (continuous, any angle)
  const PROJECTILE_HIT_RADIUS = 0.75; // how close to an enemy's centre counts as a hit

  let gameRunning = false;
  let gameStart = null;
  let globalPlayer = null;
  let gameState = null;
  let lastFrameTime = null;
  let lastEnemyTime = null;
  let lastProjectileTime = null;

  let inventoryOpen = false;
  let selectedCol = 0;
  let selectedRow = 0;

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

  // FIX: this is a Set everywhere. (Other handlers used push/indexOf/splice/
  // length = 0, which don't exist on a Set and threw TypeErrors.)
  const heldMoveKeys = new Set();

  const movementKeys = new Set(["w", "a", "s", "d"]);

  const heldGaitKeys = { sneak: false, run: false };

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyE" && !event.repeat) {
      // FIX: don't touch gameState before the game exists / while in the menu.
      if (!gameRunning || !gameState || inventoryOpen) return;
      toggleHide();
    }
  });

  // FIX: removed the placeholder movePlayer() stub ("Existing movement code...").
  // Movement is handled in updateFreePlayerMovement, which now checks p.hidden.

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

  // Prevent movement getting stuck when the window loses focus
  window.addEventListener("blur", () => {
    heldMoveKeys.clear();
  });

  // ---------------------------------------------------------------------------
  // PLAYER SPRITESHEET (8 directions)
  // Layout: 32x32 cells. Column 0 = idle, columns 1-5 = walk frames.
  // Each row is one facing (order verified against the actual sheet).
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
  // Desired on-screen player size.
  // Set these to the size your normal player currently appears.
  const PLAYER_DRAW_W = FRAME_W;
  const PLAYER_DRAW_H = FRAME_H;
  // Walk animation advances by DISTANCE walked (not time) so the feet match
  // the ground. Lower = faster stepping, higher = slower.
  const PX_PER_WALK_FRAME = 8;
  const PX_PER_SNEAK_FRAME = 6;
  const PX_PER_RUN_FRAME = 10;

  // Keep the walking pose this long after the last movement so brief stalls
  // (corners, key changes) don't flick to idle and back.
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

  // "dx,dy" -> facing name
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

  // Set true temporarily to draw the raw sheet with a grid over the game.
  const DEBUG_SHEET = false;
  let lastFireTime = -Infinity;
  const FIRE_COOLDOWN = 2000;

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

    // FIX: movement keys are already tracked by the Set handler above.
    // The old heldMoveKeys.push(...) here threw because a Set has no push().
    if (moveKeys[key]) {
      event.preventDefault();
      return;
    }

    const fireDirection = fireKeys[event.key];

    if (fireDirection) {
      event.preventDefault();

      // Ignore keyboard auto-repeat while the key is held
      if (event.repeat) return;

      const now = performance.now();

      // Wait 2 seconds between casts
      if (now - lastFireTime < FIRE_COOLDOWN) {
        return;
      }

      lastFireTime = now;

      const [dx, dy] = fireDirection;
      castSpell(dx, dy);
    }
  });

  // FIX: the old keyup handler here used indexOf/splice on the Set (crash),
  // and duplicated the one above, so it was removed. Same for the extra blur
  // handler that did heldMoveKeys.length = 0.

  function startGame3() {
    gameStart = performance.now();
    lastFrameTime = null;
    lastEnemyTime = null;
    lastProjectileTime = null;
    heldMoveKeys.clear();

    const newGameState = createGameState(1, null, []);

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

  function gameLoop(timestamp) {
    if (!gameRunning) return;

    updateFreePlayerMovement(timestamp);
    updateTraps(timestamp);
    updateEnemies(timestamp);
    updateProjectiles(timestamp);
    pickupNearbyItems();
    drawGame(timestamp);

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function updateFreePlayerMovement(timestamp) {
    // Track frame time EVERY frame so the first step after standing still
    // doesn't get a huge delta. Clamp so tab-switching can't cause a jump.
    const deltaTime =
      lastFrameTime === null
        ? 0
        : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;

    if (!gameState || !gameState.player) return;

    const player = gameState.player;
    player.isMoving = false;

    // FIX: a hidden player can't walk around.
    if (gameState.gameOver || inventoryOpen || player.hidden) return;

    let dx = 0;
    let dy = 0;

    if (heldMoveKeys.has("a")) dx -= 1;
    if (heldMoveKeys.has("d")) dx += 1;
    if (heldMoveKeys.has("w")) dy -= 1;
    if (heldMoveKeys.has("s")) dy += 1;

    const sneak = heldGaitKeys.sneak;
    const wantRun = heldGaitKeys.run && !sneak;
    const canRun = player.stamina > (player.wasRunning ? 0 : STAMINA_START_MIN);

    if (sneak) {
      player.gait = "sneak";
      player.wasRunning = false;
      player.stamina = Math.min(STAMINA_MAX, player.stamina + deltaTime);
    } else if (wantRun && canRun && (dx !== 0 || dy !== 0)) {
      player.gait = "run";
      player.stamina = Math.max(0, player.stamina - deltaTime);
      player.wasRunning = player.stamina > 0;
    } else {
      player.gait = "walk";
      player.wasRunning = false;
      player.stamina = Math.min(STAMINA_MAX, player.stamina + deltaTime);
    }
    if (dx === 0 && dy === 0) {
      return;
    }

    // Face the pressed direction (8-way) before normalizing.
    player.direction =
      DIR_FROM_VECTOR[`${Math.sign(dx)},${Math.sign(dy)}`] || player.direction;

    // Normalize diagonal movement so it is not faster
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

    if (canMoveTo(newX, player.y)) {
      player.x = newX;
    }

    if (canMoveTo(player.x, newY)) {
      player.y = newY;
    }

    // Track real movement: distance drives the walk animation frame.
    const moved = Math.hypot(player.x - oldX, player.y - oldY) * TILE_SIZE;
    if (moved > 0) {
      player.walkDistance = (player.walkDistance || 0) + moved;
      player.lastMovedTime = timestamp;

      const stepRadius = FOOTSTEP_RADIUS[player.gait] ?? 0;
      const stepInterval = FOOTSTEP_INTERVAL_MS[player.gait] ?? Infinity;
      if (stepRadius > 0 && timestamp - lastFootstepTime >= stepInterval) {
        lastFootstepTime = timestamp;
        makeNoise(player.x, player.y, stepRadius, "#e2e8f0");
      }
    }
    globalPlayer = player;
  }

  // Player hitbox inside their tile (0..1). Tweak to change how close you can
  // get to walls.
  const HITBOX = { left: 0.25, right: 0.75, top: 0.5, bottom: 0.9 };

  function isWalkableTile(tileX, tileY) {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return false;
    }
    return gameState.map[tileY][tileX] !== TileType.WALL;
  }

  // The map's walls are the only thing that uses tiles. Entities themselves
  // move freely: any position, any angle, blocked only by wall geometry.
  function isBoxClear(x, y, hb) {
    if (!gameState || !gameState.map) return false;
    return (
      isWalkableTile(Math.floor(x + hb.left), Math.floor(y + hb.top)) &&
      isWalkableTile(Math.floor(x + hb.right), Math.floor(y + hb.top)) &&
      isWalkableTile(Math.floor(x + hb.left), Math.floor(y + hb.bottom)) &&
      isWalkableTile(Math.floor(x + hb.right), Math.floor(y + hb.bottom))
    );
  }

  // Can a hitbox slide from A to B without touching a wall?
  function isSegmentClear(ax, ay, bx, by, hb) {
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(dist / 0.15));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!isBoxClear(ax + (bx - ax) * t, ay + (by - ay) * t, hb)) return false;
    }
    return true;
  }

  // Move with wall sliding. Returns the distance actually travelled.
  function tryMove(entity, dx, dy, hb) {
    const ox = entity.x;
    const oy = entity.y;
    if (isBoxClear(entity.x + dx, entity.y, hb)) entity.x += dx;
    if (isBoxClear(entity.x, entity.y + dy, hb)) entity.y += dy;
    return Math.hypot(entity.x - ox, entity.y - oy);
  }

  function canMoveTo(x, y) {
    return isBoxClear(x, y, HITBOX);
  }
  function drawRipples() {
    const now = performance.now();

    for (let i = noiseRipples.length - 1; i >= 0; i--) {
      const r = noiseRipples[i];
      const t = (now - r.start) / r.duration;
      if (t >= 1) {
        noiseRipples.splice(i, 1);
        continue;
      }

      context.save();

      // Confine the ripple to where the sound can actually travel.
      if (r.reach) {
        context.beginPath();
        for (const k of r.reach.keys()) {
          const tx = k % MAP_WIDTH;
          const ty = Math.floor(k / MAP_WIDTH);
          context.rect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        context.clip();
      }

      context.strokeStyle = r.color;
      context.lineWidth = 2;

      for (const lag of [0, 0.18]) {
        const tt = Math.max(0, t - lag);
        if (tt <= 0) continue;
        const eased = 1 - (1 - tt) * (1 - tt);
        context.globalAlpha = (1 - t) * (lag === 0 ? 0.7 : 0.4);
        context.beginPath();
        context.arc(
          Math.round(r.x * TILE_SIZE),
          Math.round(r.y * TILE_SIZE),
          r.radius * TILE_SIZE * eased,
          0,
          Math.PI * 2
        );
        context.stroke();
      }

      context.restore(); // also resets globalAlpha
    }
  }
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

    // Use only integer zoom values for pixel-perfect sprites.
    context.scale(Math.round(zoom), Math.round(zoom));

    context.translate(-Math.round(camera.x), -Math.round(camera.y));

    drawMap();
    drawHidingSpots();
    drawVisionCones();
    drawItems(timestamp);
    drawProjectiles();
    drawEnemies();
    drawPlayer(timestamp);
    drawRipples();
    drawHidePrompt();

    context.restore();
    if (gameState.gameOver) drawGameOver();
    context.setTransform(
      devicePixelRatioValue / CANVAS_SCALE,
      0,
      0,
      devicePixelRatioValue / CANVAS_SCALE,
      0,
      0
    );

    if (DEBUG_SHEET) drawSheetDebug();
    context.imageSmoothingEnabled = false;
    drawInventory();
  }

  // Temporary helper: draws the whole player sheet with a grid so you can
  // verify frame size and row order. Enable with DEBUG_SHEET = true.
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

  const ZOOM_KEY = "f";
  const NORMAL_ZOOM = 1;
  const ZOOM_OUT_MIN = 1;
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

  function animateZoom(startZoom, targetZoom, duration, onComplete) {
    if (zoomAnimationId !== null) {
      cancelAnimationFrame(zoomAnimationId);
    }

    const startTime = performance.now();

    function updateZoom(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      zoom = startZoom + (targetZoom - startZoom) * progress;

      if (progress < 1) {
        zoomAnimationId = requestAnimationFrame(updateZoom);
      } else {
        zoom = targetZoom;
        zoomAnimationId = null;
        if (onComplete) onComplete();
      }
    }

    zoomAnimationId = requestAnimationFrame(updateZoom);
  }

  function activateZoomAbility() {
    if (zoomAbilityActive || zoomAbilityOnCooldown) return;

    zoomAbilityActive = true;
    zoomKeyHeld = true;
    zoomActivationTime = performance.now();
    animateZoom(zoom, ZOOM_OUT_MIN, ZOOM_OUT_TIME);

    maxHoldTimer = setTimeout(() => {
      if (zoomKeyHeld) {
        zoomKeyHeld = false;
        returnFromZoom();
      }
    }, MAX_HOLD_TIME);
  }

  function returnFromZoom() {
    if (!zoomAbilityActive) return;

    if (maxHoldTimer !== null) {
      clearTimeout(maxHoldTimer);
      maxHoldTimer = null;
    }

    const heldDuration = performance.now() - zoomActivationTime;

    animateZoom(zoom, NORMAL_ZOOM, ZOOM_IN_TIME, () => {
      zoomAbilityActive = false;
    });

    if (heldDuration >= MIN_HOLD_TIME) {
      zoomAbilityOnCooldown = true;
      cooldownTimer = setTimeout(() => {
        zoomAbilityOnCooldown = false;
        cooldownTimer = null;
      }, COOLDOWN_TIME);
    }
  }

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== ZOOM_KEY) return;
    if (event.repeat) return;
    event.preventDefault();
    activateZoomAbility();
  });

  window.addEventListener("keyup", (event) => {
    if (event.key.toLowerCase() !== ZOOM_KEY) return;
    event.preventDefault();
    if (!zoomAbilityActive) return;
    zoomKeyHeld = false;
    returnFromZoom();
  });

  function seededRandom(x, y) {
    let seed = x * 49632 + y * 325178;
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawMap() {
    const art = getTileArt();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = gameState.map[y][x];
        const tx = Math.floor(x * TILE_SIZE);
        const ty = Math.floor(y * TILE_SIZE);

        if (tile === TileType.WALL) {
          // Only edge treatment on walls that touch a room (8-neighbour check).
          // Everything else stays black (void).
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
          // no solid fill → outside of the wall is black
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

        if (tile === TileType.TRAP) context.fillStyle = "#7f1d1d";
        else if (tile === TileType.DOOR) context.fillStyle = "#92400e";
        else if (tile === TileType.SWITCH) context.fillStyle = "#eab308";
        else continue;

        context.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  function drawProjectiles() {
    if (!gameState || !gameState.projectiles) return;

    for (const projectile of gameState.projectiles) {
      const centerX = projectile.x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = projectile.y * TILE_SIZE + TILE_SIZE / 2;
      context.fillStyle = projectile.color;
      context.beginPath();
      context.arc(centerX, centerY, 8, 0, Math.PI * 2);
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
      const animation = ITEM_ANIMATIONS[item.idName];
      if (!animation || !animation.image) continue;
      if (!animation.image.complete || animation.image.naturalWidth === 0)
        continue;

      const worldW = animation.frameWidth; // 25
      const worldH = animation.frameHeight; // 11
      const bob = Math.round(Math.sin(timestamp / 400) * 2);

      const tileX = item.x * TILE_SIZE;
      const tileY = item.y * TILE_SIZE;
      const drawX = Math.floor(tileX + (TILE_SIZE - worldW) / 2);
      const drawY = Math.floor(tileY + TILE_SIZE - worldH - 10) - bob;

      context.imageSmoothingEnabled = false;
      context.shadowColor = "transparent";
      context.shadowBlur = 0;

      context.fillStyle = "rgba(0, 0, 0, 0.35)";
      context.fillRect(drawX + 2, tileY + TILE_SIZE - 6, worldW - 4, 2);

      context.drawImage(
        animation.image,
        0,
        0,
        worldW,
        worldH,
        drawX,
        drawY,
        worldW,
        worldH
      );
    }
  }

  // ===========================================================================
  // TRAPS (items)
  // A trap is an item in gameState.items with type "trap". Standing on an
  // armed one springs it: damage + a noise that draws nearby enemies.
  // ===========================================================================
  const TRAP_DAMAGE = 10;
  const TRAP_TRIGGER_RADIUS = 0.4; // tiles, straight-line distance
  const TRAP_REARM_MS = 2500;
  const TRAP_NOISE_RADIUS = 6;
  const SEARCH_POINT_COUNT = 3; // spots an alerted enemy checks after losing you
  const SEARCH_RADIUS = 4; // tiles around the last-seen position
  const SEARCH_WAIT_MS = 800; // look around at each spot

  function damagePlayer(amount) {
    const p = gameState.player;
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp <= 0) gameState.gameOver = true;
  }

  function updateTraps(timestamp) {
    if (!gameState || !gameState.items || !gameState.player) return;
    if (gameState.gameOver) return;

    const p = gameState.player;
    for (const item of gameState.items) {
      if (item.type !== "trap") continue;
      if (timestamp < item.sprungUntil) continue; // still re-arming

      if (Math.hypot(p.x - item.x, p.y - item.y) < TRAP_TRIGGER_RADIUS) {
        item.sprungUntil = timestamp + TRAP_REARM_MS;
        damagePlayer(TRAP_DAMAGE);
        makeNoise(item.x, item.y, TRAP_NOISE_RADIUS, "#ef4444");
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

  function drawGameOver() {
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    context.fillStyle = "#ef4444";
    context.font = "16px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("YOU DIED", DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2);
  }
  const hidingSpots = []; // filled per level by placeHidingSpots()
  // ===========================================================================
  // ENEMY VISION & DETECTION
  //
  // Everything here works in continuous world space. Enemies walk in any
  // direction and are blocked only by wall geometry. Tiles are used for just
  // one thing: as a rough navigation graph to route around walls when a
  // straight line is blocked. Enemies then cut straight across open floor
  // toward the furthest waypoint they can see.
  //
  // Two vision cones per enemy:
  //   OUTER (wide, long)    - fills a suspicion meter, but only if the player is
  //                           "exposed" (moving, or standing in light).
  //   INNER (narrow, short) - instant alert.
  // States: patrol (Zz) -> curious (yellow ?) -> alert (red !)
  // ===========================================================================
  const ENEMY_OUTER_RANGE = 5.5; // tiles
  const ENEMY_OUTER_HALF_ANGLE = Math.PI / 3.2; // ~56 deg each side
  const ENEMY_INNER_RANGE = 2.5; // tiles
  const ENEMY_INNER_HALF_ANGLE = Math.PI / 9; // 20 deg each side

  const SUSPICION_FILL_FAR = 0.45; // per second, at the edge of the outer cone
  const SUSPICION_FILL_NEAR = 1.4; // per second, right at the inner range
  const SUSPICION_DECAY = 0.3; // per second when nothing is seen
  const CURIOUS_THRESHOLD = 0.4; // suspicion needed to start investigating

  const PLAYER_EXPOSED_MS = 150; // how long after moving you count as "moving"
  const ALERT_SIGHT_RANGE = 8; // alerted enemies see farther, any angle
  const ALERT_LOSE_TIME = 3000; // ms without sight before giving up the chase
  const CURIOUS_WAIT_MS = 1800; // look around this long after arriving
  const PATROL_WAIT_MS = 1200; // pause at each patrol point
  const HIDE_SEARCH_MS = 1200; // how long an alert enemy checks a hiding spot
  const HIDE_BREAK_DELAY_MS = 1500; // enemy waits this long before smashing
  const ENEMY_SPEED = { patrol: 1.2, curious: 2.0, alert: 2.6 }; // tiles/sec
  const ENEMY_TURN_SPEED = 6; // radians/sec
  const NOISE_RADIUS_SPELL = 7; // tiles
  // --- footsteps & noise ripples ---------------------------------------------
  const FOOTSTEP_RADIUS = { sneak: 0, walk: 0, run: 4.5 }; // tiles heard
  const FOOTSTEP_INTERVAL_MS = { walk: 700, run: 500 };

  const ENEMY_HITBOX = { left: 0.2, right: 0.8, top: 0.2, bottom: 0.8 };
  const ENEMY_ARRIVE_DIST = 0.15; // how close counts as "reached" a point
  const NAV_REPLAN_MS = 200; // how often enemies re-route

  const SHOW_VISION_CONES = true; // set false to hide the cones

  let lastFootstepTime = -Infinity;

  const noiseRipples = []; // { x, y, radius, color, start, duration }

  function spawnRipple(
    x,
    y,
    radius,
    color,
    duration = 500 + radius * 60,
    reach = null
  ) {
    noiseRipples.push({
      x: x + 0.5,
      y: y + 0.75,
      radius,
      color,
      start: performance.now(),
      duration,
      reach, // tiles the sound can reach (null = no clipping)
    });
  }

  // A sound at (x, y): everyone who can hear it (sound travels through open
  // floor, not walls) and isn't already hunting goes to check.
  function makeNoise(x, y, radius, color = "#facc15") {
    if (!gameState || !gameState.enemies) return;

    const reach = soundReach(x, y, radius);
    spawnRipple(x, y, radius, color, undefined, reach);

    for (const e of gameState.enemies) {
      if (e.state === "alert") continue;

      const tileKey = Math.floor(e.y + 0.5) * MAP_WIDTH + Math.floor(e.x + 0.5);
      if (!reach.has(tileKey)) continue;

      startInvestigating(e, x, y);
      e.suspicion = Math.max(e.suspicion, CURIOUS_THRESHOLD);
      spawnRipple(e.x, e.y, 0.7, "#f59e0b", 450); // small "I heard that" ring
    }
  }
  // Hook: put a "torch lit area" test here later. While the player is lit, the
  // outer cone can see them even when standing still.
  function isPlayerInLight() {
    return false;
  }

  function enemyCenter(e) {
    return { x: e.x + 0.5, y: e.y + 0.5 };
  }

  // Middle of the player's hitbox, so sight lines aim at their body.
  // (FIX: this was declared twice in the same block, which is a SyntaxError in
  // strict mode and stopped the whole script from loading. One copy remains.)
  function playerCenter() {
    const p = gameState.player;
    return { x: p.x + 0.5, y: p.y + 0.7 };
  }

  function isWallAt(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
    return gameState.map[ty][tx] === TileType.WALL;
  }

  // Distance a ray travels from (x, y) at `angle` before hitting a wall.
  function castRay(x, y, angle, maxDist) {
    const step = 0.1;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let d = step; d <= maxDist; d += step) {
      if (isWallAt(x + cos * d, y + sin * d)) return d - step;
    }
    return maxDist;
  }

  function hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return true;
    return castRay(ax, ay, Math.atan2(dy, dx), dist) >= dist - 0.001;
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

  // Idle head sweep so enemies don't stare blankly at one spot.
  function lookAround(e, now) {
    e.facing = e.baseFacing + Math.sin(now / 450) * 0.9;
  }

  // --- navigation ------------------------------------------------------------
  // 4-way BFS over walkable tiles. Only used to find a route AROUND walls.
  function findPath(sx, sy, gx, gy) {
    if (!isWalkableTile(gx, gy) || !isWalkableTile(sx, sy)) return null;
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
        if (!isWalkableTile(nx, ny) || prev.has(k)) continue;
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

  // Decide the next point to head for. Straight to the goal if the way is
  // open; otherwise route around walls and aim at the furthest waypoint that
  // can be reached in a straight line (so paths look natural, not gridded).
  function planSteer(e, gx, gy) {
    if (isSegmentClear(e.x, e.y, gx, gy, ENEMY_HITBOX)) {
      return { x: gx, y: gy, isGoal: true };
    }

    // An entity's anchor is its top-left; its centre is +0.5, so the tile it
    // stands on is floor(anchor + 0.5), and a waypoint at a tile centre has
    // anchor (tileX, tileY).
    const path = findPath(
      Math.floor(e.x + 0.5),
      Math.floor(e.y + 0.5),
      Math.floor(gx + 0.5),
      Math.floor(gy + 0.5)
    );
    if (!path || path.length === 0) {
      return { x: gx, y: gy, isGoal: true }; // nowhere better; slide along walls
    }

    let best = path[0];
    let foundClear = false;
    const limit = Math.min(path.length, 16);
    for (let i = 0; i < limit; i++) {
      if (isSegmentClear(e.x, e.y, path[i].x, path[i].y, ENEMY_HITBOX)) {
        best = path[i];
        foundClear = true;
      } else if (foundClear) {
        break;
      }
    }
    return { x: best.x, y: best.y, isGoal: false };
  }

  // Walk toward a point in free space. Returns true once within arriveDist.
  function steerToward(
    e,
    gx,
    gy,
    speed,
    dt,
    arriveDist = ENEMY_ARRIVE_DIST,
    faceMovement = true
  ) {
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
      e.steer.x = gx; // chasing something that moves
      e.steer.y = gy;
    }

    const dx = e.steer.x - e.x;
    const dy = e.steer.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) {
      e.navTimer = 0; // reached this waypoint: plan the next one
      return false;
    }

    if (faceMovement) turnToward(e, Math.atan2(dy, dx), dt);

    const step = Math.min(speed * dt, d);
    if (step > 0) {
      const moved = tryMove(e, (dx / d) * step, (dy / d) * step, ENEMY_HITBOX);
      if (moved < step * 0.25) e.navTimer = 0; // blocked: re-route next frame
    }
    return false;
  }

  // --- state changes ---------------------------------------------------------
  function alertEnemy(e, now) {
    const p = gameState.player;
    e.state = "alert";
    e.suspicion = 1;
    e.canSeePlayer = true;
    e.lastSeen = { x: p.x, y: p.y };
    e.lastSeenTime = now;
    e.arrived = false;
    e.searching = false;
    e.hideSearchTimer = HIDE_SEARCH_MS; // fresh hiding-spot search each alert
    e.steer = null;
  }

  // FIX: there was a second copy of this nested inside updateEnemyAI's alert
  // branch. That one shadowed this one there; its extra line is merged here.
  function startInvestigating(e, x, y) {
    e.state = "curious";
    e.investigate = { x, y };
    e.arrived = false;
    e.waitTimer = 0;
    e.hideSearchTimer = 0;
    e.steer = null;
  }
  // Random reachable floor tiles around a position.
  function pickSearchPoints(cx, cy) {
    const tx = Math.floor(cx + 0.5);
    const ty = Math.floor(cy + 0.5);
    const candidates = [];

    for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
      for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
        const d = Math.hypot(dx, dy);
        if (d < 1.5 || d > SEARCH_RADIUS) continue;
        if (!isWalkableTile(tx + dx, ty + dy)) continue;
        candidates.push({ x: tx + dx, y: ty + dy });
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const points = [];
    for (const c of candidates) {
      if (points.length >= SEARCH_POINT_COUNT) break;
      if (findPath(tx, ty, c.x, c.y)) points.push(c); // must be reachable
    }
    return points;
  }

  function beginSearch(e) {
    e.searching = true;
    e.baseFacing = e.facing;
    e.searchWait = SEARCH_WAIT_MS; // look at the last-seen spot first
    e.searchIndex = 0;
    e.searchPoints = pickSearchPoints(e.lastSeen.x, e.lastSeen.y);
  }

  function updateSearch(e, dt, now) {
    if (e.searchWait > 0) {
      e.searchWait -= dt * 1000;
      lookAround(e, now);
      return;
    }

    const target = e.searchPoints[e.searchIndex];

    if (!target) {
      // Checked everywhere: give up and go back to the patrol route.
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
  // A sound at (x, y): everyone in range who isn't already hunting goes to check.
  // A sound at (x, y): everyone in range who isn't already hunting goes to check.

  // Which tiles can a sound at (x, y) reach within `radius` tiles, travelling
  // only through open floor? Returns Map<tileKey, distance>. Walls block it.
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
        if (!isWalkableTile(nx, ny)) continue;

        // No squeezing diagonally through wall corners.
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
  // Hook for when an alerted enemy catches the player (damage, game over...).
  function onEnemyReachedPlayer(e) {
    // e.g. damagePlayer(10);
  }

  // --- per-frame AI ----------------------------------------------------------
  function updateEnemies(timestamp) {
    const dt =
      lastEnemyTime === null
        ? 0
        : Math.min((timestamp - lastEnemyTime) / 1000, 0.05);
    lastEnemyTime = timestamp;

    if (!gameState || !gameState.enemies || !gameState.player) return;
    if (gameState.gameOver) return;

    for (const e of gameState.enemies) {
      updateEnemyAI(e, dt, timestamp);
    }
  }

  function updateEnemyAI(e, dt, now) {
    const p = gameState.player;
    const ec = enemyCenter(e);
    const pc = playerCenter();
    const dist = Math.hypot(pc.x - ec.x, pc.y - ec.y);
    const angleToPlayer = Math.atan2(pc.y - ec.y, pc.x - ec.x);
    const playerHidden = p.hidden === true;

    // ---- 1. What can I see right now? --------------------------------------
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
      } else if (dist <= ENEMY_INNER_RANGE && diff <= ENEMY_INNER_HALF_ANGLE) {
        alertEnemy(e, now);
      } else if (diff <= ENEMY_OUTER_HALF_ANGLE && isPlayerExposed(now)) {
        seenOuter = true;
      }
    }

    // ---- 2. Suspicion meter ------------------------------------------------
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
        } else if (e.state === "patrol" && e.suspicion >= CURIOUS_THRESHOLD) {
          startInvestigating(e, p.x, p.y);
        } else if (
          e.state === "curious" &&
          (!e.investigate ||
            Math.hypot(e.investigate.x - p.x, e.investigate.y - p.y) > 0.5)
        ) {
          // Still glimpsing them: follow the latest position.
          e.investigate = { x: p.x, y: p.y };
          e.arrived = false;
        }
      } else {
        e.suspicion = Math.max(0, e.suspicion - SUSPICION_DECAY * dt);
      }
    }

    // ---- 3. Behave according to state ---------------------------------------
    if (e.state === "alert") {
      if (e.canSeePlayer) {
        e.lastSeen = { x: p.x, y: p.y };
        e.lastSeenTime = now;
        turnToward(e, angleToPlayer, dt);
      }

      // Saw the player dive in: go and smash the hiding spot.
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
          // Stand at the spot, face it, and count down before smashing.
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

      if (e.canSeePlayer && dist < 0.8) {
        onEnemyReachedPlayer(e);
      } else if (e.searching && !e.canSeePlayer) {
        updateSearch(e, dt, now);
      } else {
        e.searching = false;

        const arrived = steerToward(
          e,
          e.lastSeen.x,
          e.lastSeen.y,
          ENEMY_SPEED.alert,
          dt,
          0.3,
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
      if (!e.arrived) {
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
        }
      } else {
        e.waitTimer -= dt * 1000;
        lookAround(e, now);
        if (e.waitTimer <= 0) {
          // Nothing here. Back to the route, still a little on edge.
          e.state = "patrol";
          e.suspicion = Math.min(e.suspicion, 0.2);
          e.waitTimer = 0;
          e.steer = null;
        }
      }
    } else {
      // patrol: walk a fixed route between points, pausing at each one
      if (e.waitTimer > 0) {
        e.waitTimer -= dt * 1000;
        lookAround(e, now);
      } else {
        const wp = e.patrol[e.patrolIndex];
        if (steerToward(e, wp.x, wp.y, ENEMY_SPEED.patrol, dt)) {
          e.patrolIndex = (e.patrolIndex + 1) % e.patrol.length;
          e.waitTimer = PATROL_WAIT_MS;
          e.baseFacing = e.facing;
        }
      }
    }
  }

  // --- drawing ---------------------------------------------------------------
  function drawVisionCone(e, range, halfAngle, fill) {
    const c = enemyCenter(e);
    const steps = 20;

    context.beginPath();
    context.moveTo(c.x * TILE_SIZE, c.y * TILE_SIZE);
    for (let i = 0; i <= steps; i++) {
      const a = e.facing - halfAngle + (2 * halfAngle * i) / steps;
      const d = castRay(c.x, c.y, a, range); // cones stop at walls
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

  // Pixel-art icons, 1 = filled.
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
    context.fillStyle = "#000"; // outline so it reads on any floor
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

  function drawHidingSpots() {
    for (const spot of hidingSpots) {
      const px = spot.x * TILE_SIZE;
      const py = spot.y * TILE_SIZE;
      const hidingSpots = []; // filled per level by placeHidingSpots()
      context.fillStyle = spot.occupied ? "#1e293b" : HIDE_SPOT_COLOR;

      context.fillRect(px + 5, py + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    }
  }
  const HIDE_ATTACK_REACH = 0.9; // how close an enemy gets to smash a spot
  const HIDE_BREAK_NOISE_RADIUS = 5; // smashing is loud

  function enemyIsNearHiddenPlayer(e) {
    const ec = enemyCenter(e);
    const pc = playerCenter();
    return Math.hypot(pc.x - ec.x, pc.y - ec.y) <= HIDE_SEARCH_RANGE;
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

    // suspicion meter
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

      context.fillStyle = body;
      context.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      // "eye" showing which way the enemy is facing
      const eyeX = Math.round(px + TILE_SIZE / 2 + Math.cos(enemy.facing) * 8);
      const eyeY = Math.round(py + TILE_SIZE / 2 + Math.sin(enemy.facing) * 8);
      context.fillStyle = "#fff";
      context.fillRect(eyeX - 2, eyeY - 2, 4, 4);

      drawEnemyStateIcon(enemy, px, py, now);
    }
  }

  /* HIDING */
  const HIDE_INTERACT_DIST = 0.9;
  const HIDE_SEARCH_RANGE = 1.1;
  const HIDE_SPOT_COLOR = "#334155";

  function isPlayerExposed(now) {
    const p = gameState.player;

    if (p.hidden) return false;

    const moving = now - (p.lastMovedTime ?? -Infinity) < PLAYER_EXPOSED_MS;

    return moving || isPlayerInLight();
  }

  // (FIX: the duplicate playerCenter() that used to be here was removed.)

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
  const HIDE_SPOTS_PER_ROOM = 1;
  const HIDE_SPOT_TYPES = ["closet", "crate"];

  function placeHidingSpots(rooms, map) {
    hidingSpots.length = 0; // mutate in place, it's a const

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

          // Must be on the room's edge, but not a corner.
          const edgeCount = onLeft + onRight + onTop + onBottom;
          if (edgeCount !== 1) continue;

          // Skip tiles where a corridor opens into the room: the tile
          // just outside the wall must be solid.
          const ox = x + (onLeft ? -1 : onRight ? 1 : 0);
          const oy = y + (onTop ? -1 : onBottom ? 1 : 0);
          if (isFloor(ox, oy)) continue;

          candidates.push({ x, y });
        }
      }

      // Shuffle, then take up to N per room.
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      for (const c of candidates.slice(0, HIDE_SPOTS_PER_ROOM)) {
        hidingSpots.push({
          x: c.x,
          y: c.y,
          type: HIDE_SPOT_TYPES[
            Math.floor(Math.random() * HIDE_SPOT_TYPES.length)
          ],
          occupied: false,
        });
      }
    }
  }

  // Is the player inside this enemy's inner (core) cone, with a clear line?
  function isPlayerInCoreCone(e) {
    const ec = enemyCenter(e);
    const pc = playerCenter();
    const dist = Math.hypot(pc.x - ec.x, pc.y - ec.y);
    if (dist > ENEMY_INNER_RANGE) return false;

    const angleToPlayer = Math.atan2(pc.y - ec.y, pc.x - ec.x);
    if (Math.abs(angleDiff(angleToPlayer, e.facing)) > ENEMY_INNER_HALF_ANGLE) {
      return false;
    }
    return hasLineOfSight(ec.x, ec.y, pc.x, pc.y);
  }

  // The spot is destroyed and the player is kicked out. No damage is dealt.
  function breakHidingSpot(spot) {
    const p = gameState.player;

    const idx = hidingSpots.indexOf(spot);
    if (idx !== -1) hidingSpots.splice(idx, 1);
    spot.occupied = false;

    if (p.hidingSpot === spot) {
      p.hidden = false;
      p.hidingSpot = null;
      p.lastMovedTime = performance.now(); // exposed right away
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

    // Who was looking straight at the player as they slipped in?
    // (Checked before the snap, while the player is still where they were.)
    const witnesses = gameState.enemies.filter(isPlayerInCoreCone);

    // Fresh hide: clear any old attack targets and countdowns.
    for (const e of gameState.enemies) {
      e.attackSpot = null;
      e.breakTimer = null;
    }

    p.hidden = true;
    p.hidingSpot = spot;
    p.lastMovedTime = -Infinity;
    spot.occupied = true;

    // Optional: snap the player to the hiding spot.
    p.x = spot.x;
    p.y = spot.y;

    for (const e of witnesses) {
      alertEnemy(e, performance.now());
      e.lastSeen = { x: spot.x, y: spot.y };
      e.attackSpot = spot; // this enemy knows exactly where you are
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
  function drawHidePrompt() {
    if (!gameState || !gameState.player || inventoryOpen) return;
    const p = gameState.player;

    context.font = "12px monospace";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";

    if (p.hidden) {
      context.fillStyle = "#e2e8f0";
      context.fillText("E: Exit", p.x * TILE_SIZE, p.y * TILE_SIZE - 8);
      return;
    }

    const spot = getNearbyHidingSpot();
    if (!spot) return;

    context.fillStyle = "#e2e8f0";
    context.fillText("E: Hide", spot.x * TILE_SIZE, spot.y * TILE_SIZE - 8);
  }

  const RUN_DISPLAY_SCALE = 1.5;
  const RUN_Y_OFFSET = 8;

  function drawPlayer(timestamp) {
    if (!globalPlayer) return;
    const p = gameState.player;

    if (p.hidden) return;
    const gait = globalPlayer.gait || "walk";
    const isMoving =
      timestamp - (globalPlayer.lastMovedTime ?? -Infinity) < MOVE_GRACE_MS;

    // Idle + run held still uses the walk/idle sheet, like Ashlane.
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
      gait === "sneak" ? SNEAK_HAS_IDLE : useRun ? RUN_HAS_IDLE : WALK_HAS_IDLE;

    const animationFrame =
      Math.floor((globalPlayer.walkDistance || 0) / pxPerFrame) % frameCount;

    const sourceColumn = !isMoving
      ? 0
      : hasIdleColumn
      ? animationFrame + 1
      : animationFrame;

    const row = PLAYER_DIRECTION_ROWS[globalPlayer.direction || "down"] ?? 0;
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

  const PICKUP_RADIUS = 0.6; // tiles, straight-line distance

  function pickupNearbyItems() {
    if (!gameState || !globalPlayer) return;

    const remainingItems = [];
    for (const item of gameState.items) {
      // Traps are items too, but they're triggered by stepping on them
      // (see updateTraps), never picked up.
      if (item.type === "trap") {
        remainingItems.push(item);
        continue;
      }

      const distance = Math.hypot(
        item.x - globalPlayer.x,
        item.y - globalPlayer.y
      );

      if (distance < PICKUP_RADIUS) {
        addItemToInventory(item.idName);
        console.log("Picked up:", item.idName);
      } else {
        remainingItems.push(item);
      }
    }
    gameState.items = remainingItems;
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

  function drawInventory() {
    if (!inventoryOpen || !gameState) return;

    const cssWidth = DISPLAY_WIDTH * CANVAS_SCALE; // 768
    const cssHeight = DISPLAY_HEIGHT * CANVAS_SCALE; // 768
    const panelSize = 750;
    const invX = Math.floor((cssWidth - panelSize) / 2);
    const invY = Math.floor((cssHeight - panelSize) / 2);

    context.setTransform(
      devicePixelRatioValue / CANVAS_SCALE,
      0,
      0,
      devicePixelRatioValue / CANVAS_SCALE,
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

        if (slot) {
          const anim = ITEM_ANIMATIONS[slot.type];

          if (anim && anim.image && anim.image.complete) {
            const itemWidth = 90;
            const itemHeight = Math.round(
              itemWidth * (anim.frameHeight / anim.frameWidth)
            );

            const itemX = slotX + Math.floor((SLOT_WIDTH - itemWidth) / 2);
            const itemY = slotY + Math.floor((SLOT_HEIGHT - itemHeight) / 2);

            context.drawImage(
              anim.image,
              0,
              0,
              anim.frameWidth,
              anim.frameHeight,
              itemX,
              itemY,
              itemWidth,
              itemHeight
            );
          }
        }
      }
    }

    const selected = slots[selectedRow * INV_COLS + selectedCol];

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

  function castSpell(dx, dy) {
    if (!gameState || !gameState.player || gameState.gameOver) return;

    const player = gameState.player;
    player.direction = DIR_FROM_VECTOR[`${dx},${dy}`] || player.direction;

    const len = Math.hypot(dx, dy) || 1;

    // Spawn at the middle of the player's body (their hitbox centre is 0.7
    // down the sprite; projectiles draw centred on x+0.5, y+0.5).
    gameState.projectiles.push({
      x: player.x,
      y: player.y + 0.2,
      dx: dx / len,
      dy: dy / len,
      damage: 10,
      color: "#facc15",
    });

    // Casting is loud: nearby enemies come to investigate.
    makeNoise(player.x, player.y, NOISE_RADIUS_SPELL);
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

      // Move in small sub-steps so fast projectiles can't skip past a wall
      // or an enemy between frames.
      const total = PROJECTILE_SPEED * dt;
      const steps = Math.max(1, Math.ceil(total / 0.2));
      const stepX = (pr.dx * total) / steps;
      const stepY = (pr.dy * total) / steps;
      let remove = false;

      for (let s = 0; s < steps && !remove; s++) {
        pr.x += stepX;
        pr.y += stepY;

        if (isWallAt(pr.x + 0.5, pr.y + 0.5)) {
          remove = true;
          break;
        }

        const enemy = gameState.enemies.find(
          (en) => Math.hypot(en.x - pr.x, en.y - pr.y) < PROJECTILE_HIT_RADIUS
        );

        if (enemy) {
          enemy.hp -= pr.damage;
          if (enemy.hp <= 0) {
            gameState.enemies.splice(gameState.enemies.indexOf(enemy), 1);
          } else {
            alertEnemy(enemy, timestamp); // getting shot blows your cover
          }
          remove = true;
        }
      }

      if (remove) gameState.projectiles.splice(i, 1);
    }
  }

  function createGameState(level, existingPlayer, existingScrolls) {
    const newMap = Array.from({ length: MAP_HEIGHT }, () =>
      Array(MAP_WIDTH).fill(TileType.WALL)
    );
    // FIX: removed "gameState.player.hidden = false; ..." from here. gameState
    // is null on the first call, so it threw. The player objects below already
    // set hidden/hidingSpot.

    const rooms = [];
    const ROOM_COUNT = 6;
    const MAX_ROOM_ATTEMPTS = 100;

    function roomsOverlap(roomA, roomB, padding = 1) {
      return (
        roomA.x - padding < roomB.x + roomB.w &&
        roomA.x + roomA.w + padding > roomB.x &&
        roomA.y - padding < roomB.y + roomB.h &&
        roomA.y + roomA.h + padding > roomB.y
      );
    }

    let attempts = 0;
    while (rooms.length < ROOM_COUNT && attempts < MAX_ROOM_ATTEMPTS) {
      attempts++;
      const w = Math.floor(Math.random() * 4) + 4;
      const h = Math.floor(Math.random() * 4) + 4;
      const x = Math.floor(Math.random() * (MAP_WIDTH - w - 2)) + 1;
      const y = Math.floor(Math.random() * (MAP_HEIGHT - h - 2)) + 1;
      const newRoom = { x, y, w, h };

      if (
        rooms.some((existingRoom) => roomsOverlap(newRoom, existingRoom, 1))
      ) {
        continue;
      }

      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          newMap[ry][rx] = TileType.FLOOR;
        }
      }
      rooms.push(newRoom);
    }

    for (let i = 0; i < rooms.length - 1; i++) {
      const cur = rooms[i];
      const next = rooms[i + 1];
      const curX = Math.floor(cur.x + cur.w / 2);
      const curY = Math.floor(cur.y + cur.h / 2);
      const nextX = Math.floor(next.x + next.w / 2);
      const nextY = Math.floor(next.y + next.h / 2);

      for (let x = Math.min(curX, nextX); x <= Math.max(curX, nextX); x++) {
        newMap[curY][x] = TileType.FLOOR;
        if (curY + 1 < newMap.length) newMap[curY + 1][x] = TileType.FLOOR;
      }
      for (let y = Math.min(curY, nextY); y <= Math.max(curY, nextY); y++) {
        newMap[y][nextX] = TileType.FLOOR;
        if (nextX + 1 < newMap[0].length) newMap[y][nextX + 1] = TileType.FLOOR;
      }
    }

    // (Traps are no longer map tiles. They're placed as items below.)

    if (rooms.length === 0) {
      console.error("No rooms were generated.");
      return null;
    }

    const startRoom = rooms[0];
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
        };

    globalPlayer = player;

    const enemies = [];
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const enemyHp = 30 + level * 5;
      enemies.push({
        id: `e-${level}-${i}`,
        x: room.x + Math.floor(room.w / 2),
        y: room.y + Math.floor(room.h / 2),
        hp: enemyHp,
        maxHp: enemyHp,
        type: "enemy",
        color: "#f57676",

        // --- detection / AI state ---
        state: "patrol", // "patrol" | "curious" | "alert"
        suspicion: 0, // 0..1 meter
        facing: Math.floor(Math.random() * 4) * (Math.PI / 2), // radians
        baseFacing: 0,
        canSeePlayer: false,
        steer: null, // point currently being walked toward
        navGoal: null, // goal the steer point was planned for
        navTimer: 0, // ms until the next replan
        searching: false,
        searchPoints: [],
        searchIndex: 0,
        searchWait: 0,
        attackSpot: null,
        breakTimer: null,
        hideSearchTimer: 0,
        // fixed patrol route: two opposite corners of the room
        patrol: [
          { x: room.x + 1, y: room.y + 1 },
          { x: room.x + room.w - 2, y: room.y + room.h - 2 },
        ],
        patrolIndex: 0,
        waitTimer: 0,
        investigate: null, // {x, y} point being checked out
        arrived: false,
        lastSeen: null,
        lastSeenTime: 0,
      });
    }

    const items = [];
    const itemRooms = rooms.slice(1);
    if (itemRooms.length === 0) {
      console.error("No room available for items.");
      return null;
    }

    const possibleScrolls = [
      { idName: "scrollFireBall", tag: "fb" },
      { idName: "scrollFreezeCloud", tag: "fc" },
      { idName: "scrollChainLightning", tag: "cl" },
    ];

    for (let i = 0; i < possibleScrolls.length; i++) {
      const scrollBlueprint = possibleScrolls[i];
      if (Math.random() > 0.5) {
        const scrollRoom =
          itemRooms[Math.floor(Math.random() * itemRooms.length)];
        items.push({
          id: `scroll-${level}-${scrollBlueprint.tag}`,
          x: scrollRoom.x + 1,
          y: scrollRoom.y + 1,
          type: "scroll",
          idName: scrollBlueprint.idName,
        });
      }
    }

    const potionRoom = itemRooms[Math.floor(Math.random() * itemRooms.length)];
    items.push({
      id: `potion-${level}-hp`,
      x: potionRoom.x + 2,
      y: potionRoom.y + 2,
      type: "potion",
      idName: "healthPotion",
      color: "#980002",
    });

    // Traps are items: free-standing hazards placed like any other item,
    // triggered by the player overlapping them (see updateTraps).
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const roomCenterX = Math.floor(room.x + room.w / 2);
      const roomCenterY = Math.floor(room.y + room.h / 2);

      for (let t = 0; t < 4; t++) {
        const trapX = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const trapY = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;

        const taken =
          (trapX === roomCenterX && trapY === roomCenterY) ||
          items.some((it) => it.x === trapX && it.y === trapY);
        if (taken) continue;

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
    placeHidingSpots(rooms, newMap);

    return {
      map: newMap,
      rooms: rooms,
      player: player,
      enemies: enemies,
      items: items,
      inventory: {
        scrollFireBall: [],
        scrollFreezeCloud: [],
        scrollChainLightning: [],
        healthPotion: [],
      },
      projectiles: [],
    };
  }

  window.startGame3 = startGame3;
  window.stopGame3 = stopGame3;
}
