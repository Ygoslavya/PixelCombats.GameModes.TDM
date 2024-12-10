import { DisplayValueHeader, Color } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';

// Константы:
var WaitingPlayersTime = 1;
var BuildBaseTime = 1;
var GameModeTime = 601;
var EndOfMatchTime = 1;

// Константы, имён:
var WaitingStateValue = "Waiting";
var BuildModeStateValue = "BuildMode";
var GameStateValue = "Game";
var EndOfMatchStateValue = "EndOfMatch";

// Постоянные - переменные:
var mainTimer = Timers.GetContext().Get("Main");
var stateProp = Properties.GetContext().Get("State");

// Применяем параметры, создания - комнаты:
Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// Блок игрока, всегда - усилен:
BreackGraph.PlayerBlockBoost = true;

// Параметры, игры:
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// Стандартные, команды:
Teams.Add("Blue", "Teams/Blue", new Color(0, 0, 1, 0));
Teams.Add("Red", "Teams/Red", new Color(1, 0, 0, 0));
var BlueTeam = Teams.Get("Blue");
var RedTeam = Teams.Get("Red");
BlueTeam.Spawns.SpawnPointsGroups.Add(1);
RedTeam.Spawns.SpawnPointsGroups.Add(2);
BlueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
RedTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Максимальные - смерти, команд:
var MaxDeaths = Players.MaxCount * 5;
Teams.Get("Red").Properties.Get("Deaths").Value = MaxDeaths;
Teams.Get("Blue").Properties.Get("Deaths").Value = MaxDeaths;
// Стандартные - лидерБорды:
LeaderBoard.PlayerLeaderBoardValues = [
        {
                Value: "Kills",
                DisplayName: "У",
                ShortDisplayName: "У"
        },
        {
                Value: "Deaths",
                DisplayName: "С",
                ShortDisplayName: "С"
        },
        {
                Value: "Spawns",
                DisplayName: "С",
                ShortDisplayName: "С"
        },
        {
                Value: "Scores",
                DisplayName: "О",
                ShortDisplayName: "О"
        },
        {
                Value: "Status",
                DisplayName: "С",
                ShortDisplayName: "С"
        }

];
LeaderBoard.TeamLeaderBoardValue = {
        Value: "Deaths",
        DisplayName: "Statistics\Deaths",
        ShortDisplayName: "Statistics\Deaths"
};
// Вес - команды, в лидерБорде:
LeaderBoard.TeamWeightGetter.Set(function(Team) {
        return Team.Properties.Get("Deaths").Value;
});
// Вес - игрока, в лидерБорде:
LeaderBoard.PlayersWeightGetter.Set(function(Player) {
        return Player.Properties.Get("Kills").Value;
});

// Задаём, что выводить, в табе:
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Deaths" };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: "Deaths" };

// Параметр, который даёт 29 блоков:
Teams.OnRequestJoinTeam.Add(function(Player,Team){
  if (GameMode.Parameters.GetBool("Blocks29")) {
Player.contextedProperties.StartBlocksCount.Value = 30;
  }
});
// Задаём, зайти игроку - в команду:
Teams.OnRequestJoinTeam.Add(function(Player,Team){Team.Add(Player);});
// Задаём, заспавнится игроку - в команду: 
Teams.OnPlayerChangeTeam.Add(function(Player){ Player.Spawns.Spawn()});

// Делаем игроков, неуязвимыми - после спавна:
var immortalityTimerName="immortality";
Spawns.GetContext().OnSpawn.Add(function(Player){
        Player.Properties.Immortality.Value=true;
        timer=Player.Timers.Get(immortalityTimerName).Restart(1);
});
Timers.OnPlayerTimer.Add(function(Timer){
        if(Timer.Id!=immortalityTimerName) return;
        Timer.Player.Properties.Immortality.Value=false;
});

