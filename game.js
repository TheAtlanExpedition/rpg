let gameRunning = false;

const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");

const powerButton = document.querySelector("#powerButton");

const player = {
  x: 100,
  y: 400,
  width: 40,
  height: 40,
  speed: 5,
  color: "#ff3333"
};

const keys = {};

document.addEventListener("keydown", (event) => {
  // Only control the game while it is powered on
  if (!gameRunning) {
    return;
  }

  // Stop the webpage from scrolling with arrow keys or Space
  if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === " "
  ) {
    event.preventDefault();
  }

  keys[event.key] = true;
});

document.addEventListener("keyup", (event) => {
  keys[event.key] = false;
});

function startGame() {
  gameRunning = true;
  powerButton.textContent = "Power Off";
  powerButton.classList.add("on");
}

function stopGame() {
  gameRunning = false;

  // Clear all held keys so the player does not keep moving
  for (const key in keys) {
    keys[key] = false;
  }

  powerButton.textContent = "Power On";
  powerButton.classList.remove("on");

  drawPoweredOffScreen();
}

function updateGame() {
  // Do not update the game while it is powered off
  if (!gameRunning) {
    return;
  }

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    player.x -= player.speed;
  }

  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    player.x += player.speed;
  }

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    player.y -= player.speed;
  }

  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    player.y += player.speed;
  }

  // Keep the player inside the canvas
  player.x = Math.max(
    0,
    Math.min(canvas.width - player.width, player.x)
  );

  player.y = Math.max(
    0,
    Math.min(canvas.height - player.height, player.y)
  );
}

function drawGame() {
  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Sky
  context.fillStyle = "#87ceeb";
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Ground
  context.fillStyle = "#228b22";
  context.fillRect(
    0,
    canvas.height - 70,
    canvas.width,
    70
  );

  // Player
  context.fillStyle = player.color;
  context.fillRect(
    player.x,
    player.y,
    player.width,
    player.height
  );
}

function drawPoweredOffScreen() {
  context.fillStyle = "#111827";
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.fillStyle = "#9ca3af";
  context.font = "24px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillText(
    "Press Power On to Start",
    canvas.width / 2,
    canvas.height / 2
  );
}

function gameLoop() {
  updateGame();

  if (gameRunning) {
    drawGame();
  }

  requestAnimationFrame(gameLoop);
}

powerButton.addEventListener("click", () => {
  if (gameRunning) {
    stopGame();
  } else {
    startGame();
  }
});

// Start with the game powered off
drawPoweredOffScreen();

// Keep the animation loop running, but the game itself starts off
gameLoop();
