use starknet::ContractAddress;

#[starknet::interface]
pub trait IActions<TContractState> {
    fn register_player(ref self: TContractState, username: felt252);
    fn create_game(ref self: TContractState, mode: u8) -> u64;
    fn join_game(ref self: TContractState, game_id: u64);
    fn make_move(ref self: TContractState, game_id: u64, from: u8, to: u8);
    fn resign(ref self: TContractState, game_id: u64);
    fn offer_draw(ref self: TContractState, game_id: u64);
    fn accept_draw(ref self: TContractState, game_id: u64);
    fn decline_draw(ref self: TContractState, game_id: u64);
}

#[starknet::interface]
pub trait IActionsView<TContractState> {
    fn get_player(
        self: @TContractState, addr: ContractAddress,
    ) -> (felt252, u16, u32, u32, u32, u32);
    fn get_player_count(self: @TContractState) -> u32;
    fn get_player_address(self: @TContractState, index: u32) -> ContractAddress;
    fn get_game(
        self: @TContractState, game_id: u64,
    ) -> (ContractAddress, ContractAddress, u8, u8, u8, felt252, u16, u8, u8, u8, u8);
    fn get_board(self: @TContractState, game_id: u64) -> (u128, u128);
    fn get_square(self: @TContractState, game_id: u64, index: u8) -> u8;
}

// Piece encoding (4-bit nibbles):
// 0 = empty, 1 = red man, 2 = black man, 3 = red king, 4 = black king
//
// Board layout: standard 8x8 checkers, only dark squares (32 playable)
// Index 0 = top-left dark square (row 0, col 1)
// Row 0-2: black starting positions, Row 5-7: red starting positions

