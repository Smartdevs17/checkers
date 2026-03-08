import type { SchemaType as ISchemaType } from "@dojoengine/sdk";
import type { BigNumberish } from "starknet";

// Model: checkers::models::Player
export interface Player {
  player: string;
  username: BigNumberish;
  rating: BigNumberish;
  wins: BigNumberish;
  losses: BigNumberish;
  draws: BigNumberish;
  games_played: BigNumberish;
}

// Model: checkers::models::Game
export interface Game {
  game_id: BigNumberish;
  player_red: string;
  player_black: string;
  current_turn: BigNumberish;
  status: BigNumberish;
  result: BigNumberish;
  result_reason: BigNumberish;
  move_count: BigNumberish;
  moves_since_progress: BigNumberish;
  captured_red: BigNumberish;
  captured_black: BigNumberish;
  last_move_from: BigNumberish;
  last_move_to: BigNumberish;
  draw_offer: BigNumberish;
  mode: BigNumberish;
}

// Model: checkers::models::BoardState
export interface BoardState {
  game_id: BigNumberish;
  board_low: BigNumberish;
  board_high: BigNumberish;
}

// Event: checkers::systems::actions::actions::PlayerRegistered
export interface PlayerRegistered {
  player: string;
  username: BigNumberish;
}

// Event: checkers::systems::actions::actions::GameCreated
export interface GameCreated {
  game_id: BigNumberish;
  player_red: string;
  mode: BigNumberish;
}

// Event: checkers::systems::actions::actions::GameJoined
export interface GameJoined {
  game_id: BigNumberish;
  player_black: string;
}

// Event: checkers::systems::actions::actions::MoveMade
export interface MoveMade {
  game_id: BigNumberish;
  player: string;
  from: BigNumberish;
  to: BigNumberish;
}

// Event: checkers::systems::actions::actions::GameEnded
export interface GameEnded {
  game_id: BigNumberish;
  result: BigNumberish;
  result_reason: BigNumberish;
}

// Event: checkers::systems::actions::actions::DrawOffered
export interface DrawOffered {
  game_id: BigNumberish;
  player: string;
}

// Event: checkers::systems::actions::actions::DrawResponse
export interface DrawResponse {
  game_id: BigNumberish;
  accepted: boolean;
}

export interface SchemaType extends ISchemaType {
  checkers: {
    Player: Player;
    Game: Game;
    BoardState: BoardState;
    PlayerRegistered: PlayerRegistered;
    GameCreated: GameCreated;
    GameJoined: GameJoined;
    MoveMade: MoveMade;
    GameEnded: GameEnded;
    DrawOffered: DrawOffered;
    DrawResponse: DrawResponse;
  };
}

export const schema: SchemaType = {
  checkers: {
    Player: {
      player: "",
      username: 0,
      rating: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      games_played: 0,
    },
    Game: {
      game_id: 0,
      player_red: "",
      player_black: "",
      current_turn: 0,
      status: 0,
      result: 0,
      result_reason: 0,
      move_count: 0,
      moves_since_progress: 0,
      captured_red: 0,
      captured_black: 0,
      last_move_from: 0,
      last_move_to: 0,
      draw_offer: 0,
      mode: 0,
    },
    BoardState: {
      game_id: 0,
      board_low: 0,
      board_high: 0,
    },
    PlayerRegistered: {
      player: "",
      username: 0,
    },
    GameCreated: {
      game_id: 0,
      player_red: "",
      mode: 0,
    },
    GameJoined: {
      game_id: 0,
      player_black: "",
    },
    MoveMade: {
      game_id: 0,
      player: "",
      from: 0,
      to: 0,
    },
    GameEnded: {
      game_id: 0,
      result: 0,
      result_reason: 0,
    },
    DrawOffered: {
      game_id: 0,
      player: "",
    },
    DrawResponse: {
      game_id: 0,
      accepted: false,
    },
  },
};

export enum ModelsMapping {
  Player = "checkers-Player",
  Game = "checkers-Game",
  BoardState = "checkers-BoardState",
  PlayerRegistered = "checkers-PlayerRegistered",
  GameCreated = "checkers-GameCreated",
  GameJoined = "checkers-GameJoined",
  MoveMade = "checkers-MoveMade",
  GameEnded = "checkers-GameEnded",
  DrawOffered = "checkers-DrawOffered",
  DrawResponse = "checkers-DrawResponse",
}
