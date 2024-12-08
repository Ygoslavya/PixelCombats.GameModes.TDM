import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// настройки
const GameDuration = 0.1; // Игра длится 1 секунда
const KILL_SCORES = 5; // Очки за убийство
const CHEST_SCORES = 10; // Очки за сундук

const KILLS_INITIAL_VALUE = 1000; // Начальное количество убийств
const SCORES_INITIAL_VALUE = 1000999; // Начальное количество очков

// имена используемых объектов
const GameStateValue = "Game";
const EndOfMatchStateValue = "EndOfMatch";

// получаем объекты, с которыми работает режим
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");

// создаем стандартные команды
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();

// настраиваем параметры для лидерборда
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort"),
    new DisplayValueHeader("Kills", "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
];

// отображаем изначально нули в очках команд
redTeam.Properties.Get("Scores").Value = 0;
blueTeam.Properties.Get("Scores").Value = 0;

// изначально задаем состояние ожидания других игроков
SetWaitingMode();

// состояния игры
function SetWaitingMode() {
    stateProp.Value = "Waiting";
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    mainTimer.Restart(3); // Время ожидания игроков перед началом игры
}

function SetGameMode() {
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Hint/GameStarted";

    // Автоматический спавн игроков и присвоение очков и убийств
    for (const player of Players.All) {
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
        player.Spawns.Spawn(); // Спавн игрока
    }

    mainTimer.Restart(GameDuration); // Устанавливаем таймер на 1 секунду
}

// Таймер переключения состояний
mainTimer.OnTimer.Add(function () {
    if (stateProp.Value === "Waiting") {
        SetGameMode();
    } else if (stateProp.Value === GameStateValue) {
        SetEndOfMatch();
    }
});

function SetEndOfMatch() {
    Ui.GetContext().Hint.Value = "Hint/EndOfMatch";
    
    // Завершение игры и отображение результатов
    Game.GameOver(LeaderBoard.GetTeams());

    // Сравнение результатов игроков после окончания игры
    ComparePlayerScores();

    // Перезапуск игры через 3 секунды после окончания матча
    mainTimer.Restart(3); 
}

// Функция для сравнения очков игроков
function ComparePlayerScores() {
    let highestScorePlayer = null;
    let highestScore = -Infinity;

    for (const player of Players.All) {
        const score = player.Properties.Scores.Value;
        if (score > highestScore) {
            highestScore = score;
            highestScorePlayer = player;
        }
    }

    if (highestScorePlayer) {
        Ui.GetContext().Hint.Value += ` Highest Score: ${highestScorePlayer.Name} with ${highestScore} points!`;
    }
}

// Таймер для перезапуска игры после окончания матча
mainTimer.OnTimer.Add(function () {
    if (stateProp.Value === EndOfMatchStateValue) {
        ResetGame();
        SetWaitingMode();
    }
});

// Сброс состояния игры для нового раунда
function ResetGame() {
    redTeam.Properties.Get("Scores").Value = 0;
    blueTeam.Properties.Get("Scores").Value = 0;

    for (const player of Players.All) {
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
        player.Spawns.Remove(); // Удалить игрока перед новым спавном (если необходимо)
        player.Spawns.Spawn(); // Спавн игрока для нового раунда
    }
}

// Начальная установка состояния игры
SetWaitingMode();