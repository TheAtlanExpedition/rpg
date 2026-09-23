"use strict";

const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;

const TileType = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
  TRAP: 3,
  SWITCH: 4,
};

const canvas = document.getElementById("gameCanvas3");
const context = canvas.getContext("2d");
const gameInfo = document.getElementById("gameInfo");
const restartButton = document.getElementById("restartButton");

canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

let gameRunning = false;
let gameStart = null;

function createGameState(level, existingPlayer, existingScrolls) {
  const newMap = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(TileType.WALL)
  );
  const rooms = [];

  // Generate rooms

for (let i = 0; i < 6; i++) {
  const w = Math.floor(Math.random() * 4) + 4;
  const h = Math.floor(Math.random() * 4) + 4;
  const x = Math.floor(Math.random() * (MAP_WIDTH - w - 2)) + 1;
  const y = Math.floor(Math.random() * (MAP_HEIGHT - h - 2)) + 1;

  for (let ry = y; ry < y + h; ry++) {
    for (let rx = x; rx < x + w; rx++) {
      newMap[ry][rx] = TileType.FLOOR;
    }
  }
  rooms.push({ x, y, w, h });
}