#[dojo::contract]
pub mod actions {
    use core::num::traits::Zero;
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use checkers::models::{Player, Game, BoardState};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, Map, StoragePathEntry,
    };
    use starknet::{ContractAddress, get_caller_address};
    use super::{IActions, IActionsView};

    const EMPTY: u8 = 0;
    const RED_MAN: u8 = 1;
    const BLACK_MAN: u8 = 2;
    const RED_KING: u8 = 3;
    const BLACK_KING: u8 = 4;

    const STATUS_WAITING: u8 = 0;
    const STATUS_PLAYING: u8 = 1;
    const STATUS_FINISHED: u8 = 2;

    const RESULT_NONE: u8 = 0;
    const RESULT_RED_WIN: u8 = 1;
    const RESULT_BLACK_WIN: u8 = 2;
    const RESULT_DRAW: u8 = 3;

    const TURN_RED: u8 = 1;
    const TURN_BLACK: u8 = 2;

    const MODE_LOCAL: u8 = 0;
    const MODE_ONLINE: u8 = 1;

    #[storage]
    struct Storage {
        player_count: u32,
        players: Map<u32, ContractAddress>,
        player_in_registry: Map<ContractAddress, bool>,
        game_count: u64,
    }

    // ───────────────── Events ─────────────────

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerRegistered {
        #[key]
        pub player: ContractAddress,
        pub username: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameCreated {
        #[key]
        pub game_id: u64,
        pub player_red: ContractAddress,
        pub mode: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameJoined {
        #[key]
        pub game_id: u64,
        pub player_black: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct MoveMade {
        #[key]
        pub game_id: u64,
        pub player: ContractAddress,
        pub from: u8,
        pub to: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameEnded {
        #[key]
        pub game_id: u64,
        pub result: u8,
        pub result_reason: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DrawOffered {
        #[key]
        pub game_id: u64,
        pub player: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DrawResponse {
        #[key]
        pub game_id: u64,
        pub accepted: bool,
    }

    // ───────────────── Write Functions ─────────────────

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn register_player(ref self: ContractState, username: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let existing: Player = world.read_model(caller);
            assert(existing.username == 0, 'ALREADY_REGISTERED');

            let player = Player {
                player: caller,
                username,
                rating: 1200,
                wins: 0,
                losses: 0,
                draws: 0,
                games_played: 0,
            };
            world.write_model(@player);

            let idx = self.player_count.read();
            self.players.entry(idx).write(caller);
            self.player_count.write(idx + 1);
            self.player_in_registry.entry(caller).write(true);

            world.emit_event(@PlayerRegistered { player: caller, username });
        }

        fn create_game(ref self: ContractState, mode: u8) -> u64 {
            let mut world = self.world_default();
            let caller = get_caller_address();

            assert(mode == MODE_LOCAL || mode == MODE_ONLINE, 'INVALID_MODE');

            let game_id = self.game_count.read() + 1;
            self.game_count.write(game_id);

            let status = if mode == MODE_LOCAL {
                STATUS_PLAYING
            } else {
                STATUS_WAITING
            };

            let player_black = if mode == MODE_LOCAL {
                caller
            } else {
                Zero::zero()
            };

            let game = Game {
                game_id,
                player_red: caller,
                player_black,
                current_turn: TURN_RED,
                status,
                result: RESULT_NONE,
                result_reason: 0,
                move_count: 0,
                moves_since_progress: 0,
                captured_red: 0,
                captured_black: 0,
                last_move_from: 0,
                last_move_to: 0,
                draw_offer: 0,
                mode,
            };
            world.write_model(@game);

            let board = InternalImpl::create_initial_board(game_id);
            world.write_model(@board);

            world.emit_event(@GameCreated { game_id, player_red: caller, mode });

            game_id
        }

        fn join_game(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_WAITING, 'GAME_NOT_WAITING');
            assert(game.mode == MODE_ONLINE, 'NOT_ONLINE_GAME');
            assert(game.player_red != caller, 'CANNOT_JOIN_OWN');

            game.player_black = caller;
            game.status = STATUS_PLAYING;
            world.write_model(@game);

            world.emit_event(@GameJoined { game_id, player_black: caller });
        }

        fn make_move(ref self: ContractState, game_id: u64, from: u8, to: u8) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_PLAYING, 'GAME_NOT_PLAYING');

            if game.mode == MODE_ONLINE {
                if game.current_turn == TURN_RED {
                    assert(caller == game.player_red, 'NOT_YOUR_TURN');
                } else {
                    assert(caller == game.player_black, 'NOT_YOUR_TURN');
                }
            }

            assert(from < 32 && to < 32, 'INVALID_SQUARE');

            let mut board: BoardState = world.read_model(game_id);

            let piece = InternalImpl::get_square(@board, from);
            assert(piece != EMPTY, 'EMPTY_SQUARE');

            let piece_color = InternalImpl::get_piece_color(piece);
            assert(piece_color == game.current_turn, 'NOT_YOUR_PIECE');

            let (from_row, from_col) = InternalImpl::index_to_row_col(from);
            let (to_row, to_col) = InternalImpl::index_to_row_col(to);

            let dest = InternalImpl::get_square(@board, to);
            assert(dest == EMPTY, 'SQUARE_OCCUPIED');

            let row_diff = if to_row > from_row {
                to_row - from_row
            } else {
                from_row - to_row
            };
            let col_diff = if to_col > from_col {
                to_col - from_col
            } else {
                from_col - to_col
            };

            let piece_is_king = InternalImpl::is_king(piece);
            if piece_is_king == 0 {
                if piece_color == TURN_RED {
                    assert(to_row < from_row, 'RED_WRONG_DIRECTION');
                } else {
                    assert(to_row > from_row, 'BLACK_WRONG_DIRECTION');
                }
            }

            let mut captured_count: u8 = 0;
            let mut is_progress_move = false;

            if row_diff == 1 && col_diff == 1 {
                let has_capture = InternalImpl::has_any_capture(@board, game.current_turn);
                assert(!has_capture, 'MUST_CAPTURE');
                if piece_is_king == 0 {
                    is_progress_move = true;
                }
            } else if row_diff == 2 && col_diff == 2 {
                let mid_row = (from_row + to_row) / 2;
                let mid_col = (from_col + to_col) / 2;
                let mid_idx = InternalImpl::row_col_to_index(mid_row, mid_col);
                let mid_piece = InternalImpl::get_square(@board, mid_idx);
                assert(
                    InternalImpl::is_opponent_piece(mid_piece, game.current_turn), 'NO_PIECE_TO_CAPTURE',
                );

                InternalImpl::set_square(ref board, mid_idx, EMPTY);
                captured_count = 1;
                is_progress_move = true;
            } else {
                let (valid, captured_indices, _chain_promoted) = InternalImpl::validate_capture_chain(
                    @board, from, to, piece, game.current_turn,
                );
                assert(valid, 'INVALID_MOVE');

                let captured_span = captured_indices.span();
                let mut i: u32 = 0;
                while i < captured_span.len() {
                    let cap_idx = *captured_span.at(i);
                    InternalImpl::set_square(ref board, cap_idx, EMPTY);
                    i += 1;
                };
                captured_count = captured_span.len().try_into().unwrap();
                is_progress_move = true;
            }

            InternalImpl::set_square(ref board, from, EMPTY);
            let mut final_piece = piece;

            if InternalImpl::should_promote(piece, to_row) {
                final_piece = InternalImpl::promote_piece(piece);
            }

            InternalImpl::set_square(ref board, to, final_piece);

            if game.current_turn == TURN_RED {
                game.captured_black = game.captured_black + captured_count;
            } else {
                game.captured_red = game.captured_red + captured_count;
            }

            game.move_count = game.move_count + 1;
            if is_progress_move {
                game.moves_since_progress = 0;
            } else {
                game.moves_since_progress = game.moves_since_progress + 1;
            }

            game.last_move_from = from;
            game.last_move_to = to;
            game.draw_offer = 0;

            let next_turn = if game.current_turn == TURN_RED {
                TURN_BLACK
            } else {
                TURN_RED
            };
            game.current_turn = next_turn;

            world.write_model(@board);

            if game.moves_since_progress >= 80 {
                InternalImpl::end_game(ref self, ref world, ref game, RESULT_DRAW, '40_MOVE_RULE');
                world.write_model(@game);
                world.emit_event(@MoveMade { game_id, player: caller, from, to });
                return;
            }

            let opp_has_pieces = InternalImpl::opponent_has_pieces(@board, next_turn);
            if !opp_has_pieces {
                let win_result = if next_turn == TURN_RED {
                    RESULT_BLACK_WIN
                } else {
                    RESULT_RED_WIN
                };
                InternalImpl::end_game(ref self, ref world, ref game, win_result, 'ALL_CAPTURED');
                world.write_model(@game);
                world.emit_event(@MoveMade { game_id, player: caller, from, to });
                return;
            }

            let opp_has_moves = InternalImpl::has_valid_moves(@board, next_turn);
            if !opp_has_moves {
                let win_result = if next_turn == TURN_RED {
                    RESULT_BLACK_WIN
                } else {
                    RESULT_RED_WIN
                };
                InternalImpl::end_game(ref self, ref world, ref game, win_result, 'NO_MOVES');
                world.write_model(@game);
                world.emit_event(@MoveMade { game_id, player: caller, from, to });
                return;
            }

            world.write_model(@game);
            world.emit_event(@MoveMade { game_id, player: caller, from, to });
        }

        fn resign(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_PLAYING, 'GAME_NOT_PLAYING');

            let result = if caller == game.player_red {
                RESULT_BLACK_WIN
            } else {
                RESULT_RED_WIN
            };

            InternalImpl::end_game(ref self, ref world, ref game, result, 'RESIGNATION');
            world.write_model(@game);
        }

        fn offer_draw(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_PLAYING, 'GAME_NOT_PLAYING');

            if caller == game.player_red {
                game.draw_offer = TURN_RED;
            } else {
                game.draw_offer = TURN_BLACK;
            }

            world.write_model(@game);
            world.emit_event(@DrawOffered { game_id, player: caller });
        }

        fn accept_draw(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_PLAYING, 'GAME_NOT_PLAYING');
            assert(game.draw_offer != 0, 'NO_DRAW_OFFER');

            if caller == game.player_red {
                assert(game.draw_offer != TURN_RED, 'CANNOT_ACCEPT_OWN');
            } else {
                assert(game.draw_offer != TURN_BLACK, 'CANNOT_ACCEPT_OWN');
            }

            InternalImpl::end_game(ref self, ref world, ref game, RESULT_DRAW, 'AGREEMENT');
            world.write_model(@game);

            world.emit_event(@DrawResponse { game_id, accepted: true });
        }

        fn decline_draw(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_PLAYING, 'GAME_NOT_PLAYING');
            assert(game.draw_offer != 0, 'NO_DRAW_OFFER');

            game.draw_offer = 0;
            world.write_model(@game);

            world.emit_event(@DrawResponse { game_id, accepted: false });
        }
    }

    // ───────────────── View Functions ─────────────────

    #[abi(embed_v0)]
    impl ActionsViewImpl of IActionsView<ContractState> {
        fn get_player(
            self: @ContractState, addr: ContractAddress,
        ) -> (felt252, u16, u32, u32, u32, u32) {
            let world = self.world_default();
            let p: Player = world.read_model(addr);
            (p.username, p.rating, p.wins, p.losses, p.draws, p.games_played)
        }

        fn get_player_count(self: @ContractState) -> u32 {
            self.player_count.read()
        }

        fn get_player_address(self: @ContractState, index: u32) -> ContractAddress {
            self.players.entry(index).read()
        }

        fn get_game(
            self: @ContractState, game_id: u64,
        ) -> (ContractAddress, ContractAddress, u8, u8, u8, felt252, u16, u8, u8, u8, u8) {
            let world = self.world_default();
            let g: Game = world.read_model(game_id);
            (
                g.player_red,
                g.player_black,
                g.current_turn,
                g.status,
                g.result,
                g.result_reason,
                g.move_count,
                g.captured_red,
                g.captured_black,
                g.draw_offer,
                g.mode,
            )
        }

        fn get_board(self: @ContractState, game_id: u64) -> (u128, u128) {
            let world = self.world_default();
            let b: BoardState = world.read_model(game_id);
            (b.board_low, b.board_high)
        }

        fn get_square(self: @ContractState, game_id: u64, index: u8) -> u8 {
            let world = self.world_default();
            let b: BoardState = world.read_model(game_id);
            InternalImpl::get_square(@b, index)
        }
    }

    // ───────────────── Internal Helpers ─────────────────

    #[generate_trait]
    pub impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"checkers")
        }

        // ── Board packing ──

        fn get_square(board: @BoardState, index: u8) -> u8 {
            assert(index < 32, 'INDEX_OUT_OF_BOUNDS');
            let value = if index < 16 {
                let shift = (index * 4).into();
                (*board.board_low / InternalImpl::pow2_128(shift)) % 16
            } else {
                let shift = ((index - 16) * 4).into();
                (*board.board_high / InternalImpl::pow2_128(shift)) % 16
            };
            value.try_into().unwrap()
        }

        fn set_square(ref board: BoardState, index: u8, value: u8) {
            assert(index < 32, 'INDEX_OUT_OF_BOUNDS');
            let val: u128 = value.into();
            if index < 16 {
                let shift = (index * 4).into();
                let p = InternalImpl::pow2_128(shift);
                let mask = 15_u128 * p;
                board.board_low = (board.board_low & ~mask) | (val * p);
            } else {
                let shift = ((index - 16) * 4).into();
                let p = InternalImpl::pow2_128(shift);
                let mask = 15_u128 * p;
                board.board_high = (board.board_high & ~mask) | (val * p);
            }
        }

        fn pow2_128(exp: u128) -> u128 {
            if exp == 0 {
                return 1;
            }
            let mut result: u128 = 1;
            let mut i: u128 = 0;
            while i < exp {
                result = result * 2;
                i += 1;
            };
            result
        }

        // ── Coordinate conversion ──

        fn index_to_row_col(index: u8) -> (u8, u8) {
            let row = index / 4;
            let pos = index % 4;
            let col = if row % 2 == 0 {
                pos * 2 + 1
            } else {
                pos * 2
            };
            (row, col)
        }

        fn row_col_to_index(row: u8, col: u8) -> u8 {
            let pos = if row % 2 == 0 {
                (col - 1) / 2
            } else {
                col / 2
            };
            row * 4 + pos
        }

        // ── Piece helpers ──

        fn get_piece_color(piece: u8) -> u8 {
            if piece == RED_MAN || piece == RED_KING {
                TURN_RED
            } else if piece == BLACK_MAN || piece == BLACK_KING {
                TURN_BLACK
            } else {
                0
            }
        }

        fn is_king(piece: u8) -> u8 {
            if piece == RED_KING || piece == BLACK_KING {
                1
            } else {
                0
            }
        }

        fn is_own_piece(piece: u8, turn: u8) -> bool {
            if turn == TURN_RED {
                piece == RED_MAN || piece == RED_KING
            } else {
                piece == BLACK_MAN || piece == BLACK_KING
            }
        }

        fn is_opponent_piece(piece: u8, turn: u8) -> bool {
            if piece == EMPTY {
                return false;
            }
            if turn == TURN_RED {
                piece == BLACK_MAN || piece == BLACK_KING
            } else {
                piece == RED_MAN || piece == RED_KING
            }
        }

        fn should_promote(piece: u8, to_row: u8) -> bool {
            if piece == RED_MAN && to_row == 0 {
                true
            } else if piece == BLACK_MAN && to_row == 7 {
                true
            } else {
                false
            }
        }

        fn promote_piece(piece: u8) -> u8 {
            if piece == RED_MAN {
                RED_KING
            } else if piece == BLACK_MAN {
                BLACK_KING
            } else {
                piece
            }
        }

        // ── Move generation ──

        fn get_simple_moves(board: @BoardState, index: u8, piece: u8, turn: u8) -> Array<u8> {
            let mut moves: Array<u8> = array![];
            let (row, col) = InternalImpl::index_to_row_col(index);
            let is_k = InternalImpl::is_king(piece);

            let can_go_up = (turn == TURN_RED || is_k == 1) && row > 0;
            let can_go_down = (turn == TURN_BLACK || is_k == 1) && row < 7;

            if can_go_up {
                if col > 0 {
                    let ti = InternalImpl::row_col_to_index(row - 1, col - 1);
                    if InternalImpl::get_square(board, ti) == EMPTY {
                        moves.append(ti);
                    }
                }
                if col < 7 {
                    let ti = InternalImpl::row_col_to_index(row - 1, col + 1);
                    if InternalImpl::get_square(board, ti) == EMPTY {
                        moves.append(ti);
                    }
                }
            }

            if can_go_down {
                if col > 0 {
                    let ti = InternalImpl::row_col_to_index(row + 1, col - 1);
                    if InternalImpl::get_square(board, ti) == EMPTY {
                        moves.append(ti);
                    }
                }
                if col < 7 {
                    let ti = InternalImpl::row_col_to_index(row + 1, col + 1);
                    if InternalImpl::get_square(board, ti) == EMPTY {
                        moves.append(ti);
                    }
                }
            }

            moves
        }

        fn get_capture_moves(board: @BoardState, index: u8, piece: u8, turn: u8) -> Array<u8> {
            let mut moves: Array<u8> = array![];
            let (row, col) = InternalImpl::index_to_row_col(index);
            let is_k = InternalImpl::is_king(piece);

            let can_go_up = (turn == TURN_RED || is_k == 1) && row >= 2;
            let can_go_down = (turn == TURN_BLACK || is_k == 1) && row <= 5;

            if can_go_up {
                if col >= 2 {
                    let mid = InternalImpl::row_col_to_index(row - 1, col - 1);
                    let dest = InternalImpl::row_col_to_index(row - 2, col - 2);
                    if InternalImpl::is_opponent_piece(InternalImpl::get_square(board, mid), turn)
                        && InternalImpl::get_square(board, dest) == EMPTY {
                        moves.append(dest);
                    }
                }
                if col <= 5 {
                    let mid = InternalImpl::row_col_to_index(row - 1, col + 1);
                    let dest = InternalImpl::row_col_to_index(row - 2, col + 2);
                    if InternalImpl::is_opponent_piece(InternalImpl::get_square(board, mid), turn)
                        && InternalImpl::get_square(board, dest) == EMPTY {
                        moves.append(dest);
                    }
                }
            }

            if can_go_down {
                if col >= 2 {
                    let mid = InternalImpl::row_col_to_index(row + 1, col - 1);
                    let dest = InternalImpl::row_col_to_index(row + 2, col - 2);
                    if InternalImpl::is_opponent_piece(InternalImpl::get_square(board, mid), turn)
                        && InternalImpl::get_square(board, dest) == EMPTY {
                        moves.append(dest);
                    }
                }
                if col <= 5 {
                    let mid = InternalImpl::row_col_to_index(row + 1, col + 1);
                    let dest = InternalImpl::row_col_to_index(row + 2, col + 2);
                    if InternalImpl::is_opponent_piece(InternalImpl::get_square(board, mid), turn)
                        && InternalImpl::get_square(board, dest) == EMPTY {
                        moves.append(dest);
                    }
                }
            }

            moves
        }

        fn has_any_capture(board: @BoardState, turn: u8) -> bool {
            let mut i: u8 = 0;
            let mut found = false;
            while i < 32 {
                let p = InternalImpl::get_square(board, i);
                if InternalImpl::is_own_piece(p, turn) {
                    let captures = InternalImpl::get_capture_moves(board, i, p, turn);
                    if captures.len() > 0 {
                        found = true;
                        break;
                    }
                }
                i += 1;
            };
            found
        }

        fn has_valid_moves(board: @BoardState, turn: u8) -> bool {
            let mut i: u8 = 0;
            let mut found = false;
            while i < 32 {
                let p = InternalImpl::get_square(board, i);
                if InternalImpl::is_own_piece(p, turn) {
                    let simple = InternalImpl::get_simple_moves(board, i, p, turn);
                    if simple.len() > 0 {
                        found = true;
                        break;
                    }
                    let captures = InternalImpl::get_capture_moves(board, i, p, turn);
                    if captures.len() > 0 {
                        found = true;
                        break;
                    }
                }
                i += 1;
            };
            found
        }

        fn opponent_has_pieces(board: @BoardState, turn: u8) -> bool {
            let mut i: u8 = 0;
            let mut found = false;
            while i < 32 {
                let p = InternalImpl::get_square(board, i);
                if InternalImpl::is_own_piece(p, turn) {
                    found = true;
                    break;
                }
                i += 1;
            };
            found
        }

        // ── Multi-jump validation (DFS, bounded depth 12) ──

        fn validate_capture_chain(
            board: @BoardState, from: u8, to: u8, piece: u8, turn: u8,
        ) -> (bool, Array<u8>, bool) {
            let (f, caps, cp) = InternalImpl::dfs_capture(
                *board.board_low, *board.board_high, from, to, piece, turn, 0,
            );
            if f {
                (true, caps, cp)
            } else {
                (false, array![], false)
            }
        }

        fn dfs_capture(
            board_low: u128,
            board_high: u128,
            current: u8,
            target: u8,
            piece: u8,
            turn: u8,
            depth: u8,
        ) -> (bool, Array<u8>, bool) {
            if depth > 12 {
                return (false, array![], false);
            }

            if current == target && depth > 0 {
                return (true, array![], false);
            }

            let temp_board = BoardState { game_id: 0, board_low, board_high };
            let (row, col) = InternalImpl::index_to_row_col(current);
            let is_k = InternalImpl::is_king(piece);

            // Try all 4 diagonal capture directions using u8 math with bounds checks
            // Directions: (-1,-1), (-1,+1), (+1,-1), (+1,+1)
            // We encode each as (up: bool, left: bool)
            let mut dir: u8 = 0;
            while dir < 4 {
                let going_up = dir < 2; // dirs 0,1 go up; dirs 2,3 go down
                let going_left = dir % 2 == 0; // dirs 0,2 go left; dirs 1,3 go right

                // Direction check for non-king
                let dir_ok = if is_k == 1 {
                    true
                } else if turn == TURN_RED {
                    going_up
                } else {
                    !going_up
                };

                if dir_ok {
                    // Bounds check
                    let row_ok = if going_up {
                        row >= 2
                    } else {
                        row <= 5
                    };
                    let col_ok = if going_left {
                        col >= 2
                    } else {
                        col <= 5
                    };

                    if row_ok && col_ok {
                        let mid_row = if going_up {
                            row - 1
                        } else {
                            row + 1
                        };
                        let mid_col = if going_left {
                            col - 1
                        } else {
                            col + 1
                        };
                        let dest_row = if going_up {
                            row - 2
                        } else {
                            row + 2
                        };
                        let dest_col = if going_left {
                            col - 2
                        } else {
                            col + 2
                        };

                        let mid_idx = InternalImpl::row_col_to_index(mid_row, mid_col);
                        let dest_idx = InternalImpl::row_col_to_index(dest_row, dest_col);

                        let mid_piece = InternalImpl::get_square(@temp_board, mid_idx);
                        let dest_piece = InternalImpl::get_square(@temp_board, dest_idx);

                        let dest_empty_or_target = dest_piece == EMPTY || dest_idx == target;

                        if InternalImpl::is_opponent_piece(mid_piece, turn) && dest_empty_or_target {
                            let promotes = InternalImpl::should_promote(piece, dest_row);

                            if promotes {
                                if dest_idx == target {
                                    return (true, array![mid_idx], true);
                                }
                            } else {
                                let mut temp2 = BoardState {
                                    game_id: 0, board_low, board_high,
                                };
                                InternalImpl::set_square(ref temp2, mid_idx, EMPTY);
                                InternalImpl::set_square(ref temp2, current, EMPTY);
                                InternalImpl::set_square(ref temp2, dest_idx, piece);

                                let (sub_found, sub_caps, sub_promoted) = InternalImpl::dfs_capture(
                                    temp2.board_low,
                                    temp2.board_high,
                                    dest_idx,
                                    target,
                                    piece,
                                    turn,
                                    depth + 1,
                                );

                                if sub_found {
                                    let mut caps: Array<u8> = array![mid_idx];
                                    let mut j: u32 = 0;
                                    while j < sub_caps.len() {
                                        caps.append(*sub_caps.at(j));
                                        j += 1;
                                    };
                                    return (true, caps, sub_promoted);
                                }
                            }
                        }
                    }
                }

                dir += 1;
            };

            (false, array![], false)
        }

        // ── Board initialization ──

        fn create_initial_board(game_id: u64) -> BoardState {
            let mut board = BoardState { game_id, board_low: 0, board_high: 0 };

            let mut i: u8 = 0;
            while i < 12 {
                InternalImpl::set_square(ref board, i, BLACK_MAN);
                i += 1;
            };

            let mut i: u8 = 20;
            while i < 32 {
                InternalImpl::set_square(ref board, i, RED_MAN);
                i += 1;
            };

            board
        }

        // ── ELO calculation ──

        fn calculate_elo(rating_a: u16, rating_b: u16, score_a: u16) -> (u16, u16) {
            let diff: i32 = rating_a.into() - rating_b.into();
            let mut expected_a: i32 = 500 + diff * 1000 / 800;

            if expected_a < 50 {
                expected_a = 50;
            }
            if expected_a > 950 {
                expected_a = 950;
            }

            let expected_b: i32 = 1000 - expected_a;

            let score_a_i: i32 = score_a.into();
            let score_b_i: i32 = 1000 - score_a_i;

            let delta_a: i32 = 32 * (score_a_i - expected_a) / 1000;
            let delta_b: i32 = 32 * (score_b_i - expected_b) / 1000;

            let new_a_i: i32 = rating_a.into() + delta_a;
            let new_b_i: i32 = rating_b.into() + delta_b;

            let new_a: u16 = if new_a_i < 100 {
                100
            } else {
                new_a_i.try_into().unwrap()
            };
            let new_b: u16 = if new_b_i < 100 {
                100
            } else {
                new_b_i.try_into().unwrap()
            };

            (new_a, new_b)
        }

        // ── End game ──

        fn end_game(
            ref self: ContractState,
            ref world: dojo::world::WorldStorage,
            ref game: Game,
            result: u8,
            reason: felt252,
        ) {
            game.status = STATUS_FINISHED;
            game.result = result;
            game.result_reason = reason;

            if game.mode == MODE_ONLINE {
                let mut red: Player = world.read_model(game.player_red);
                let mut black: Player = world.read_model(game.player_black);

                red.games_played = red.games_played + 1;
                black.games_played = black.games_played + 1;

                if result == RESULT_RED_WIN {
                    red.wins = red.wins + 1;
                    black.losses = black.losses + 1;

                    let (new_red, new_black) = InternalImpl::calculate_elo(
                        red.rating, black.rating, 1000,
                    );
                    red.rating = new_red;
                    black.rating = new_black;
                } else if result == RESULT_BLACK_WIN {
                    black.wins = black.wins + 1;
                    red.losses = red.losses + 1;

                    let (new_red, new_black) = InternalImpl::calculate_elo(red.rating, black.rating, 0);
                    red.rating = new_red;
                    black.rating = new_black;
                } else {
                    red.draws = red.draws + 1;
                    black.draws = black.draws + 1;

                    let (new_red, new_black) = InternalImpl::calculate_elo(
                        red.rating, black.rating, 500,
                    );
                    red.rating = new_red;
                    black.rating = new_black;
                }

                world.write_model(@red);
                world.write_model(@black);
            }

            world.emit_event(@GameEnded { game_id: game.game_id, result, result_reason: reason });
        }
    }
}
