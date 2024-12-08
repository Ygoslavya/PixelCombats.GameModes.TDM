import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// настройки
const WaitingPlayersTime = 1; // Время ожидания игроков перед началом игры
const BuildBaseTime = 1;
const KnivesModeTime = 1;
const GameModeTime = 1;
const EndOfMatchTime = 1;
const VoteTime = 1;
const maxDeaths = "test";

const GameDuration = 1; // Игра длится 1 секунда
const KILL_SCORES = 5; // Очки за убийство
const CHEST_SCORES = 10; // Очки за сундук

const KILLS_INITIAL_VALUE = 1000; // Начальное количество убийств
const SCORES_INITIAL_VALUE = 1000; // Начальное количество очков

// имена используемых объектов
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "ТюТюТб";
const KnivesModeStateValue = "KnivesMode";
const GameStateValue = "Game";
const EndOfMatchStateValue = "EndOfMatch";
const immortalityTimerName = "immortality"; // имя таймера, используемого в контексте игрока, для его бессмертия

// получаем объекты, с которыми работает режим
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");

// создаем стандартные команды
const redTeam = teams.create_team_red();
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

const blueTeam = teams.create_team_blue();
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;

// задаем запас смертей в каждой команде
redTeam.Properties.Get("Deaths").Value = maxDeaths;

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
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Тест";
    Spawns.GetContext().enable = false; // Disable spawning during waiting mode
    mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() {
    stateProp.Value = BuildModeStateValue;
    Ui.GetContext().Hint.Value = "тест";
    
    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    inventory.Explosive.Value = false;
    inventory.Build.Value = true;

   Damage.GetContext().DamageOut.Value = false; // Disable damage

   mainTimer.Restart(BuildBaseTime);
   Spawns.GetContext().enable = true; // Enable spawning during build mode
}

function SetKnivesMode() {
   stateProp.Value = KnivesModeStateValue;

   Ui.GetContext().Hint.Value ="тест";

   var inventory= Inventory.GetContext();
   inventory.Main.Value= false; 
   inventory.Secondary.Value= false; 
   inventory.Melee.Value= true; 
   inventory.Explosive.Value= false; 
   inventory.Build.Value= true; 

   Damage.GetContext().DamageOut.Value= true; // Enable damage

   mainTimer.Restart(KnivesModeTime);
   Spawns.GetContext().enable= true; // Enable spawning during knives mode.
}

function SetGameMode() {
   Damage.GetContext().DamageOut.Value= true; // Enable damage
   
   stateProp.Value= GameStateValue;

   Ui.GetContext().Hint.Value= "Тест";

   // Автоматический спавн игроков и присвоение очков и убийств
   for (const player of Players.All) {
       player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
       player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
       player.Spawns.Spawn(); // Спавн игрока
   }

   mainTimer.Restart(GameDuration); // Устанавливаем таймер на 1 секунду
}

function SetEndOfMatchMode() {
   stateProp.Value= EndOfMatchStateValue;

   Ui.GetContext().Hint.Value= "";

   var spawns= Spawns.GetContext();
   spawns.enable= false; 
   spawns.Despawn(); 

   Game.GameOver(LeaderBoard.GetTeams());
   mainTimer.Restart(EndOfMatchTime);
}

// Таймер переключения состояний игры
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
            NewGame.RestartGame();
            break;
    }
});

// обработка спавна игрока
Spawns.GetContext().OnSpawn.Add(function (player) {
    player.Properties.Immortality.Value = true;
    player.Timers.Get(immortalityTimerName).Restart(1);
});

// обработка таймера бессмертия игрока
Timers.OnPlayerTimer.Add(function (timer) {
    if (timer.Id != immortalityTimerName) return;
    timer.Player.Properties.Immortality.Value = false;
});

// обработка изменения свойств игроков и команд
Properties.OnPlayerProperty.Add(function (context, value) {
    if (value.Name !== "Deaths") return;
    if (context.Player.Team == null) return;
    context.Player.Team.Properties.Get("Deaths").Value--;
});

Properties.OnTeamProperty.Add(function (context, value) {
    if (value.Name !== "Deaths") return;
    if (value.Value <= 0) SetEndOfMatchMode();
});

// обработка спавнов игроков
Spawns.OnSpawn.Add(function (player) {
    ++player.Properties.Spawns.Value;
});

// обработка смертей игроков
Damage.OnDeath.Add(function (player) {
    ++player.Properties.Deaths.Value;
});

// обработка убийств игроков
Damage.OnKill.Add(function (player, killed) {
    if (killed.Team != null && killed.Team != player.Team) {
        ++player.Properties.Kills.Value;
        player.Properties.Scores.Value += KILL_SCORES; // Award points for kill
    }
});

// Обработка результатов голосования на новую игру
function OnVoteResult(v) {
    if(v.Result === null) return; 
    NewGame.RestartGame(v.Result);
}

NewGameVote.OnResult.Add(OnVoteResult); 

function start_vote() {
    NewGameVote.Start({
        Variants: [{ MapId: 0 }],
        Timer: VoteTime,
    }, MapRotation ? 3 : 0);
}

// Начальная установка состояния игры
SetWaitingMode();