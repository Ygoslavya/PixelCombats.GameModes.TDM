// настройки
const WaitingPlayersTime = 2; // Время ожидания игроков
const BuildBaseTime = 2; // Время строительства базы
const KnivesModeTime = 2; // Время режима ножей
const GameModeTime = 2; // Время игрового режима
const MockModeTime = 2; // Время режима прикола
const EndOfMatchTime = 2; // Время окончания матча

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
    Damage.GetContext().DamageOut.Value = true;

    mainTimer.Restart(KnivesModeTime);
    Spawns.GetContext().enable = true;
    SpawnTeams();
}

function SetGameMode() {
    // разрешаем нанесение урона
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
    scores_timer.Stop(); // выключаем таймер очков
    const leaderboard = LeaderBoard.GetTeams();

    if (leaderboard[0].Weight !== leaderboard[1].Weight) {
        // режим прикола вконце катки
        SetMockMode(leaderboard[0].Team, leaderboard[1].Team);
        
        // добавляем очки победившим
        for (const win_player of leaderboard[0].Team.Players) {
            win_player.Properties.Scores.Value += WINNER_SCORES;
        }
    } else {
        SetEndOfMatch_EndMode();
    }
}

// Остальные функции остаются без изменений...