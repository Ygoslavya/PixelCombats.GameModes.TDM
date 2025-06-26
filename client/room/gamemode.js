// константы
var MaxScores = 6;
var WaitingModeSeconts = 10;
var BuildModeSeconds = 30;
var GameModeSeconds = 120;
var EndGameSeconds = 5;
var EndOfMatchTime = 10;

// константы имен
var WaitingStateValue = "Waiting";
var BuildModeStateValue = "BuildMode";
var GameStateValue = "Game";
var EndOfGameStateValue = "EndOfGame";
var EndOfMatchStateValue = "EndOfMatch";
var scoresProp = "Scores";

// постоянные переменные
var mainTimer = Timers.GetContext().Get("Main");
var stateProp = Properties.GetContext().Get("State");
var winTeamIdProp = Properties.GetContext().Get("WinTeam");

// применяем параметры создания комнаты
Damage.GetContext().FriendlyFire.Value = GameMode.Parameters.GetBool("FriendlyFire");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// блок игрока всегда усилен
BreackGraph.PlayerBlockBoost = true;

// выключаем урон гранаты при касании
Damage.GetContext().GranadeTouchExplosion.Value = false;

// параметры игры
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true; // вкл автобаланс до начала катки
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// создаем команды
Teams.Add("Blue", "Teams/Blue", { b: 1 });
Teams.Add("Red", "Teams/Red", { r: 1 });
Teams.Get("Blue").Spawns.SpawnPointsGroups.Add(1);
Teams.Get("Red").Spawns.SpawnPointsGroups.Add(2);
Teams.Get("Red").Build.BlocksSet.Value = BuildBlocksSet.Red;
Teams.Get("Blue").Build.BlocksSet.Value = BuildBlocksSet.Blue;

// задаем что выводить в лидербордах
LeaderBoard.PlayerLeaderBoardValues = [
	{
		Value: "Kills",
		DisplayName: "Statistics/Kills",
		ShortDisplayName: "Statistics/KillsShort"
	},
	{
		Value: "Deaths",
		DisplayName: "Statistics/Deaths",
		ShortDisplayName: "Statistics/\DeathsShort"
	},
	{
		Value: "Scores",
		DisplayName: "Statistics/Scores",
		ShortDisplayName: "Statistics/ScoresShort"
	}
];
LeaderBoard.TeamLeaderBoardValue = {
	Value: scoresProp,
	DisplayName: "Statistics\Scores",
	ShortDisplayName: "Statistics\ScoresShort"
};
// вес команды в лидерборде
LeaderBoard.TeamWeightGetter.Set(function(team) {
	var prop = team.Properties.Get(scoresProp);
	if (prop.Value == null) return 0;
	return prop.Value;
});
// вес игрока в лидерборде
LeaderBoard.PlayersWeightGetter.Set(function(player) {
	var prop = player.Properties.Get("Scores");
	if (prop.Value == null) return 0;
	return prop.Value;
});

// задаем что выводить вверху
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: scoresProp };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: scoresProp };

// выводим 0 вверху
for (e = Teams.GetEnumerator(); e.MoveNext();) {
	e.Current.Properties.Get(scoresProp).Value= 0;
}

// разрешаем вход в команды по запросу
Teams.OnRequestJoinTeam.Add(function(player,team){team.Add(player);});
// спавн по входу в команду
Teams.OnPlayerChangeTeam.Add(function(player) {
	//if (stateProp.value === GameStateValue) 
	//	return;
	player.Spawns.Spawn();
});

// счетчик смертей
Damage.OnDeath.Add(function(player) {
	++player.Properties.Deaths.Value;
});
// счетчик убийств
Damage.OnKill.Add(function(player, killed) {
	if (killed.Team != null && killed.Team != player.Team) {
		++player.Properties.Kills.Value;
		player.Properties.Scores.Value += 100;
	}
});

// проверяем выигрыш команды
function GetWinTeam(){
	winTeam = null;
	wins = 0;
	noAlife = true;
	for (e = Teams.GetEnumerator(); e.MoveNext();) {
		if (e.Current.GetAlivePlayersCount() > 0) {
			++wins;
			winTeam = e.Current;
		}
	}
	if (wins === 1) return winTeam;
	else return null;
}
function TrySwitchGameSt