// После каждой - смерти игрока, отнимаем одну - смерть, в команде:
Properties.OnPlayerProperty.Add(function(Context, Value) {
        if (Value.Name !== "Deaths") return;
        if (Context.Player.Team == null) return;
        Context.Player.Team.Properties.Get("Deaths").Value--;
});
// Если у игрока - занулилились смерти, то завершаем игру:
Properties.OnTeamProperty.Add(function(context, value) {
        if (value.Name !== "Deaths") return;
        if (value.Value <= 0) SetEndOfMatchMode();
});

// Счётчик - спавнов:
Spawns.OnSpawn.Add(function(Player) {
        ++Player.Properties.Spawns.Value;
});
// Счётчик - смертей:
Damage.OnDeath.Add(function(Player) {
  ++Player.Properties.Deaths.Value;
});
// Счётчик - убийствов:
Damage.OnKill.Add(function(Player, Killed) {
        if (Killed.Team != null && Killed.Team != Player.Team) {
                ++Player.Properties.Kills.Value;
                Player.Properties.Scores.Value += 100;
        }
});

// Переключение - игровых, режимов:
mainTimer.OnTimer.Add(function() {
        switch (stateProp.Value) {
        case WaitingStateValue:
                SetBuildMode();
                break;
        case BuildModeStateValue:
                SetGameMode();
                break;
        case GameStateValue:
                SetEndOfMatchMode();
                break;
        case SetEndOfMatchModeStateValue:
                SetVoteTime();
                break;
        }
});

// Задаём, первое игровое - состояние игры:
SetWaitingMode();

// Состояние, игры:
function SetWaitingMode() {
        stateProp.Value = WaitingStateValue;
        Ui.GetContext().Hint.Value = "Ожидание, игроков...";
        Spawns.GetContext().Enable = false;
        mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() 
{
        stateProp.Value = BuildModeStateValue;
        Ui.GetContext().Hint.Value = "!Застраивайте базу - и атакуйте, врагов!";
        var inventory = Inventory.GetContext();
        inventory.Main.Value = false;
        inventory.Secondary.Value = false;
        inventory.Melee.Value = true;
        inventory.Explosive.Value = false;
        inventory.Build.Value = true;

        mainTimer.Restart(BuildBaseTime);
        Spawns.GetContext().Enable = true;
        Spawns.GetContext().Spawn();
        SpawnTeams();
}
function SetGameMode() 
{
        stateProp.Value = GameStateValue;
        Ui.GetContext().Hint.Value = "!Атакуйте, врагов!";

        var inventory = Inventory.GetContext();
        if (GameMode.Parameters.GetBool("OnlyKnives")) {
                inventory.Main.Value = false;
                inventory.Secondary.Value = false;
                inventory.Melee.Value = true;
                inventory.Explosive.Value = false;
                inventory.Build.Value = true;
        } else {
                inventory.Main.Value = true;
                inventory.Secondary.Value = true;
                inventory.Melee.Value = true;
                inventory.Explosive.Value = true;
                inventory.Build.Value = true;
        }

        mainTimer.Restart(GameModeTime);
        Spawns.GetContext().Spawn();
        SpawnTeams();
}        
function SetEndOfMatchMode() {
        stateProp.Value = EndOfMatchStateValue;
        Ui.GetContext().Hint.Value = "тест, матча!";

        mainTimer.Restart(EndOfMatchTime);
        Game.GameOver(LeaderBoard.GetTeams());
        Spawns.GetContext().Enable = false;
        Spawns.GetContext().Despawn();
}
NewGameVote.OnResult.Add(function(v) {
        if (v.Result === null) return;
        NewGame.RestartGame(v.Result);
});
function SetVoteTime() {
        stateProp.Value = 'Vote';
        NewGameVote.Start({
                Variants: [{ MapId: 0 }],
                Timer: 20
        }, 3);
}
function SpawnTeams() {
        var Spawns = Teams.Spawn();
         Spawns.GetContext().Spawn();        
    } 