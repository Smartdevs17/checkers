use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Player {
    #[key]
    pub player: ContractAddress,
    pub username: felt252,
    pub rating: u16,
    pub wins: u32,
    pub losses: u32,
    pub draws: u32,
    pub games_played: u32,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u64,
    pub player_red: ContractAddress,
    pub player_black: ContractAddress,
    pub current_turn: u8,
    pub status: u8,
    pub result: u8,
    pub result_reason: felt252,
    pub move_count: u16,
    pub moves_since_progress: u16,
    pub captured_red: u8,
    pub captured_black: u8,
    pub last_move_from: u8,
    pub last_move_to: u8,
    pub draw_offer: u8,
    pub mode: u8,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct BoardState {
    #[key]
    pub game_id: u64,
    pub board_low: u128,
    pub board_high: u128,
}
