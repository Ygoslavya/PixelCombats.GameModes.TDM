import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// настройки
const GameDuration = 1; // Игра длится 1 секунда
const KILL_SCORES = 5; // Очки за убийство
const CHEST_SCORES = 10; // Очки за сундук

const KILLS_INITIAL_VALUE = 1000; // Начальное количество убийств
const SCORES_INITIAL_VALUE = 1000999; // Начальное количество очков

const KILLS_INCREMENT = 1000; // Убийства за секунду
const SCORES_INCREMENT = 1000; // Очки за секунду

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

    // Запускаем таймер для обновления очков и убийств каждую секунду
    Timers.GetContext().Get("ScoreUpdateTimer").Restart(1); // Запускаем таймер обновления каждую секунду
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

    // Остановить таймер начисления очков и убийств после нового раунда
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
        
        // Остановить таймер начисления очков и убийств после нового раунда
        Timers.GetContext().Get("PostMatchUpdateTimer").Stop();
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

// Таймер для обновления очков и убийств каждую секунду независимо от состояния боя и комнаты
Timers.GetContext().Get("ContinuousUpdateTimer").OnTimer.Add(function () {
    for (const player of Players.All) {
        player.Properties.Kills.Value += KILLS_INCREMENT;   // Увеличиваем количество убийств на 10000
        player.Properties.Scores.Value += SCORES_INCREMENT; // Увеличиваем очки на 10000
        
        // Выдача награды в виде медали или сундука
        AwardReward(player);
    }
});

// Запускаем непрерывный таймер при старте игры
Timers.GetContext().Get("ContinuousUpdateTimer").Restart(1);

// Функция для выдачи награды игроку (медаль или сундук)
function AwardReward(player) {
    const rewardType = Math.random() < 0.5 ? "medal" : "chest"; // Случайно выбираем награду

    if (rewardType === "medal") {
        Ui.GetContext(player).Hint.Value += ` You received a medal!`;
        // Здесь можно добавить логику для обработки медали в инвентаре игрока.
        
    } else {
        Ui.GetContext(player).Hint.Value += ` You received a chest!`;
        // Здесь можно добавить логику для обработки сундука в инвентаре игрока.
        
    }
}

// Начальная установка состояния игры
SetWaitingMode();