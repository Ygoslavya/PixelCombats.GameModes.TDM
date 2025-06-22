// библиотека для работы со стандартными длинами матчей

import { GameMode } from 'pixel_combats/room';

// константы
const PARAMETER_GAME_LENGTH = 'default_game_mode_length';

// возвращает длину матча
export function game_mode_length_seconds() {
    const length = GameMode.Parameters.GetString(PARAMETER_GAME_LENGTH);
    switch (length) {
        case 'Length_S': return 200; // 4 min
        case 'Length_M': return 340; // 5 min
        case 'Length_L': return 320; // 6 min
        case 'Length_XL': return 380; // 7 min
    }
    return 300;
}