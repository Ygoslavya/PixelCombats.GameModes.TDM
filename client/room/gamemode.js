import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';
import * as default_timer from './default_timer.js';

// настройки
const WaitingPlayersTime = 1;
const BuildBaseTime = 1;
const KnivesModeTime = 1;
const GameModeTime = 1; // Set game duration to 1 second
const MockModeTime = 1;
const EndOfMatchTime = 3; // Allow some time for end of match message

const KILL_SCORES = 5;
const WINNER_SCORES = 10;
const TIMER_SCORES = 5;
const SCORES_TIMER_INTERVAL = 30;

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

// настраиваем параметры, которые нужно выводить в лидерборде
LeaderBoard.PlayerLeaderBoardValues = [
	new DisplayValueHeader(KILLS_PROP_NAME, "Statistics/Kills", "Statistics/KillsShort"),
	new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
	new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
	new DisplayValueHeader(SCORES_PROP_NAME, "Statistics/Scores", "Statistics/ScoresShort")
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader(SCORES_PROP_NAME, "Statistics\Scores", "Statistics/Scores");
// задаем сортировку команд для списка лидирующих
LeaderBoard.TeamWeightGetter.Set(function (team) {
	return team.Properties.Get(SCORES_PROP_NAME).Value;
});
// задаем сортировку игроков для списка лидирующих
LeaderBoard.PlayersWeightGetter.Set(function (player) {
	return player.Properties.Get(SCORES_PROP_NAME).Value;
});

// отображаем изначально нули в очках команд
redTeam.Properties.Get(SCORES_PROP_NAME).Value = 0;
blueTeam.Properties.Get(SCORES_PROP_NAME).Value = 0;

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
Timers.OnPlayerTimer.Add(function (timer) {
	if (timer.Id != immortalityTimerName) return;
	timer.Player.Properties.Immortality.Value = false;
});

// обработчик спавнов
Spawns.OnSpawn.Add(function (player) {
	if (stateProp.Value == MockModeStateValue) return;
	++player.Properties.Spawns.Value;
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
		player.Properties.Scores.Value += TIMER_SCORES;
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

	Damage.GetContext().DamageOut.Value = false; // запрет нанесения урона

	mainTimer.Restart(BuildBaseTime);
	Spawns.GetContext().enable = true; // разрешаем спавн игроков
	SpawnTeams(); // спавним команды 
}
function SetKnivesMode() {
	stateProp.Value = KnivesModeStateValue; 
    Ui.GetContext().Hint.Value= "Hint/KnivesMode"; 
    var inventory= Inventory.GetContext(); 
    inventory.Main.Value= false; 
    inventory.Secondary.Value= false; 
    inventory.Melee.Value= true; 
    inventory.Explosive.Value= false; 
    inventory.Build.Value= true; 

	Damage.GetContext().DamageOut.Value= true; // разрешение нанесения урона

	mainTimer.Restart(KnivesModeTime); 
    Spawns.GetContext().enable= true; 
    SpawnTeams(); 
}
function SetGameMode() {
	Damage.GetContext().DamageOut.Value= true; // разрешаем нанесение урона
	stateProp.Value= GameStateValue; // устанавливаем состояние игры на 'Game'
    Ui.GetContext().Hint.Value= "Hint/AttackEnemies"; 

	var inventory= Inventory.GetContext(); 
	if(GameMode.Parameters.GetBool("OnlyKnives")) { 
        inventory.Main.Value= false; 
        inventory.Secondary.value= false; 
        inventory.Melee.value= true; 
        inventory.Explosive.value= false; 
        inventory.Build.value= true; 
    } else { 
        inventory.Main.value= true; 
        inventory.Secondary.value= true; 
        inventory.Melee.value= true; 
        inventory.Explosive.value= true; 
        inventory.Build.value= true; 
    }

	mainTimer.Restart(GameModeTime); // перезапускаем таймер на длительность игры 
    Spawns.GetContext().Despawn(); // убираем игроков с карты перед началом игры 
    SpawnTeams(); // спавним команды 
}
function Set