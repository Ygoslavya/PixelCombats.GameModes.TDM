import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';
import * as default_timer from './default_timer.js';

// настройки
const WaitingPlayersTime = 1; // изменено на 1 секунду
const BuildBaseTime = 1; // изменено на 1 секунду
const KnivesModeTime = 1; // изменено на 1 секунду
const GameModeTime = 1; // изменено на 1 секунду
const MockModeTime = 1; // изменено на 1 секунду
const EndOfMatchTime = 1; // изменено на 1 секунду
const VoteTime = 1; // изменено на 1 секунду

const KILL_SCORES = 5;
const WINNER_SCORES = 109008760000;
const TIMER_SCORES = 5;
const REWARD_POINTS = 10000007000000; // Количество очков награды для игрока
const SCORES_TIMER_INTERVAL = 1; // изменено на 1 секунду

// имена используемых объектов
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "BuildMode";
const KnivesModeStateValue = "KnivesMode";
const GameStateValue = "Game";
const MockModeStateValue = "MockMode";
const EndOfMatchStateValue = "EndOfMatch";

const immortalityTimerName = "immortality"; // имя таймера, используемого в контексте игрока, для его бессмертия
const KILLS_PROP_NAME = "Kills";
const SCORES_PROP_NAME = "Scores";

// получаем объекты, с которыми работает режим
const mainTimer = Timers.GetContext().Get("Main");
const scores_timer = Timers.GetContext().Get("Scores");
const stateProp = Properties.GetContext().Get("State");

// применяем параметры конструктора режима
Damage.GetContext().FriendlyFire.Value = GameMode.Parameters.GetBool("FriendlyFire");
const MapRotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("OnlyPlayerBlocksDmg");

// бустим блоки игрока
BreackGraph.PlayerBlockBoost = true;

// имя игрового режима (устарело)
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;

// создаем стандартные команды
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// устанавливаем начальные очки для команд
redTeam.Properties.Get(SCORES_PROP_NAME).Value = 0; // Красная команда начинает с 0 очков
blueTeam.Properties.Get(SCORES_PROP_NAME).Value = 1000; // Синяя команда начинает с 1000 очков

// настраиваем параметры, которые нужно выводить в лидерборде
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader(KILLS_PROP_NAME, "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
    new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
    new DisplayValueHeader(SCORES_PROP_NAME, "Statistics/Scores", "Statistics/ScoresShort")
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader(SCORES_PROP_NAME, "Statistics/Scores", "Statistics/Scores");
// задаем сортировку команд для списка лидирующих
LeaderBoard.TeamWeightGetter.Set(function (team) {
    return team.Properties.Get(SCORES_PROP_NAME).Value;
});
// задаем сортировку игроков для списка лидирующих
LeaderBoard.PlayersWeightGetter.Set(function (player) {
    return player.Properties.Get(SCORES_PROP_NAME).Value;
});

// отображаем значения вверху экрана
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: SCORES_PROP_NAME };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: SCORES_PROP_NAME };

// при запросе смены команды игрока - добавляем его в запрашиваемую команду
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); });
// при запросе спавна игрока - спавним его
Teams.OnPlayerChangeTeam.Add(function (player) { player.Spawns.Spawn() });

// бессмертие после респавна
Spawns.GetContext().OnSpawn.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) {
        player.Properties.Immortality.Value = false;
        return;
    }
    player.Properties.Immortality.Value = true;
    player.Timers.Get(immortalityTimerName).Restart(3);
});

// обработчик спавнов
Spawns.OnSpawn.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) return;

    // Устанавливаем начальные значения для очков и убийств
    player.Properties.Scores.Value += REWARD_POINTS; // Начальное количество очков с учетом награды при спавне
    player.Properties.Kills.Value = 1000; // Начальное количество убийств установлено на 1000

    // Устанавливаем начальное количество погибаний на 0
    player.Properties.Deaths.Value = 0; // Начальное количество погибаний

    ++player.Properties.Spawns.Value;

    // Начисляем награду при спавне
});

// обработчик смертей
Damage.OnDeath.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) {
        Spawns.GetContext(player).Spawn();
        return;
    }
    ++player.Properties.Deaths.Value;
});

// обработчик убийств
Damage.OnKill.Add(function (player, killed) {
    if (stateProp.Value == MockModeStateValue) return;
    if (killed.Team != null && killed.Team != player.Team) {
        ++player.Properties.Kills.Value;
        // добавляем очки кила игроку и команде
        player.Properties.Scores.Value += KILL_SCORES;
        if (stateProp.Value !== MockModeStateValue && player.Team != null)
            player.Team.Properties.Get(SCORES_PROP_NAME).Value += KILL_SCORES;
    }
});

