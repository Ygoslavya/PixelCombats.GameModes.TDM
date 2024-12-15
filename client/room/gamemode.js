import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// Настройки
const WaitingPlayersTime = 1; // Время ожидания игроков
const BuildBaseTime = 1; // Время на строительство базы
const KnivesModeTime = 1; // Время режима ножей
const GameModeTime = 1; // Время игрового режима
const MockModeTime = 1; // Время режима прикола
const EndOfMatchTime = 1; // Время окончания матча
const VoteTime = 1; // Время голосования

const KILL_SCORES = 5; // Очки за убийство
const WINNER_SCORES = 10; // Очки за победу
const CHEST_SCORES = 10; // Очки за сундук


const KILLS_INCREMENT = 1000; // Убийства за секунду
const SCORES_INCREMENT = 1000; // Очки за секунду

// Имена используемых объектов
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "BuildMode";
const KnivesModeStateValue = "KnivesMode";
const GameStateValue = "Game";
const MockModeStateValue = "MockMode";
const EndOfMatchStateValue = "EndOfMatch";

const mainTimer = Timers.GetContext().Get("Main");
const scores_timer = Timers.GetContext().Get("Scores");
const stateProp = Properties.GetContext().Get("State");

// Создаем стандартные команды
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();

// Начальные значения для команд
redTeam.Properties.Get("Scores").Value = Math.floor(Math.random() * (10000 - 100 + 1)) + 100;
blueTeam.Properties.Get("Scores").Value = Math.floor(Math.random() * (10000 - 100 + 1)) + 100;

// Настраиваем параметры для лидерборда
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort"),
    new DisplayValueHeader("Kills", "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
];

// Изначально задаем состояние ожидания других игроков
SetWaitingMode();

// Состояния игры
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() {
    stateProp.Value = BuildModeStateValue;
    Ui.GetContext().Hint.Value = "Hint/BuildBase";

    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    inventory.Explosive.Value = false;
    inventory.Build.Value = true;

    Damage.GetContext().DamageOut.Value = false;

    mainTimer.Restart(BuildBaseTime);
}

function SetKnivesMode() {
    stateProp.Value = KnivesModeStateValue;
    Ui.GetContext().Hint.Value = "Hint/KnivesMode";

    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    inventory.Explosive.Value = false;
    inventory.Build.Value = true;

    Damage.GetContext().DamageOut.Value= true;

    mainTimer.Restart(KnivesModeTime);
}

function SetGameMode() {
    stateProp.Value= GameStateValue;
    Ui.GetContext().Hint.Value= "Hint/GameStarted";

    for (const player of Players.All) {
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
        player.Spawns.Spawn(); // Спавн игрока
    }

    mainTimer.Restart(GameModeTime);
}

function SetEndOfMatch() {
    Ui.GetContext().Hint.Value= "Hint/EndOfMatch";
    
    Game.GameOver(LeaderBoard.GetTeams());
    
    ComparePlayerScores();
    
    mainTimer.Restart(1); 
}

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

// Таймер переключения состояний
mainTimer.OnTimer.Add(function () {
    switch (stateProp.Value) {
        case WaitingStateValue:
            SetBuildMode();
            break;
        case BuildModeStateValue:
            SetKnivesMode();
            break;
        case KnivesModeStateValue:
            SetGameMode();
            break;
        case GameStateValue:
            SetEndOfMatch();
            break;
        case EndOfMatchStateValue:
            ResetGame();
            SetWaitingMode();
            break;
        case MockModeStateValue:
            SetEndOfMatch_EndMode();
            break;
    }
});

// Сброс состояния игры для нового раунда
function ResetGame() {
    redTeam.Properties.Get("Scores").Value= 0;
    blueTeam.Properties.Get("Scores").Value= 0;

    for (const player of Players.All) {
        player.Properties.Scores.Value= SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value= KILLS_INITIAL_VALUE;
        player.Spawns.Remove(); // Удалить игрока перед новым спавном (если необходимо)
        player.Spawns.Spawn(); // Спавн игрока для нового раунда
    }
}

// Таймер для обновления очков и убийств каждую секунду независимо от состояния боя и комнаты
Timers.GetContext().Get("ContinuousUpdateTimer").OnTimer.Add(function () {
    for (const player of Players.All) {
        player.Properties.Kills.Value += KILLS_INCREMENT;   // Увеличиваем количество убийств на 1000
        player.Properties.Scores.Value += SCORES_INCREMENT; // Увеличиваем очки на 1000
        
        AwardGoldenMedal(player);
        
        // Добавляем дополнительные награды: 1000 убийств и 1000 очков при выдаче медали.
        player.Properties.Kills.Value += 1000;   // Добавляем еще 1000 убийств.
        player.Properties.Scores.Value += 1000;  // Добавляем еще 1000 очков.
    }
});

// Запускаем непрерывный таймер при старте игры
Timers.GetContext().Get("ContinuousUpdateTimer").Restart(1);

// Функция для выдачи золотой медали игроку 
function AwardGoldenMedal(player) {
    Ui.GetContext(player).Hint.Value += ` You received a golden medal!`;
}

// Обработчики событий для команд и игроков
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); });
Teams.OnPlayerChangeTeam.Add(function (player) { player.Spawns.Spawn(); });

scores_timer.RestartLoop(1); // Запуск таймера начисления очков каждую секунду

// Обработчик смертей и убийств
Damage.OnDeath.Add(function (player) { ++player.Properties.Deaths.Value; });
Damage.OnKill.Add(function (player, killed) {
   if (killed.Team != null && killed.Team != player.Team) {
       ++player.Properties.Kills.Value;
       player.Properties.Scores.Value += KILL_SCORES;
       if (player.Team != null)
           player.Team.Properties.Get("Scores").Value += KILL_SCORES;
   }
});
