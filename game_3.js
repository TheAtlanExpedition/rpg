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

  const devicePixelRatioValue = window.devicePixelRatio || 1;
  const RENDER_SCALE = 3;
  const CANVAS_SCALE = 3;

  canvas.style.width = `${DISPLAY_WIDTH * CANVAS_SCALE}px`;
  canvas.style.height = `${DISPLAY_HEIGHT * CANVAS_SCALE}px`;
  canvas.style.imageRendering = "pixelated";

  canvas.width = Math.round(DISPLAY_WIDTH * devicePixelRatioValue);
  canvas.height = Math.round(DISPLAY_HEIGHT * devicePixelRatioValue);

  context.setTransform(
    devicePixelRatioValue,
    0,
    0,
    devicePixelRatioValue,
    0,
    0
  );

  context.imageSmoothingEnabled = false;

  const PLAYER_WIDTH = 16;
  const PLAYER_HEIGHT = 30;
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

  const PLAYER_SPRITES = {
    up: new Image(),
    down: new Image(),
    left: new Image(),
    right: new Image(),
  };

  const ITEM_SPRITES = {
    healthPotion: new Image(),
    scrollFireBall: new Image(),
    scrollFreezeCloud: new Image(),
    scrollChainLightning: new Image(),
  };

  const SPRITE_FRAME_WIDTH = 13;
  const SPRITE_FRAME_HEIGHT = 30;

  PLAYER_SPRITES.up.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-up-idle-4frame.png";
  PLAYER_SPRITES.down.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/mage-colours(STILL)(13x30).png";
  PLAYER_SPRITES.left.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-idle-left-4frame.png";
  PLAYER_SPRITES.right.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-idle-right-4frame.png";

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
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/ui/inventoryScreen%2Bhealth-0.1.png";

  const ITEM_ANIMATIONS = {
    scrollFireBall: {
      image: ITEM_SPRITES.scrollFireBall,
      frames: 1,
      frameWidth:25,
      frameHeight: 11,
    },
    scrollFreezeCloud: {
      image: ITEM_SPRITES.scrollFreezeCloud,
      frames: 1,
      frameWidth:25,
      frameHeight: 11,
    },
    scrollChainLightning: {
      image: ITEM_SPRITES.scrollChainLightning,
      frames: 1,
      frameWidth:25,
      frameHeight: 11,
    },
    healthPotion: {
      image: ITEM_SPRITES.healthPotion,
      frames: 1,
      frameWidth:25,
      frameHeight: 11,
    },
  };

  const ITEM_ANIMATION_FPS = 2;
  const PLAYER_MOVE_INTERVAL = 150;
  const PROJECTILE_MOVE_INTERVAL = PLAYER_MOVE_INTERVAL / 2;
  let lastPlayerMoveTime = 0;

  let gameRunning = false;
  let gameStart = null;
  let globalPlayer = null;
  let gameState = null;

  let inventoryOpen = false;
  let selectedCol = 0;
  let selectedRow = 0;

  const INV_COLS = 8;
  const INV_ROWS = 7;

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

  let movementInterval = null;
  const heldMoveKeys = [];

  function currentMoveDirection() {
    if (heldMoveKeys.length === 0) return null;
    return moveKeys[heldMoveKeys[heldMoveKeys.length - 1]] || null;
  }

  function startMovementLoop() {
    if (movementInterval === null) {
      moveWhileHeld();
      movementInterval = setInterval(moveWhileHeld, 150);
    }
  }

  function stopMovementLoop() {
    if (movementInterval !== null) {
      clearInterval(movementInterval);
      movementInterval = null;
    }
  }

  function moveWhileHeld() {
    const direction = currentMoveDirection();
    if (!direction || inventoryOpen) return;
    const [dx, dy] = direction;
    movePlayer(dx, dy, performance.now());
  }

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
      if (!heldMoveKeys.includes(key)) {
        heldMoveKeys.push(key);
      }
      startMovementLoop();
      return;
    }

    const fireDirection = fireKeys[event.key];
    if (fireDirection) {
      event.preventDefault();
      const [dx, dy] = fireDirection;
      castSpell(dx, dy);
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();

    if (moveKeys[key]) {
      const index = heldMoveKeys.indexOf(key);
      if (index !== -1) {
        heldMoveKeys.splice(index, 1);
      }

      if (heldMoveKeys.length === 0) {
        stopMovementLoop();
      }
    }
  });


  function startGame3() {
    gameStart = performance.now();

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

    updateProjectiles(timestamp);
    pickupNearbyItems();
    drawGame(timestamp);

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  const playerAnimation = {
    currentFrame: 0,
    totalFrames: 4,
    tickCount: 0,
    ticksPerFrame: 30,
  };

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
    context.fillStyle = "#222";
    context.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    context.save();
    context.translate(
      Math.floor(DISPLAY_WIDTH / 2),
      Math.floor(DISPLAY_HEIGHT / 2)
    );
    context.scale(zoom, zoom);
    context.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    drawMap();
    drawItems(timestamp);
    drawProjectiles();
    drawEnemies();
    drawPlayer();

    context.restore();
    context.setTransform(
  devicePixelRatioValue / CANVAS_SCALE,
  0,
  0,
  devicePixelRatioValue / CANVAS_SCALE,
  0,
  0
);
    drawInventory();
  }

  const ZOOM_KEY = "shift";
  const NORMAL_ZOOM = 1;
  const ZOOM_OUT_MIN = VIEW_TILES_X / (VIEW_TILES_X + 3);
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

  function drawMap() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = gameState.map[y][x];

        if (tile === TileType.WALL) {
          context.fillStyle = "#1f2937";
        } else if (tile === TileType.FLOOR) {
          context.fillStyle = "#9ca3af";
        } else if (tile === TileType.TRAP) {
          context.fillStyle = "#7f1d1d";
        } else if (tile === TileType.DOOR) {
          context.fillStyle = "#92400e";
        } else if (tile === TileType.SWITCH) {
          context.fillStyle = "#eab308";
        }

        context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        context.strokeStyle = "#111827";
        context.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
      const animation = ITEM_ANIMATIONS[item.idName];
      if (!animation || !animation.image) continue;
      if (!animation.image.complete || animation.image.naturalWidth === 0) continue;

      const worldW = animation.frameWidth;   // 25
      const worldH = animation.frameHeight;  // 11
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
        0, 0, worldW, worldH,
        drawX, drawY, worldW, worldH
      );
    }
  }

  function drawEnemies() {
    for (const enemy of gameState.enemies || []) {
      context.fillStyle = enemy.color || "#ef4444";
      context.fillRect(
        enemy.x * TILE_SIZE + 4,
        enemy.y * TILE_SIZE + 4,
        TILE_SIZE - 8,
        TILE_SIZE - 8
      );
    }
  }

  function drawPlayer() {
    if (!globalPlayer) return;

    const activeSprite = PLAYER_SPRITES[globalPlayer.direction];
    if (!activeSprite || !activeSprite.complete) return;

    const xOffset = (TILE_SIZE - globalPlayer.width) / 2;
    const pixelX = globalPlayer.x * TILE_SIZE + xOffset;
    const pixelY = globalPlayer.y * TILE_SIZE;

    playerAnimation.tickCount++;
    if (playerAnimation.tickCount >= playerAnimation.ticksPerFrame) {
      playerAnimation.tickCount = 0;
      playerAnimation.currentFrame =
        (playerAnimation.currentFrame + 1) % playerAnimation.totalFrames;
    }

    const framesPerRow = 4;
    const col = playerAnimation.currentFrame % framesPerRow;
    const row = Math.floor(playerAnimation.currentFrame / framesPerRow);

    context.imageSmoothingEnabled = false;
    context.drawImage(
      activeSprite,
      col * SPRITE_FRAME_WIDTH,
      row * SPRITE_FRAME_HEIGHT,
      SPRITE_FRAME_WIDTH,
      SPRITE_FRAME_HEIGHT,
      pixelX,
      pixelY,
      globalPlayer.width,
      globalPlayer.height
    );
  }

  function movePlayer(dx, dy, timestamp) {
    if (!gameState || !gameState.player || gameState.gameOver) return;
    if (timestamp - lastPlayerMoveTime < PLAYER_MOVE_INTERVAL) return;

    lastPlayerMoveTime = timestamp;

    const player = gameState.player;
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
    if (gameState.map[newY][newX] === TileType.WALL) return;

    player.x = newX;
    player.y = newY;

    if (dx < 0) player.direction = "left";
    else if (dx > 0) player.direction = "right";
    else if (dy < 0) player.direction = "up";
    else if (dy > 0) player.direction = "down";

    globalPlayer = player;
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

  function pickupNearbyItems() {
    if (!gameState || !globalPlayer) return;

    const remainingItems = [];
    for (const item of gameState.items) {
      const distance =
        Math.abs(item.x - globalPlayer.x) + Math.abs(item.y - globalPlayer.y);

      if (distance <= 0) {
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

  const cssWidth = DISPLAY_WIDTH * CANVAS_SCALE;   // 768
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
      0, 0, itemSpritesheet.naturalWidth, itemSpritesheet.naturalHeight,
      invX, invY, panelSize, panelSize
    );
  }

  const SLOT_SRC_X = 164;
  const SLOT_SRC_Y = 213;
  const SLOT_SRC_SIZE = 49;
  const SLOT_SRC_STEP_X = 53;
  const SLOT_SRC_STEP_Y = 57;
  const ITEM_SRC_SIZE = 32;

  const slots = getInventorySlots();

  for (let row = 0; row < INV_ROWS; row++) {
    for (let col = 0; col < INV_COLS; col++) {
      const slot = slots[row * INV_COLS + col];
      const sx = invX + SLOT_SRC_X + col * SLOT_SRC_STEP_X;
      const sy = invY + SLOT_SRC_Y + row * SLOT_SRC_STEP_Y;

      if (col === selectedCol && row === selectedRow) {
        context.strokeStyle = "#ffeb3b";
        context.lineWidth = 2;
        context.strokeRect(sx, sy, SLOT_SRC_SIZE, SLOT_SRC_SIZE);
      }

      if (slot) {
        const anim = ITEM_ANIMATIONS[slot.type];
        const destX = sx + Math.floor((SLOT_SRC_SIZE - ITEM_SRC_SIZE) / 2);
        const destY = sy + Math.floor((SLOT_SRC_SIZE - ITEM_SRC_SIZE) / 2);

                if (anim && anim.image && anim.image.complete) {
          const itemSizeW = SLOT_SRC_SIZE - 8;
          const itemSizeH = Math.round(itemSizeW * (anim.frameHeight / anim.frameWidth));
          const destX = sx + Math.floor((SLOT_SRC_SIZE - itemSizeW) / 2);
          const destY = sy + Math.floor((SLOT_SRC_SIZE - itemSizeH) / 2);

          context.drawImage(
            anim.image,
            0, 0, anim.frameWidth, anim.frameHeight,
            destX, destY,
            itemSizeW, itemSizeH
          );
        }

        if (slot.count > 1) {
          context.fillStyle = "#fff";
          context.font = "16px Arial";
          context.textAlign = "right";
          context.textBaseline = "bottom";
          context.fillText(String(slot.count), sx + SLOT_SRC_SIZE - 2, sy + SLOT_SRC_SIZE - 2);
        }
      }
    }
  }

  const selected = slots[selectedRow * INV_COLS + selectedCol];
  context.fillStyle = "#fff";
  context.font = "16px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    selected ? formatItemName(selected.type) : "Empty",
    invX + panelSize / 2,
    invY + panelSize - 36
  );
}

  function castSpell(dx, dy) {
    if (!gameState || !gameState.player || gameState.gameOver) return;

    const player = gameState.player;
    player.direction =
      dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";

    gameState.projectiles.push({
      x: player.x,
      y: player.y,
      dx,
      dy,
      speed: 1,
      moveInterval: PROJECTILE_MOVE_INTERVAL,
      nextMoveTime: 0,
      damage: 10,
      color: "#facc15",
    });
  }

  function updateProjectiles(timestamp) {
    if (!gameState || !gameState.projectiles) return;

    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
      const projectile = gameState.projectiles[i];
      if (timestamp < projectile.nextMoveTime) continue;

      projectile.nextMoveTime = timestamp + projectile.moveInterval;
      projectile.x += projectile.dx;
      projectile.y += projectile.dy;

      if (
        projectile.x < 0 ||
        projectile.x >= MAP_WIDTH ||
        projectile.y < 0 ||
        projectile.y >= MAP_HEIGHT
      ) {
        gameState.projectiles.splice(i, 1);
        continue;
      }

      if (gameState.map[projectile.y][projectile.x] === TileType.WALL) {
        gameState.projectiles.splice(i, 1);
        continue;
      }

      const enemy = gameState.enemies.find(
        (enemy) => enemy.x === projectile.x && enemy.y === projectile.y
      );

      if (enemy) {
        enemy.hp -= projectile.damage;
        if (enemy.hp <= 0) {
          gameState.enemies.splice(gameState.enemies.indexOf(enemy), 1);
        }
        gameState.projectiles.splice(i, 1);
      }
    }
  }

  function createGameState(level, existingPlayer, existingScrolls) {
    const newMap = Array.from({ length: MAP_HEIGHT }, () =>
      Array(MAP_WIDTH).fill(TileType.WALL)
    );

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

      if (rooms.some((existingRoom) => roomsOverlap(newRoom, existingRoom, 1))) {
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

    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      for (let t = 0; t < 4; t++) {
        const trapX = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const trapY = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        const roomCenterX = Math.floor(room.x + room.w / 2);
        const roomCenterY = Math.floor(room.y + room.h / 2);
        if (trapX !== roomCenterX || trapY !== roomCenterY) {
          newMap[trapY][trapX] = TileType.TRAP;
        }
      }
    }

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
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
        }
      : {
          id: "player",
          x: startRoom.x + 1,
          y: startRoom.y + 1,
          hp: 100,
          maxHp: 100,
          type: "player",
          direction: "down",
          color: "#3b82f6",
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
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
        const scrollRoom = itemRooms[Math.floor(Math.random() * itemRooms.length)];
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
