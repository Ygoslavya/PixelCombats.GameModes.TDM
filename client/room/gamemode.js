import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// настройки
const GameDuration = 1; // Игра длится 1 секунда
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

    // Предложение игрокам выбрать команду
    for (const player of Players.All) {
        player.Properties.TeamChoice.Value = null; // Сброс выбора команды перед новым раундом
        Ui.GetContext().Hint.Value += ` ${player.Name}, выберите команду: красная или синяя.`;
    }
}

function SetGameMode() {
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Hint/GameStarted";

    // Автоматический спавн игроков и присвоение очков и убийств
    for (const player of Players.All) {
        if (player.Properties.TeamChoice.Value === 'Blue') {
            blueTeam.AddPlayer(player);
        } else if (player.Properties.TeamChoice.Value === 'Red') {
            redTeam.AddPlayer(player);
        } else {
            // Если команда не выбрана, назначаем игрока в синюю команду по умолчанию
            blueTeam.AddPlayer(player);
        }
        
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

    // Перезапуск игры через 2 секунды после окончания матча
    mainTimer.Restart(2); 
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

        // Удаляем игрока перед новым спавном (если необходимо)
        player.Spawns.Remove(); 
        player.Spawns.Spawn(); // Спавн игрока для нового раунда
    }
}

// Начальная установка состояния игры
SetWaitingMode();