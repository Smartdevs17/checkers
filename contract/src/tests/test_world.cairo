#[cfg(test)]
mod tests {
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorageTrait, world};
    use dojo_cairo_test::{
        ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
        spawn_test_world,
    };
    use checkers::models::{Player, Game, BoardState, m_Player, m_Game, m_BoardState};
    use checkers::systems::actions::{
        IActionsDispatcher, IActionsDispatcherTrait, IActionsViewDispatcher,
        IActionsViewDispatcherTrait, actions,
    };
    use starknet::ContractAddress;
    use starknet::testing::set_contract_address;

    fn PLAYER1() -> ContractAddress {
        0x1.try_into().unwrap()
    }

    fn PLAYER2() -> ContractAddress {
        0x2.try_into().unwrap()
    }

    fn PLAYER3() -> ContractAddress {
        0x3.try_into().unwrap()
    }

    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "checkers",
            resources: [
                TestResource::Model(m_Player::TEST_CLASS_HASH),
                TestResource::Model(m_Game::TEST_CLASS_HASH),
                TestResource::Model(m_BoardState::TEST_CLASS_HASH),
                TestResource::Event(actions::e_PlayerRegistered::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameCreated::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameJoined::TEST_CLASS_HASH),
                TestResource::Event(actions::e_MoveMade::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameEnded::TEST_CLASS_HASH),
                TestResource::Event(actions::e_DrawOffered::TEST_CLASS_HASH),
                TestResource::Event(actions::e_DrawResponse::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
            ]
                .span(),
        };
        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"checkers", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"checkers")].span()),
        ]
            .span()
    }

    fn setup_world() -> (dojo::world::WorldStorage, IActionsDispatcher) {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions = IActionsDispatcher { contract_address };

        (world, actions)
    }

    fn setup_view(actions: @IActionsDispatcher) -> IActionsViewDispatcher {
        IActionsViewDispatcher { contract_address: *actions.contract_address }
    }

    /// Write models directly using the actions contract address (which has writer permissions).
    /// Restores caller to `restore_to` afterwards.
    fn write_board_and_game(
        ref world: dojo::world::WorldStorage,
        actions: @IActionsDispatcher,
        board: @BoardState,
        game: @Game,
        restore_to: ContractAddress,
    ) {
        set_contract_address(*actions.contract_address);
        world.write_model(board);
        world.write_model(game);
        set_contract_address(restore_to);
    }

    fn write_board(
        ref world: dojo::world::WorldStorage,
        actions: @IActionsDispatcher,
        board: @BoardState,
        restore_to: ContractAddress,
    ) {
        set_contract_address(*actions.contract_address);
        world.write_model(board);
        set_contract_address(restore_to);
    }

    fn write_game(
        ref world: dojo::world::WorldStorage,
        actions: @IActionsDispatcher,
        game: @Game,
        restore_to: ContractAddress,
    ) {
        set_contract_address(*actions.contract_address);
        world.write_model(game);
        set_contract_address(restore_to);
    }

    fn write_player(
        ref world: dojo::world::WorldStorage,
        actions: @IActionsDispatcher,
        player: @Player,
        restore_to: ContractAddress,
    ) {
        set_contract_address(*actions.contract_address);
        world.write_model(player);
        set_contract_address(restore_to);
    }

    // ═══════════════════════════════════════════
    //  Player Registration Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_register_player() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');

        let player: Player = world.read_model(PLAYER1());
        assert(player.username == 'alice', 'Wrong username');
        assert(player.rating == 1200, 'Wrong rating');
        assert(player.wins == 0, 'Wins should be 0');
        assert(player.games_played == 0, 'Games should be 0');
    }

    #[test]
    #[should_panic]
    fn test_cannot_register_twice() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');
        actions.register_player('bob');
    }

    #[test]
    fn test_multiple_players() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');

        set_contract_address(PLAYER2());
        actions.register_player('bob');

        let view = setup_view(@actions);
        assert(view.get_player_count() == 2, 'Count should be 2');
    }

    // ═══════════════════════════════════════════
    //  Game Creation / Joining Tests (6)
    // ═══════════════════════════════════════════

    #[test]
    fn test_create_local_game() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let game: Game = world.read_model(game_id);
        assert(game.status == 1, 'Should be playing');
        assert(game.mode == 0, 'Should be local');
        assert(game.player_red == PLAYER1(), 'Wrong red');
        assert(game.player_black == PLAYER1(), 'Local: black == red');
    }

    #[test]
    fn test_create_online_game() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        let game: Game = world.read_model(game_id);
        assert(game.status == 0, 'Should be waiting');
        assert(game.mode == 1, 'Should be online');
    }

    #[test]
    fn test_join_online_game() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.status == 1, 'Should be playing');
        assert(game.player_black == PLAYER2(), 'Wrong black');
    }

    #[test]
    #[should_panic]
    fn test_cannot_join_own_game() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);
        actions.join_game(game_id);
    }

    #[test]
    #[should_panic]
    fn test_cannot_join_full_game() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        set_contract_address(PLAYER3());
        actions.join_game(game_id);
    }

    #[test]
    #[should_panic]
    fn test_invalid_mode() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.create_game(5);
    }

    // ═══════════════════════════════════════════
    //  Board State Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_initial_black_squares() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let view = setup_view(@actions);
        let mut i: u8 = 0;
        while i < 12 {
            assert(view.get_square(game_id, i) == 2, 'Should be black man');
            i += 1;
        };
    }

    #[test]
    fn test_initial_red_squares() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let view = setup_view(@actions);
        let mut i: u8 = 20;
        while i < 32 {
            assert(view.get_square(game_id, i) == 1, 'Should be red man');
            i += 1;
        };
    }

    #[test]
    fn test_initial_empty_squares() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let view = setup_view(@actions);
        let mut i: u8 = 12;
        while i < 20 {
            assert(view.get_square(game_id, i) == 0, 'Should be empty');
            i += 1;
        };
    }

    // ═══════════════════════════════════════════
    //  Basic Movement Tests (5)
    // ═══════════════════════════════════════════

    #[test]
    fn test_simple_move_red() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 20 (row 5, col 0... wait row 5 odd: pos=0, col=0. (5,0))
        // Move to 16 (row 4, col 1. row 4 even: pos=0, col=1. (4,1))
        // Diag from (5,0) to (4,1) — valid red forward.
        actions.make_move(game_id, 20, 16);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 20) == 0, 'Source should be empty');
        assert(view.get_square(game_id, 16) == 1, 'Dest should be red man');

        let game: Game = world.read_model(game_id);
        assert(game.current_turn == 2, 'Should be black turn');
        assert(game.move_count == 1, 'Move count should be 1');
    }

    #[test]
    fn test_simple_move_black() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red moves
        actions.make_move(game_id, 20, 16);

        // Black at 11 (row 2, col 6. row 2 even: pos=3, col=7. Wait...
        // 11: row=11/4=2, pos=11%4=3. row 2 even: col=3*2+1=7. So (2,7).
        // Move to 15: row=15/4=3, pos=15%4=3. row 3 odd: col=3*2=6. So (3,6).
        // Diag (2,7)->(3,6): valid black forward.
        actions.make_move(game_id, 11, 15);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 11) == 0, 'Source should be empty');
        assert(view.get_square(game_id, 15) == 2, 'Dest should be black man');
    }

    #[test]
    #[should_panic]
    fn test_wrong_piece() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red turn, try to move black piece at 8
        actions.make_move(game_id, 8, 12);
    }

    #[test]
    #[should_panic]
    fn test_occupied_square() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Try to move red at 24 to 20 — but 20 has a red piece, and direction is wrong too.
        // Red at 24 (6,1), try to go to 20 (5,0) — that's forward (up) which is correct.
        // But 20 is occupied by another red piece.
        actions.make_move(game_id, 24, 20);
    }

    #[test]
    #[should_panic]
    fn test_wrong_turn() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // It's red's turn, try to move black piece at 11
        actions.make_move(game_id, 11, 15);
    }

    // ═══════════════════════════════════════════
    //  Direction Enforcement Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    #[should_panic]
    fn test_red_cannot_go_backward() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Move red from 20 (5,0) to 16 (4,1)
        actions.make_move(game_id, 20, 16);
        // Black moves
        actions.make_move(game_id, 11, 15);
        // Try red backward: 16 (4,1) to 20 (5,0) — RED_WRONG_DIRECTION
        actions.make_move(game_id, 16, 20);
    }

    #[test]
    #[should_panic]
    fn test_black_cannot_go_backward() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red moves
        actions.make_move(game_id, 20, 16);
        // Black at 11 (2,7) moves forward to 15 (3,6)
        actions.make_move(game_id, 11, 15);
        // Red moves
        actions.make_move(game_id, 21, 17);
        // Black tries backward: 15 (3,6) to 11 (2,7) — BLACK_WRONG_DIRECTION
        actions.make_move(game_id, 15, 11);
    }

    #[test]
    fn test_king_moves_both_directions() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red king at 28 (7,0), black king at 3 (0,7) — far apart, no captures possible
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // red king (3) at 28: board_high shift 48
        board.board_high = 3_u128 * 281474976710656_u128;
        // black king (4) at 3: board_low shift 12
        board.board_low = 4_u128 * 4096_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        let view = setup_view(@actions);

        // Red king at 28 (7,0) moves forward (up) to 24 (6,1)
        actions.make_move(game_id, 28, 24);
        assert(view.get_square(game_id, 24) == 3, 'King should be at 24');

        // Black king at 3 (0,7) moves forward (down) to 7 (1,6)
        actions.make_move(game_id, 3, 7);

        // Red king at 24 (6,1) moves backward (down) to 28 (7,0)
        actions.make_move(game_id, 24, 28);
        assert(view.get_square(game_id, 28) == 3, 'King back at 28');
    }

    // ═══════════════════════════════════════════
    //  Single Capture Tests (4)
    // ═══════════════════════════════════════════

    #[test]
    fn test_black_captures_red() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Black at 8 (2,1), red at 13 (3,2), another red at 31 to keep game going
        // Capture: (2,1) captures (3,2) lands at (4,3)=17
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // index 8: shift 32 = 2 (black man)
        // index 13: shift 52 = 1 (red man)
        board.board_low = 2_u128 * 4294967296_u128 + 1_u128 * 4503599627370496_u128;
        // index 31: board_high shift 60 = 1 (red man)
        board.board_high = 1_u128 * 1152921504606846976_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 2; // Black's turn

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 8, 17);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 8) == 0, 'Source empty');
        assert(view.get_square(game_id, 13) == 0, 'Captured removed');
        assert(view.get_square(game_id, 17) == 2, 'Black at dest');

        let game2: Game = world.read_model(game_id);
        assert(game2.captured_red == 1, 'Red captured count');
    }

    #[test]
    fn test_red_captures_black() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 17 (4,3), black at 13 (3,2), another black at 0
        // Capture: (4,3) captures (3,2) lands at (2,1)=8
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // index 13: shift 52 = 2 (black)
        // index 0: shift 0 = 2 (black)
        board.board_low = 2_u128 * 4503599627370496_u128 + 2_u128;
        // index 17: board_high shift 4 = 1 (red)
        board.board_high = 1_u128 * 16_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 17, 8);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 17) == 0, 'Source empty');
        assert(view.get_square(game_id, 13) == 0, 'Captured removed');
        assert(view.get_square(game_id, 8) == 1, 'Red at dest');

        let game2: Game = world.read_model(game_id);
        assert(game2.captured_black == 1, 'Black captured count');
    }

    #[test]
    fn test_king_captured() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 17 (4,3) captures black king at 13 (3,2), lands at 8 (2,1)
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // black king (4) at 13: shift 52
        // black man at 0
        board.board_low = 4_u128 * 4503599627370496_u128 + 2_u128;
        // red man at 17: board_high shift 4
        board.board_high = 1_u128 * 16_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 17, 8);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 13) == 0, 'King should be captured');
    }

    #[test]
    fn test_capture_counter_tracking() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 17 (4,3), black at 13 (3,2), black at 0, black at 4
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_low = 2_u128 + 2_u128 * 65536_u128 + 2_u128 * 4503599627370496_u128;
        board.board_high = 1_u128 * 16_u128 + 1_u128 * 1152921504606846976_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 17, 8);

        let game2: Game = world.read_model(game_id);
        assert(game2.captured_black == 1, 'Should capture 1 black');
        assert(game2.captured_red == 0, 'No red captured yet');
    }

    // ═══════════════════════════════════════════
    //  Mandatory Capture Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    #[should_panic]
    fn test_must_capture_with_moving_piece() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 21 (5,2) can capture black at 16 (4,1) -> lands 12 (3,0)
        // Red at 22 (5,4) tries simple move to 17 (4,3) — should fail
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // index 21: board_high shift 20 = 1 (red man)
        // index 22: board_high shift 24 = 1 (red man)
        // index 16: board_high shift 0 = 2 (black man)
        // index 0: board_low shift 0 = 2 (black man, to keep game going)
        board.board_high = 1_u128 * 1048576_u128
            + 1_u128 * 16777216_u128
            + 2_u128;
        board.board_low = 2_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        // Try simple move with red at 22 to 17 — should fail because capture exists
        actions.make_move(game_id, 22, 17);
    }

    #[test]
    #[should_panic]
    fn test_must_capture_any_piece() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 21 (5,2) with black at 16 (4,1) — capture available
        // Red tries simple move from 21 to 17 (4,3) instead of capturing
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 1_u128 * 1048576_u128 + 2_u128; // red@21, black@16
        board.board_low = 2_u128; // black@0

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 21, 17);
    }

    #[test]
    fn test_simple_move_ok_when_no_capture() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 22 (5,4) with no captures available
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 1_u128 * 16777216_u128; // red at 22
        board.board_low = 2_u128; // black at 0

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 22, 17);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 17) == 1, 'Red at 17');
    }

    // ═══════════════════════════════════════════
    //  Multi-Jump Chain Tests (4)
    // ═══════════════════════════════════════════

    #[test]
    fn test_double_jump() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 21 (5,2), black at 16 (4,1) and black at 8 (2,1), black at 0
        // Path: 21 captures 16 -> lands 12 (3,0) -> captures 8 -> lands 5 (1,2)
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 1_u128 * 1048576_u128 + 2_u128; // red@21 + black@16
        board.board_low = 2_u128 * 4294967296_u128 + 2_u128; // black@8 + black@0

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 21, 5);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 21) == 0, 'Source empty');
        assert(view.get_square(game_id, 16) == 0, 'First captured removed');
        assert(view.get_square(game_id, 8) == 0, 'Second captured removed');
        assert(view.get_square(game_id, 5) == 1, 'Red at final dest');

        let game2: Game = world.read_model(game_id);
        assert(game2.captured_black == 2, 'Should capture 2');
    }

    #[test]
    fn test_triple_jump() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red king at 29 (7,2), black at 24 (6,1), 16 (4,1), 9 (2,3), 0
        // Path: 29 cap 24 -> 20 (5,0) cap 16 -> 13 (3,2) cap 9 -> 6 (1,4)
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // red king (3) at 29: board_high shift 52
        // black (2) at 24: board_high shift 32
        // black (2) at 16: board_high shift 0
        board.board_high = 3_u128 * 4503599627370496_u128
            + 2_u128 * 4294967296_u128
            + 2_u128;
        // black (2) at 9: board_low shift 36
        // black (2) at 0
        board.board_low = 2_u128 * 68719476736_u128 + 2_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 29, 6);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 29) == 0, 'Source empty');
        assert(view.get_square(game_id, 24) == 0, 'First cap removed');
        assert(view.get_square(game_id, 16) == 0, 'Second cap removed');
        assert(view.get_square(game_id, 9) == 0, 'Third cap removed');
        assert(view.get_square(game_id, 6) == 3, 'King at dest');

        let game2: Game = world.read_model(game_id);
        assert(game2.captured_black == 3, 'Should capture 3');
    }

    #[test]
    fn test_multi_jump_correct_removals() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red at 21, black at 16 and 8, another black at 4 and 0
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 1_u128 * 1048576_u128 + 2_u128; // red@21, black@16
        board.board_low = 2_u128 * 4294967296_u128
            + 2_u128 * 65536_u128
            + 2_u128; // black@8, black@4, black@0

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 21, 5);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 4) == 2, 'Black at 4 untouched');
        assert(view.get_square(game_id, 0) == 2, 'Black at 0 untouched');
    }

    #[test]
    fn test_multi_jump_counts_as_one_move() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 1_u128 * 1048576_u128 + 2_u128;
        board.board_low = 2_u128 * 4294967296_u128 + 2_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 21, 5);

        let game2: Game = world.read_model(game_id);
        assert(game2.move_count == 1, 'Should be 1 move');
    }

    // ═══════════════════════════════════════════
    //  King Promotion Tests (4)
    // ═══════════════════════════════════════════

    #[test]
    fn test_red_promotes_at_row_0() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red man at 4 (1,0) moves to 0 (0,1) — promotes
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // red man (1) at 4: shift 16
        board.board_low = 1_u128 * 65536_u128;
        // black at 31
        board.board_high = 2_u128 * 1152921504606846976_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 4, 0);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 0) == 3, 'Should be red king');
    }

    #[test]
    fn test_black_promotes_at_row_7() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Black man at 27 (6,7) moves to 31 (7,6) — promotes
        // 27: row 6 even, pos 3, col 7. (6,7).
        // 31: row 7 odd, pos 3, col 6. (7,6).
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // black (2) at 27: board_high shift 44
        board.board_high = 2_u128 * 17592186044416_u128;
        // red at 0
        board.board_low = 1_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 2;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 27, 31);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 31) == 4, 'Should be black king');
    }

    #[test]
    fn test_king_no_re_promotion() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red king at 4 (1,0), moves to 0 (0,1) — stays king
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_low = 3_u128 * 65536_u128; // red king at 4
        board.board_high = 2_u128 * 1152921504606846976_u128; // black at 31

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 4, 0);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 0) == 3, 'Should still be red king');
    }

    #[test]
    fn test_promotion_stops_chain() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red man at 9 (2,3) captures black at 5 (1,2), lands at 0 (0,1) — promotes, chain stops
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // red man (1) at 9: shift 36
        // black (2) at 5: shift 20
        board.board_low = 1_u128 * 68719476736_u128 + 2_u128 * 1048576_u128;
        // black at 31 to keep game going
        board.board_high = 2_u128 * 1152921504606846976_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 9, 0);

        let view = setup_view(@actions);
        assert(view.get_square(game_id, 0) == 3, 'Should be red king');
        assert(view.get_square(game_id, 5) == 0, 'Captured removed');
    }

    // ═══════════════════════════════════════════
    //  40-Move Draw Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_40_move_draw_triggers() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red king at 28 (7,0), black king at 3 (0,7)
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // red king (3) at 28: board_high shift 48
        board.board_high = 3_u128 * 281474976710656_u128;
        // black king (4) at 3: board_low shift 12
        board.board_low = 4_u128 * 4096_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;
        game.moves_since_progress = 78;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        // Red king move: 28 (7,0) -> 24 (6,1) — king move, no progress -> 79
        actions.make_move(game_id, 28, 24);

        // Black king move: 3 (0,7) -> 7 (1,6) — king move, no progress -> 80 => draw
        actions.make_move(game_id, 3, 7);

        let game2: Game = world.read_model(game_id);
        assert(game2.status == 2, 'Should be finished');
        assert(game2.result == 3, 'Should be draw');
        assert(game2.result_reason == '40_MOVE_RULE', 'Wrong reason');
    }

    #[test]
    fn test_40_move_resets_on_capture() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red king at 17 (4,3), black at 13 (3,2), black at 0
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 3_u128 * 16_u128; // red king at 17
        board.board_low = 2_u128 * 4503599627370496_u128 + 2_u128; // black@13 + black@0

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;
        game.moves_since_progress = 79;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 17, 8);

        let game2: Game = world.read_model(game_id);
        assert(game2.moves_since_progress == 0, 'Should reset on capture');
        assert(game2.status == 1, 'Game should continue');
    }

    #[test]
    fn test_40_move_resets_on_man_move() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red man at 22 (5,4), black king at 3 (0,7)
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 1_u128 * 16777216_u128; // red man at 22
        board.board_low = 4_u128 * 4096_u128; // black king at 3

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;
        game.moves_since_progress = 50;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 22, 17);

        let game2: Game = world.read_model(game_id);
        assert(game2.moves_since_progress == 0, 'Man move resets progress');
    }

    // ═══════════════════════════════════════════
    //  Win Condition Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_win_no_moves() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Black man at 3 (0,7). Blocked by:
        // Red man at 7 (1,6) — blocks simple move
        // Red man at 10 (2,5) — blocks capture landing
        // Red king at 28 (7,0) — makes the triggering move
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        // black (2) at 3: shift 12
        // red (1) at 7: shift 28
        // red (1) at 10: shift 40
        board.board_low = 2_u128 * 4096_u128
            + 1_u128 * 268435456_u128
            + 1_u128 * 1099511627776_u128;
        // red king (3) at 28: board_high shift 48
        board.board_high = 3_u128 * 281474976710656_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        // Red king at 28 (7,0) moves to 24 (6,1) — now black has no moves
        actions.make_move(game_id, 28, 24);

        let game2: Game = world.read_model(game_id);
        assert(game2.status == 2, 'Should be finished');
        assert(game2.result == 1, 'Red should win');
        assert(game2.result_reason == 'NO_MOVES', 'Wrong reason');
    }

    #[test]
    fn test_win_all_captured() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        // Red king at 17 (4,3), only black at 13 (3,2)
        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 3_u128 * 16_u128; // red king at 17
        board.board_low = 2_u128 * 4503599627370496_u128; // black at 13

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 17, 8);

        let game2: Game = world.read_model(game_id);
        assert(game2.status == 2, 'Should be finished');
        assert(game2.result == 1, 'Red should win');
        assert(game2.result_reason == 'ALL_CAPTURED', 'Wrong reason');
    }

    #[test]
    fn test_win_status_and_result_fields() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let mut board = BoardState { game_id, board_low: 0, board_high: 0 };
        board.board_high = 3_u128 * 16_u128;
        board.board_low = 2_u128 * 4503599627370496_u128;

        let mut game: Game = world.read_model(game_id);
        game.current_turn = 1;

        write_board_and_game(ref world, @actions, @board, @game, PLAYER1());

        actions.make_move(game_id, 17, 8);

        let game2: Game = world.read_model(game_id);
        assert(game2.status == 2, 'Status finished');
        assert(game2.result == 1, 'Result red win');
        assert(game2.result_reason == 'ALL_CAPTURED', 'Reason');
    }

    // ═══════════════════════════════════════════
    //  Resignation Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_red_resigns() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        actions.resign(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.status == 2, 'Should be finished');
        assert(game.result == 2, 'Black should win');
    }

    #[test]
    fn test_black_resigns() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        actions.resign(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.status == 2, 'Should be finished');
        assert(game.result == 1, 'Red should win');
    }

    #[test]
    #[should_panic]
    fn test_cannot_resign_finished() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        actions.resign(game_id);
        actions.resign(game_id);
    }

    // ═══════════════════════════════════════════
    //  Draw Offer Flow Tests (5)
    // ═══════════════════════════════════════════

    #[test]
    fn test_offer_draw() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.offer_draw(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.draw_offer == 1, 'Draw offer from red');
    }

    #[test]
    fn test_accept_draw() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.register_player('bob');
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.offer_draw(game_id);

        set_contract_address(PLAYER2());
        actions.accept_draw(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.status == 2, 'Should be finished');
        assert(game.result == 3, 'Should be draw');
    }

    #[test]
    fn test_decline_draw() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.offer_draw(game_id);

        set_contract_address(PLAYER2());
        actions.decline_draw(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.draw_offer == 0, 'Draw offer cleared');
        assert(game.status == 1, 'Still playing');
    }

    #[test]
    #[should_panic]
    fn test_cannot_accept_own_draw() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.offer_draw(game_id);
        actions.accept_draw(game_id);
    }

    #[test]
    fn test_move_cancels_draw_offer() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        actions.offer_draw(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.draw_offer == 1, 'Offer set');

        actions.make_move(game_id, 20, 16);

        let game2: Game = world.read_model(game_id);
        assert(game2.draw_offer == 0, 'Offer cleared by move');
    }

    // ═══════════════════════════════════════════
    //  Game Mode Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_local_same_player() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        actions.make_move(game_id, 20, 16);
        actions.make_move(game_id, 11, 15);
    }

    #[test]
    fn test_online_different_players() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.make_move(game_id, 20, 16);

        set_contract_address(PLAYER2());
        actions.make_move(game_id, 11, 15);
    }

    #[test]
    #[should_panic]
    fn test_online_wrong_player_rejected() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        // Player2 tries to move a red piece on red's turn
        actions.make_move(game_id, 20, 16);
    }

    // ═══════════════════════════════════════════
    //  ELO Rating Tests (4)
    // ═══════════════════════════════════════════

    #[test]
    fn test_elo_win_updates() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.register_player('bob');
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.resign(game_id);

        let red: Player = world.read_model(PLAYER1());
        let black: Player = world.read_model(PLAYER2());
        assert(red.rating < 1200, 'Red rating should decrease');
        assert(black.rating > 1200, 'Black rating should increase');
        assert(red.losses == 1, 'Red 1 loss');
        assert(black.wins == 1, 'Black 1 win');
    }

    #[test]
    fn test_elo_draw_updates() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.register_player('bob');
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.offer_draw(game_id);

        set_contract_address(PLAYER2());
        actions.accept_draw(game_id);

        let red: Player = world.read_model(PLAYER1());
        let black: Player = world.read_model(PLAYER2());
        assert(red.rating == 1200, 'Red same');
        assert(black.rating == 1200, 'Black same');
        assert(red.draws == 1, 'Red 1 draw');
        assert(black.draws == 1, 'Black 1 draw');
    }

    #[test]
    fn test_elo_minimum_100() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');

        set_contract_address(PLAYER2());
        actions.register_player('bob');

        // Set player1's rating to very low
        let mut p1: Player = world.read_model(PLAYER1());
        p1.rating = 100;
        write_player(ref world, @actions, @p1, PLAYER1());

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(1);

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        set_contract_address(PLAYER1());
        actions.resign(game_id);

        let red: Player = world.read_model(PLAYER1());
        assert(red.rating >= 100, 'Min 100');
    }

    #[test]
    fn test_no_elo_change_local() {
        let (mut world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');
        let game_id = actions.create_game(0);

        actions.resign(game_id);

        let red: Player = world.read_model(PLAYER1());
        assert(red.rating == 1200, 'No change for local');
        assert(red.games_played == 0, 'No stats for local');
    }

    // ═══════════════════════════════════════════
    //  View Function Tests (3)
    // ═══════════════════════════════════════════

    #[test]
    fn test_get_player_view() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        actions.register_player('alice');

        let view = setup_view(@actions);
        let (username, rating, wins, losses, draws, games_played) = view.get_player(PLAYER1());
        assert(username == 'alice', 'Wrong username');
        assert(rating == 1200, 'Wrong rating');
        assert(wins == 0, 'Wrong wins');
        assert(losses == 0, 'Wrong losses');
        assert(draws == 0, 'Wrong draws');
        assert(games_played == 0, 'Wrong games');
    }

    #[test]
    fn test_get_game_view() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let view = setup_view(@actions);
        let (
            player_red, _player_black, current_turn, status, result, _result_reason, move_count,
            captured_red, captured_black, draw_offer, mode,
        ) = view.get_game(game_id);
        assert(player_red == PLAYER1(), 'Wrong red');
        assert(current_turn == 1, 'Wrong turn');
        assert(status == 1, 'Wrong status');
        assert(result == 0, 'Wrong result');
        assert(move_count == 0, 'Wrong count');
        assert(captured_red == 0, 'Wrong cap red');
        assert(captured_black == 0, 'Wrong cap black');
        assert(draw_offer == 0, 'Wrong draw');
        assert(mode == 0, 'Wrong mode');
    }

    #[test]
    fn test_get_board_and_square_view() {
        let (_world, actions) = setup_world();

        set_contract_address(PLAYER1());
        let game_id = actions.create_game(0);

        let view = setup_view(@actions);
        let (board_low, board_high) = view.get_board(game_id);
        assert(board_low != 0, 'Board low not empty');
        assert(board_high != 0, 'Board high not empty');

        assert(view.get_square(game_id, 0) == 2, 'Square 0 black');
        assert(view.get_square(game_id, 20) == 1, 'Square 20 red');
        assert(view.get_square(game_id, 15) == 0, 'Square 15 empty');
    }
}
