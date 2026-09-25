"use strict";
{
  // Game window creation
  const canvas = document.getElementById("gameCanvas3");
  const context = canvas.getContext("2d");

  const TILE_SIZE = 64;
  const MAP_WIDTH = 25;
  const MAP_HEIGHT = 20;

  const PLAYER_WIDTH = 32;
  const PLAYER_HEIGHT = 64;
  const ITEM_SIZE = 32;

  const VIEW_TILES_X = 5;
  const VIEW_TILES_Y = 5;

  let zoom = 1;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  const TileType = {
    WALL: 0,
    FLOOR: 1,
    DOOR: 2,
    TRAP: 3,
    SWITCH: 4,
  };
  let gameLoopId = null;
  // Player Sprites (Pre-load)
  const PLAYER_SPRITES = {
    up: new Image(),
    down: new Image(),
    left: new Image(),
    right: new Image(),
  };
  const ITEM_SPRITES = {
    HealthPotion: new Image(),
    ScrollFireBall: new Image(),
    ScrollFreezeCloud: new Image(),
    ScrollChainLightning: new Image(),
  };
  const SPRITE_FRAME_WIDTH = 16;
  const SPRITE_FRAME_HEIGHT = 32;
  // Sprite Location
  PLAYER_SPRITES.up.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-up-idle-4frame.png";
  PLAYER_SPRITES.down.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-idle-down-4frame.png";
  PLAYER_SPRITES.left.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-idle-left-4frame.png";
  PLAYER_SPRITES.right.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/characters/player/green-mage-idle-right-4frame.png";

  ITEM_SPRITES.HealthPotion.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/bb830fd6234e9dbabdefddcc4d706d9aa52b3fd7/assets/sprites/items/Potion-1.svg";
  ITEM_SPRITES.ScrollFireBall.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/fireBall-scroll-floating2-SS.png";
  ITEM_SPRITES.ScrollFreezeCloud.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/freezeCloud-scroll-floating-SS.png";
  ITEM_SPRITES.ScrollChainLightning.src =
    "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/refs/heads/main/assets/sprites/items/chainLightning-scroll-floating2-SS.png";

  for (const [name, image] of Object.entries(ITEM_SPRITES)) {
    image.onload = () => {
      console.log(
        name,
        "loaded:",
        image.naturalWidth,
        "x",
        image.naturalHeight
      );
    };

    image.onerror = () => {
      console.error("Failed to load:", name, image.src);
    };
  }

  const ITEM_ANIMATIONS = {
    ScrollFireBall: {
      image: ITEM_SPRITES.ScrollFireBall,
      frames: 4,
      frameWidth: 16,
      frameHeight: 16,
    },
    ScrollFreezeCloud: {
      image: ITEM_SPRITES.ScrollFreezeCloud,
      frames: 4,
      frameWidth: 16,
      frameHeight: 16,
    },
    ScrollChainLightning: {
      image: ITEM_SPRITES.ScrollChainLightning,
      frames: 4,
      frameWidth: 16,
      frameHeight: 16,
    },
    HealthPotion: {
      image: ITEM_SPRITES.HealthPotion,
      frames: 4,
      frameWidth: 16,
      frameHeight: 16,
    },
  };
  const ITEM_ANIMATION_FPS = 2;

  const PLAYER_MOVE_INTERVAL = 250;
  const PROJECTILE_MOVE_INTERVAL = PLAYER_MOVE_INTERVAL / 2;
  let lastPlayerMoveTime = 0;

  // HTML canvas set up
  const game3Info = document.getElementById("game3Info");
  const restartButton = document.getElementById("game3restartButton");

  // Controls: WASD = move, Arrow keys = fire
  window.addEventListener("keydown", (event) => {
    if (!gameRunning) return;

    const moveKeys = {
      w: [0, -1],
      W: [0, -1],
      s: [0, 1],
      S: [0, 1],
      a: [-1, 0],
      A: [-1, 0],
      d: [1, 0],
      D: [1, 0],
    };

    if (moveKeys[event.key]) {
      event.preventDefault();

      const [dx, dy] = moveKeys[event.key];
      movePlayer(dx, dy, performance.now());

      return;
    }

    const fireKeys = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };

    if (fireKeys[event.key]) {
      event.preventDefault();
      const [dx, dy] = fireKeys[event.key];
      castSpell(dx, dy);
    }
  });

  if (restartButton) {
    restartButton.addEventListener("click", () => {
      initGame(1);
      gameRunning = true;
    });
  }

  let gameRunning = false;
  let gameStart = null;
  let globalPlayer = null;
  let gameState = null;

  function startGame3() {
    gameStart = performance.now();
    gameRunning = true;
    gameState = createGameState(1, null, []);

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function stopGame3() {
    gameRunning = false;
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
  }

  canvas.width = VIEW_TILES_X * TILE_SIZE;
  canvas.height = VIEW_TILES_Y * TILE_SIZE;

  function getCamera() {
    if (!globalPlayer) {
      return { x: 0, y: 0 };
    }

    return {
      x: (globalPlayer.x + 0.5) * TILE_SIZE,
      y: (globalPlayer.y + 0.5) * TILE_SIZE,
    };
  }

  function gameLoop(timestamp) {
    if (!gameRunning) return;

    updateProjectiles(timestamp);
    drawGame(timestamp);

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  // Player Animations
  const playerAnimation = {
    currentFrame: 0,
    totalFrames: 4,
    tickCount: 0,
    ticksPerFrame: 30,
  };

  function drawGame(timestamp) {
    if (!gameState || !globalPlayer) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#222";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const camera = getCamera();

    context.save();

    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(zoom, zoom);
    context.translate(-camera.x, -camera.y);

    drawMap();
    drawItems(timestamp);
    drawProjectiles();
    drawEnemies();
    drawPlayer();

    context.restore();
  }

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    if (event.deltaY < 0) {
      zoom += 0.1;
    } else {
      zoom -= 0.1;
    }

    /* zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)); */
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
      const tileX = item.x * TILE_SIZE;
      const tileY = item.y * TILE_SIZE;

      const pixelX = tileX + (TILE_SIZE - ITEM_SIZE) / 2;
      const pixelY = tileY + (TILE_SIZE - ITEM_SIZE) / 2;

      const animation = ITEM_ANIMATIONS[item.idName];

      if (!animation) {
        console.warn("Missing animation:", item.idName);
        continue;
      }

      const image = animation.image;

      if (!image) {
        console.warn("No image object for:", item.idName);
        continue;
      }

      if (!image.complete || image.naturalWidth === 0) {
        console.warn("Image did not load:", item.idName, image.src);
        continue;
      }

      const frame =
        Math.floor((timestamp / 1000) * ITEM_ANIMATION_FPS) % animation.frames;

      const sourceX = frame * animation.frameWidth;
      const sourceY = 0;

      context.imageSmoothingEnabled = false;

      context.drawImage(
        image,
        sourceX,
        sourceY,
        animation.frameWidth,
        animation.frameHeight,
        pixelX,
        pixelY,
        ITEM_SIZE,
        ITEM_SIZE
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

  window.startGame3 = startGame3;
  window.stopGame3 = stopGame3;

  // Sprite generation to canvas
  function drawPlayer() {
    if (!globalPlayer) return;

    const activeSprite = PLAYER_SPRITES[globalPlayer.direction];
    if (!activeSprite || !activeSprite.complete) return;

    const xOffset = (TILE_SIZE - globalPlayer.width) / 2;
    const pixelX = globalPlayer.x * TILE_SIZE + xOffset;
    const pixelY = globalPlayer.y * TILE_SIZE;

    // Advance the player animation
    playerAnimation.tickCount++;

    if (playerAnimation.tickCount >= playerAnimation.ticksPerFrame) {
      playerAnimation.tickCount = 0;

      playerAnimation.currentFrame =
        (playerAnimation.currentFrame + 1) % playerAnimation.totalFrames;
    }

    const framesPerRow = 4;

    const col = playerAnimation.currentFrame % framesPerRow;
    const row = Math.floor(playerAnimation.currentFrame / framesPerRow);

    const srcX = col * SPRITE_FRAME_WIDTH;
    const srcY = row * SPRITE_FRAME_HEIGHT;

    context.drawImage(
      activeSprite,
      srcX,
      srcY,
      SPRITE_FRAME_WIDTH,
      SPRITE_FRAME_HEIGHT,
      pixelX,
      pixelY,
      globalPlayer.width,
      globalPlayer.height
    );
  }

  // Player movement and spells
  function movePlayer(dx, dy, timestamp) {
    if (!gameState || !gameState.player || gameState.gameOver) {
      return;
    }

    if (timestamp - lastPlayerMoveTime < PLAYER_MOVE_INTERVAL) {
      return;
    }

    lastPlayerMoveTime = timestamp;

    const player = gameState.player;
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
      return;
    }

    if (gameState.map[newY][newX] === TileType.WALL) {
      return;
    }

    player.x = newX;
    player.y = newY;

    if (dx < 0) player.direction = "left";
    if (dx > 0) player.direction = "right";
    if (dy < 0) player.direction = "up";
    if (dy > 0) player.direction = "down";
  }

  function castSpell(dx, dy) {
    if (!gameState || !gameState.player || gameState.gameOver) {
      return;
    }

    const player = gameState.player;

    player.direction =
      dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";

    gameState.projectiles.push({
      x: player.x,
      y: player.y,
      dx,
      dy,
      speed: 1, // Move one tile at a time
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

      if (timestamp < projectile.nextMoveTime) {
        continue;
      }

      projectile.nextMoveTime = timestamp + projectile.moveInterval;

      // Move only one tile per update
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
    // Generate rooms
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

      const overlaps = rooms.some((existingRoom) =>
        roomsOverlap(newRoom, existingRoom, 1)
      );
      if (overlaps) {
        continue;
      }

      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          newMap[ry][rx] = TileType.FLOOR;
        }
      }
      rooms.push(newRoom);
    }

    // Connect rooms
    for (let i = 0; i < rooms.length - 1; i++) {
      const cur = rooms[i];
      const next = rooms[i + 1];
      const curX = Math.floor(cur.x + cur.w / 2);
      const curY = Math.floor(cur.y + cur.h / 2);
      const nextX = Math.floor(next.x + next.w / 2);
      const nextY = Math.floor(next.y + next.h / 2);

      for (let x = Math.min(curX, nextX); x <= Math.max(curX, nextX); x++) {
        newMap[curY][x] = TileType.FLOOR;
        if (curY + 1 < newMap.length) {
          newMap[curY + 1][x] = TileType.FLOOR;
        }
      }
      for (let y = Math.min(curY, nextY); y <= Math.max(curY, nextY); y++) {
        newMap[y][nextX] = TileType.FLOOR;
        if (nextX + 1 < newMap[0].length) {
          newMap[y][nextX + 1] = TileType.FLOOR;
        }
      }
    }

    // Traps
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const trapCount = 4;
      for (let t = 0; t < trapCount; t++) {
        const trapX = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const trapY = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;

        const roomCenterX = Math.floor(room.x + room.w / 2);
        const roomCenterY = Math.floor(room.y + room.h / 2);

        if (trapX !== roomCenterX || trapY !== roomCenterY) {
          newMap[trapY][trapX] = TileType.TRAP;
        }
      }
    }
    const startRoom = rooms[0];

    // Player creation
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

    // Enemies
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

    // Items
    const items = [];
    // Scrolls
    const possibleScrolls = [
      { idName: "ScrollFireBall", tag: "fb" },
      { idName: "ScrollFreezeCloud", tag: "fc" },
      { idName: "ScrollChainLightning", tag: "cl" },
    ];

    for (let i = 0; i < possibleScrolls.length; i++) {
      const scrollBlueprint = possibleScrolls[i];

      if (Math.random() > 0.5) {
        const scrollRoom =
          rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];

        items.push({
          id: `scroll-${level}-${scrollBlueprint.tag}`,
          x: scrollRoom.x + 1,
          y: scrollRoom.y + 1,
          type: "scroll",
          idName: scrollBlueprint.idName,
        });
      }
    }
    // Potions
    const potionRoom =
      rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
    items.push({
      id: `potion-${level}-hp`,
      x: potionRoom.x + 2,
      y: potionRoom.y + 2,
      type: "potion",
      idName: "HealthPotion",
      color: "#980002",
    });

    console.log("Items created:", items);
    return {
      map: newMap,
      rooms: rooms,
      player: player,
      enemies: enemies,
      items: items,
      projectiles: [],
    };
  }
}
