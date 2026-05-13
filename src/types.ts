/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface Food extends Point {
  type: 'standard' | 'premium' | 'poisonous';
  expiresAt: number; // Timestamp
}

export enum GameStatus {
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  GAME_OVER = "GAME_OVER",
}