// таймер очков за проведенное время
scores_timer.OnTimer.Add(function () {
    for (const player of Players.All) {
        if (player.Team == null) continue; // если вне команд то не начисляем ничего по таймеру

        player.Properties.Scores.Value += TIMER_SCORES; // Добавляем очки за время игры

        // Начисляем награду каждые X секунд
        player.Properties.Scores.Value += REWARD_POINTS; // Добавляем очки награды каждые X секунд 
    }
});

// таймер переключения состояний
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
        case MockModeStateValue:
            SetEndOfMatch_EndMode();
            break;
        case EndOfMatchStateValue:
            start_vote();
            break;
    }
});

// изначально задаем состояние ожидания других игроков
SetWaitingMode();

// состояния игры
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    Spawns.GetContext().enable = false;
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

    // запрет нанесения урона
    Damage.GetContext().DamageOut.Value = false;

    mainTimer.Restart(BuildBaseTime);
    Spawns.GetContext().enable = true;
    SpawnTeams();
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

   // разрешение нанесения урона
   Damage.GetContext().DamageOut.Value= true;

   mainTimer.Restart(KnivesModeTime);
   Spawns.GetContext().enable= true; 
   SpawnTeams(); 
}
function SetGameMode() {
     // разрешаем нанесение урона 
     Damage.GetContext().DamageOut. Value= true; 
     stateProp. Value= GameStateValue; 
     Ui. GetContext().Hint. Value= "Hint/AttackEnemies"; 

     var inventory= Inventory. GetContext(); 
     if(GameMode.Parameters. GetBool("OnlyKnives")) { 
         inventory.Main. Value= false; 
         inventory.Secondary. Value= false; 
         inventory.Melee. Value= true; 
         inventory.Explosive. Value= false; 
         inventory.Build. Value= true; 
     } else { 
         inventory.Main. Value= true; 
         inventory.Secondary. Value= true; 
         inventory.Melee. Value= true; 
         inventory.Explosive. Value= true; 
         inventory.Build. Value= true; 
     }

     mainTimer.Restart(GameModeTime); 
     Spawns.GetContext().Despawn(); 
     SpawnTeams(); 
}
function SetEndOfMatch() { 
   scores_timer.Stop(); // выключаем таймер очков 
   const leaderboard= LeaderBoard. GetTeams(); 

   if(leaderboard[0].Weight !== leaderboard[1].Weight) { 
       // режим прикола вконце катки 
       SetMockMode(leaderboard[0].Team, leaderboard[1].Team); 
       // добавляем очки победившим 
       for(const win_player of leaderboard[0].Team.Players) { 
           win_player.Properties.Scores.Value += WINNER_SCORES; 
       } 
   } else { 
       SetEndOfMatch_EndMode(); 
   } 
}
function SetMockMode(winners, loosers) { 
   // задаем состояние игры  
   stateProp. Value= MockModeStateValue;  
   scores_timer.Stop(); // выключаем таймер очков  

   // подсказка  
   Ui.GetContext(winners).Hint.Value= "Hint/MockHintForWinners";  
   Ui.GetContext(loosers).Hint.Value= "Hint/MockHintForLoosers";  

   // разрешаем нанесение урона  
   Damage.GetContext().DamageOut. Value= true;  
   // время спавна  
   Spawns. GetContext().RespawnTime. Value= 2;

   // set loosers  
   var inventory= Inventory. GetContext(loosers);  
   inventory.Main. Value= false;  
   inventory.Secondary. Value= false;  
   inventory.Melee. Value= false;  
   inventory.Explosive. Value= false;  
   inventory.Build. Value= false;

   // set winners  
   inventory= Inventory. GetContext(winners);  
   inventory.MainInfinity. Value= true;  
   inventory.SecondaryInfinity. Value= true;  
   inventory.ExplosiveInfinity. Value= true;  
   inventory.BuildInfinity. Value= true;

   // перезапуск таймера мода  
   mainTimer.Restart(MockModeTime); 
}
function SetEndOfMatch_EndMode() {   
   stateProp. Value= EndOfMatchStateValue;   
   scores_timer.Stop(); // выключаем таймер очков   
   Ui.GetContext().Hint. Value= "Hint/EndOfMatch";  

   var spawns= Spawns. GetContext();   
   spawns.enable= false;   
   spawns.Despawn();  

   Game.GameOver(LeaderBoard. GetTeams());   
   mainTimer.Restart(EndOfMatchTime);   
}

function OnVoteResult(v) {   
   if(v.Result === null ) return ;   
   NewGame.RestartGame(v.Result);   
}
NewGameVote.OnResult.Add(OnVoteResult); 

function start_vote() {   
   NewGameVote.Start({ Variants: [{ MapId: 0 }], Timer: VoteTime }, MapRotation ? 3 : 0); 
}

function SpawnTeams() {   
   for(const team of Teams ) Spawns. GetContext(team).Spawn();   
}

scores_timer.RestartLoop(SCORES_TIMER_INTERVAL);