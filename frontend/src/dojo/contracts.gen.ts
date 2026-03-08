import { DojoProvider, type DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, type BigNumberish } from "starknet";

export function setupWorld(provider: DojoProvider) {
  // register_player(username: felt252)
  const build_actions_registerPlayer_calldata = (
    username: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "register_player",
      calldata: [username],
    };
  };

  const actions_registerPlayer = async (
    snAccount: Account | AccountInterface,
    username: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_registerPlayer_calldata(username),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // create_game(mode: u8) -> u64
  const build_actions_createGame_calldata = (
    mode: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "create_game",
      calldata: [mode],
    };
  };

  const actions_createGame = async (
    snAccount: Account | AccountInterface,
    mode: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_createGame_calldata(mode),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // join_game(game_id: u64)
  const build_actions_joinGame_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "join_game",
      calldata: [gameId],
    };
  };

  const actions_joinGame = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_joinGame_calldata(gameId),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // make_move(game_id: u64, from: u8, to: u8)
  const build_actions_makeMove_calldata = (
    gameId: BigNumberish,
    from: BigNumberish,
    to: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "make_move",
      calldata: [gameId, from, to],
    };
  };

  const actions_makeMove = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish,
    from: BigNumberish,
    to: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_makeMove_calldata(gameId, from, to),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // resign(game_id: u64)
  const build_actions_resign_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "resign",
      calldata: [gameId],
    };
  };

  const actions_resign = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_resign_calldata(gameId),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // offer_draw(game_id: u64)
  const build_actions_offerDraw_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "offer_draw",
      calldata: [gameId],
    };
  };

  const actions_offerDraw = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_offerDraw_calldata(gameId),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // accept_draw(game_id: u64)
  const build_actions_acceptDraw_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "accept_draw",
      calldata: [gameId],
    };
  };

  const actions_acceptDraw = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_acceptDraw_calldata(gameId),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // decline_draw(game_id: u64)
  const build_actions_declineDraw_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "decline_draw",
      calldata: [gameId],
    };
  };

  const actions_declineDraw = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_declineDraw_calldata(gameId),
        "checkers"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return {
    actions: {
      registerPlayer: actions_registerPlayer,
      buildRegisterPlayerCalldata: build_actions_registerPlayer_calldata,
      createGame: actions_createGame,
      buildCreateGameCalldata: build_actions_createGame_calldata,
      joinGame: actions_joinGame,
      buildJoinGameCalldata: build_actions_joinGame_calldata,
      makeMove: actions_makeMove,
      buildMakeMoveCalldata: build_actions_makeMove_calldata,
      resign: actions_resign,
      buildResignCalldata: build_actions_resign_calldata,
      offerDraw: actions_offerDraw,
      buildOfferDrawCalldata: build_actions_offerDraw_calldata,
      acceptDraw: actions_acceptDraw,
      buildAcceptDrawCalldata: build_actions_acceptDraw_calldata,
      declineDraw: actions_declineDraw,
      buildDeclineDrawCalldata: build_actions_declineDraw_calldata,
    },
    provider,
  };
}
