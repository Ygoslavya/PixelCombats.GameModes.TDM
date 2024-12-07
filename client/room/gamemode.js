// настройки
const WaitingPlayersTime = 2; // Ожидание игроков
const BuildBaseTime = 1; // Время для строительства базы
const KnivesModeTime = 1; // Время режима ножей
const GameModeTime = 3; // Время игры
const MockModeTime = 1; // Время мокового режима
const EndOfMatchTime = 2; // Время окончания матча
const VoteTime = 1; // Время голосования

const KILL_SCORES = 5; // Очки за убийство
const WINNER_SCORES = 10; // Очки за победу
const TIMER_SCORES = 5; // Очки за время
const SCORES_TIMER_INTERVAL = 30; // Интервал таймера очков

// ... остальной код остается без изменений ...

// при запросе смены команды игрока - добавляем его в запрашиваемую команду
Teams.OnRequestJoinTeam.Add(function (player, team) {
    if (team === null) {
        // Автоматически распределяем игрока в команду
        if (Math.random() < 0.5) {
            blueTeam.Add(player);
        } else {
            redTeam.Add(player);
        }
        
        // Устанавливаем начальные значения убийств и очков
        player.Properties.Kills.Value = 10;
        player.Properties.Scores.Value = 10;
    }
});

// ... остальной код остается без изменений ...

// изначально задаем состояние ожидания других игроков
SetWaitingMode();

// состояния игры
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    Spawns.GetContext().enable = false;
    mainTimer.Restart(WaitingPlayersTime); // Ожидание игроков теперь длится 2 секунды
}

// ... остальной код остается без изменений ...

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

    mainTimer.Restart(GameModeTime); // Игра теперь длится 3 секунды
    Spawns.GetContext().Despawn();
    SpawnTeams();
}

// ... остальной код остается без изменений ...

function SetEndOfMatch_EndMode() {
    stateProp.Value = EndOfMatchStateValue;
    scores_timer.Stop(); // выключаем таймер очков
    Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

    var spawns = Spawns.GetContext();
    spawns.enable = false;
    spawns.Despawn();

    Game.GameOver(LeaderBoard.GetTeams());
    mainTimer.Restart(EndOfMatchTime); // Окончание матча теперь длится 2 секунды
}

// ... остальной код остается без изменений ...