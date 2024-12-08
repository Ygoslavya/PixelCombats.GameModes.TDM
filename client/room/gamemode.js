import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// Настройки
const GameDuration = 1; // Игра длится 1 секунда
const WaitingPlayersTime = 1;
const BuildBaseTime = 1;
const KnivesModeTime = 1;
const GameModeTime = 1;
const EndOfMatchTime = 1;
const VoteTime = 1;
const maxDeaths = "test";

const KILLS_INITIAL_VALUE = 1000; // Начальное количество убийств
const SCORES_INITIAL_VALUE = 1000999; // Начальное количество очков

// Имена используемых объектов
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "Build";
const KnivesModeStateValue = "KnivesMode";
const GameStateValue = "Game";
const EndOfMatchStateValue = "EndOfMatch";
const immortalityTimerName = "immortality"; // Имя таймера бессмертия

// Получаем объекты для работы режима
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");

// Применяем параметры конструктора режима
Damage.GetContext().FriendlyFire.Value = GameMode.Parameters.GetBool("FriendlyFire");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("OnlyPlayerBlocksDmg");
BreackGraph.PlayerBlockBoost = true;

// Создаем стандартные команды
const redTeam = teams.create_team_red();
const blueTeam = teams.create_team_blue();
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Настраиваем параметры для лидерборда
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort"),
    new DisplayValueHeader("Kills", "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
    new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/Deaths");

// Изначально задаем состояние ожидания других игроков
SetWaitingMode();

// Состояния игры
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Ожидание игроков...";
    Spawns.GetContext().enable = false;
    mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() {
    stateProp.Value = BuildModeStateValue;
    Ui.GetContext().Hint.Value = "Постройте базу!";
    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    inventory.Explosive.Value = false;
    inventory.Build.Value = true;

    Damage.GetContext().DamageOut.Value = false; // Запрет урона
    mainTimer.Restart(BuildBaseTime);
    Spawns.GetContext().enable = true;
}

function SetKnivesMode() {
    stateProp.Value = KnivesModeStateValue;
    Ui.GetContext().Hint.Value = "Режим ножей!";
    
    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    
    Damage.GetContext().DamageOut.Value = true; // Разрешение урона
    mainTimer.Restart(KnivesModeTime);
}

function SetGameMode() {
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Игра началась!";
    
    for (const player of Players.All) {
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
        player.Spawns.Spawn(); // Спавн игрока
    }
    
    Damage.GetContext().DamageOut.Value = true; // Разрешаем урон
    mainTimer.Restart(GameDuration);
}

function SetEndOfMatch() {
    stateProp.Value = EndOfMatchStateValue;
    Ui.GetContext().Hint.Value += " Конец матча!";
    
    var spawns = Spawns.GetContext();
    spawns.enable = false;
    
    Game.GameOver(LeaderBoard.GetTeams());
    
    ComparePlayerScores(); // Сравнение результатов игроков
    
    mainTimer.Restart(EndOfMatchTime);
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
        case EndOfMatchStateValue:
            ResetGame();
            SetWaitingMode();
            break;
        default:
            if (stateProp.Value === GameStateValue) {
                SetEndOfMatch();
            }
            break;
    }
});

// Функция для сравнения очков игроков
function ComparePlayerScores() {
    let highestScorePlayer = null;
    let highestScore = -Infinity;

    for (const player of Players.All) {
        const score = player.Properties.Scores.Value;
        if (score > highestScore) {
            highestScorePlayer = player;
            highestScore = score;
        }
    }

    if (highestScorePlayer) {
        Ui.GetContext().Hint.Value += ` Наивысший счет: ${highestScorePlayer.Name} с ${highestScore} очками!`;
    }
}

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

// Обработка голосования на новый матч
function OnVoteResult(v) {
   if (v.Result === null) return; 
   NewGame.RestartGame(v.Result); 
}
NewGameVote.OnResult.Add(OnVoteResult); 

// Начальная установка состояния игры
SetWaitingMode();