Вот изменённый код, в котором продолжительность игры установлена на 1 секунду. Это достигается изменением значения переменной GameModeTime на 1:

import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';
import * as default_timer from './default_timer.js';

// настройки
const WaitingPlayersTime = 10;
const BuildBaseTime = 30;
const KnivesModeTime = 40;
const GameModeTime = 1; // игра длится 1 секунду
const MockModeTime = 20;
const EndOfMatchTime = 8;
const VoteTime = 20;

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

// задаем начальные очки для команд
redTeam.Properties.Get(SCORES_PROP_NAME).Value = 1000;
blueTeam.Properties.Get(SCORES_PROP_NAME).Value = 1000;

// задаем начальные значения для игроков
Players.OnPlayerAdded.Add(function (player) {
	player.Properties.Kills.Value = 1000;
	player.Properties.Scores.Value = 1000;
	player.Properties.Deaths.Value = 0;
	player.Properties.Spawns.Value = 0;
});

// настраиваем параметры, которые нужно выводить в лидерборде
LeaderBoard.PlayerLeaderBoardValues = [
	new DisplayValueHeader(KILLS_PROP_NAME, "Statistics/Kills", "Statistics/KillsShort"),
	new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
	new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
	new DisplayValueHeader(SCORES_PROP_NAME, "Statistics/Scores", "Statistics/ScoresShort")
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader(SCORES_PROP_NAME, "Statistics\Scores", "Statistics\Scores");
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

// остальной код остаётся неизменным
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); });
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

// остальной код аналогичен вашему оригинальному
// ...

Теперь продолжительность основного игрового режима установлена на 1 секунду. Остальной код остался неизменным.

