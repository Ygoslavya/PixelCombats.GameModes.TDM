import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';
import * as default_timer from './default_timer.js';

// настройки
const WaitingPlayersTime = 10;
const BuildBaseTime = 30;
const KnivesModeTime = 40;
const GameModeTime = default_timer.game_mode_length_seconds();
const MockModeTime = 10;
const EndOfMatchTime = 8;
const VoteTime = 15;

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

const immortalityTimerName = "immortality"; // имя таймера бессмертия
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

// Отключаем баланс команд (убираем TeamsBalancer)
 // TeamsBalancer.IsAutoBalance = true;  // Убрано

Ui.GetContext().MainTimerId.Value = mainTimer.Id;

// создаем стандартные команды
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// настраиваем параметры для лидерборда
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader(KILLS_PROP_NAME, "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
    new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
    new DisplayValueHeader(SCORES_PROP_NAME, "Statistics/Scores", "Statistics/ScoresShort")
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader(SCORES_PROP_NAME, "Statistics\\Scores", "Statistics\\Scores");

// Убираем сортировку команд по очкам, можно оставить сортировку по другим параметрам или убрать
// LeaderBoard.TeamWeightGetter.Set(function (team) {
//     return team.Properties.Get(SCORES_PROP_NAME).Value;
// });

// сортировка игроков по очкам оставлена
LeaderBoard.PlayersWeightGetter.Set(function (player) {
    return player.Properties.Get(SCORES_PROP_NAME).Value;
});

// обнуляем очки команд (можно оставить или убрать, если не используем очки команд)
redTeam.Properties.Get(SCORES_PROP_NAME).Value = 0;
blueTeam.Properties.Get(SCORES_PROP_NAME).Value = 0;

// отображаем значения вверху экрана (можно оставить или убрать)
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: SCORES_PROP_NAME };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: SCORES_PROP_NAME };

// обработчики команд
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
        // добавляем очки кила игроку
        player.Properties.Scores.Value += KILL_SCORES;
        // Убираем добавление очков команде, т.к. баланс команд отключен
        // if (stateProp.Value !== MockModeStateValue && player.Team != null)
        //     player.Team.Properties.Get(SCORES_PROP_NAME).Value += KILL_SCORES;
    }
});

// таймер очков за проведенное время
scores_timer.OnTimer.Add(function () {
    for (const player of Players.All) {
        if (player.Team == null) continue; // если вне команд, не начисляем
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
    Damage.GetContext().DamageOut.Value = true;

    mainTimer.Restart(KnivesModeTime);
    Spawns.GetContext().enable = true;
    SpawnTeams();
}
function SetGameMode() {
    Damage.GetContext().DamageOut.Value = true;
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Hint/AttackEnemies";

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
    Spawns.GetContext().Despawn();
    SpawnTeams();
}
function SetEndOfMatch() {
    scores_timer.Stop();
    const leaderboard = LeaderBoard.GetTeams();
    if (leaderboard[0].Weight !== leaderboard[1].Weight) {
        SetMockMode(leaderboard[0].Team, leaderboard[1].Team);
        // Добавление очков победителям можно оставить или убрать
        for (const win_player of leaderboard[0].Team.Players) {
            win_player.Properties.Scores.Value += WINNER_SCORES;
        }
    }
    else {
        SetEndOfMatch_EndMode();
    }
}
function SetMockMode(winners, loosers) {
    stateProp.Value = MockModeStateValue;
    scores_timer.Stop();

    Ui.GetContext(winners).Hint.Value = "Hint/MockHintForWinners";
    Ui.GetContext(loosers).Hint.Value = "Hint/MockHintForLoosers";

    Damage.GetContext().DamageOut.Value = true
