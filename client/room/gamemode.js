import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';
import * as default_timer from './default_timer.js';

// настройки
const GameDuration = 1; // Game lasts for 1 second
const EndOfMatchTime = 1; // End of match duration is also 1 second
const INITIAL_POINTS = 10000;
const INITIAL_KILLS = 10000;
const POINTS_PER_SECOND = 1000;
const KILLS_PER_SECOND = 1000;

// имена используемых объектов
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "BuildMode";
const KnivesModeStateValue = "KnivesMode";
const GameStateValue = "Game";
const MockModeStateValue = "MockMode";
const EndOfMatchStateValue = "EndOfMatch";

// ... (other constants remain unchanged)

// получаем объекты, с которыми работает режим
const mainTimer = Timers.GetContext().Get("Main");
const scores_timer = Timers.GetContext().Get("Scores");
const stateProp = Properties.GetContext().Get("State");

// применяем параметры конструктора режима
Damage.GetContext().FriendlyFire.Value = GameMode.Parameters.GetBool("FriendlyFire");
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;

// создаем стандартные команды
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();

// настраиваем параметры лидерборда
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader("Kills", "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
    new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
    new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort")
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/Scores");

// задаем сортировку команд и игроков для списка лидирующих
LeaderBoard.TeamWeightGetter.Set(team => team.Properties.Get("Scores").Value);
LeaderBoard.PlayersWeightGetter.Set(player => player.Properties.Get("Scores").Value);

// отображаем значения вверху экрана
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Scores" };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: "Scores" };

// при запросе смены команды игрока - добавляем его в запрашиваемую команду
Teams.OnRequestJoinTeam.Add((player, team) => {
    team.Add(player);
    // Set initial scores and kills
    player.Properties.Scores.Value = INITIAL_POINTS;
    player.Properties.Kills.Value = INITIAL_KILLS;
});

// автоматически распределяем игроков по командам при их присоединении
Players.OnJoin.Add(player => {
    const team = Math.random() < 0.5 ? blueTeam : redTeam; // Randomly assign to blue or red team
    team.Add(player);
    
    // Set initial scores and kills
    player.Properties.Scores.Value = INITIAL_POINTS;
    player.Properties.Kills.Value = INITIAL_KILLS;
});

// таймер очков за проведенное время
scores_timer.OnTimer.Add(() => {
    for (const player of Players.All) {
        if (player.Team == null) continue; // если вне команд то не начисляем ничего по таймеру
        player.Properties.Scores.Value += POINTS_PER_SECOND;
        player.Properties.Kills.Value += KILLS_PER_SECOND; // Award kills as well
    }
});

// таймер переключения состояний
mainTimer.OnTimer.Add(() => {
    if (stateProp.Value === GameStateValue) {
        SetEndOfMatch();
    }
});

// изначально задаем состояние ожидания других игроков
SetWaitingMode();

// состояния игры
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    Spawns.GetContext().enable = false;
    mainTimer.Restart(GameDuration); // Start the game timer for 1 second.
}

function SetEndOfMatch() {
    scores_timer.Stop(); // выключаем таймер очков
    Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

    const spawns = Spawns.GetContext();
    spawns.enable = false;
    spawns.Despawn();

    Game.GameOver(LeaderBoard.GetTeams());
    mainTimer.Restart(EndOfMatchTime); // End of match duration is also set to 1 second.
}

// Start the scores timer loop every second.
scores_timer.RestartLoop(1); // Run every second for point and kill updates.