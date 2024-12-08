import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// Настройки
const GameDuration = 1; // Игра длится 1 секунда
const KILL_SCORES = 5; // Очки за убийство
const CHEST_SCORES = 10; // Очки за сундук

const KILLS_INITIAL_VALUE = 1000; // Начальное количество убийств
const SCORES_INITIAL_VALUE = 10009919; // Начальное количество очков

const KILLS_INCREMENT = 1000; // Убийства за секунду
const SCORES_INCREMENT = 1000; // Очки за секунду

// Имена используемых объектов
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "Build";
const KnivesModeStateValue = "KnivesMode";
const GameStateValue = "Game";
const EndOfMatchStateValue = "EndOfMatch";
const immortalityTimerName = "immortality"; // Имя таймера бессмертия

// Получаем объекты для работы режима
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");

// Создаем стандартные команды
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Настраиваем параметры для лидерборда
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort"),
    new DisplayValueHeader("Kills", "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
    new DisplayValueHeader("Spawns", "Statistics/Spawns", "Statistics/SpawnsShort"),
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/Deaths");

// Изначально задаем состояние ожидания других игроков
SetWaitingMode();

// Состояния игры
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Ожидание игроков...";
    Spawns.GetContext().enable = false;
    mainTimer.Restart(1); // Время ожидания игроков перед началом игры
}

function SetBuildMode() {
    stateProp.Value = BuildModeStateValue;
    Ui.GetContext().Hint.Value = "Постройте базу!";
    
    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;
    inventory.Explosive.Value = false;
    inventory.Build.Value = true;

    Damage.GetContext().DamageOut.Value = false; // Запрет урона
    mainTimer.Restart(1);
    Spawns.GetContext().enable = true;
}

function SetKnivesMode() {
    stateProp.Value = KnivesModeStateValue;
    Ui.GetContext().Hint.Value = "Режим ножей!";
    
    var inventory = Inventory.GetContext();
    inventory.Main.Value = false;
    inventory.Secondary.Value = false;
    inventory.Melee.Value = true;

    Damage.GetContext().DamageOut.Value = true; // Разрешение урона
    mainTimer.Restart(1);
    Spawns.GetContext().enable = true;
}

function SetGameMode() {
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Игра началась!";

    // Автоматический спавн игроков и присвоение очков и убийств
    for (const player of Players.All) {
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
        player.Spawns.Spawn(); // Спавн игрока
    }

    mainTimer.Restart(GameDuration); // Устанавливаем таймер на 1 секунду

    // Запускаем таймер для обновления очков и убийств каждую секунду
    Timers.GetContext().Get("ScoreUpdateTimer").Restart(1); // Запускаем таймер обновления каждую секунду
}

// Таймер переключения состояний
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
        default:
            if (stateProp.Value === GameStateValue) {
                SetEndOfMatch();
            }
            break;
    }
});

function SetEndOfMatch() {
    Ui.GetContext().Hint.Value += " Конец матча!";
    
    // Завершение игры и отображение результатов
    Game.GameOver(LeaderBoard.GetTeams());

    // Сравнение результатов игроков после окончания игры
    ComparePlayerScores();

    // Перезапуск игры через 3 секунды после окончания матча
    mainTimer.Restart(1); 
}

// Функция для сравнения очков игроков
function ComparePlayerScores() {
    let highestScorePlayer = null;
    let highestScore = -Infinity;

    for (const player of Players.All) {
        const score = player.Properties.Scores.Value;
        if (score > highestScore) {
            highestScorePlayer = player;
            highestScore = score;
        }
    }

    if (highestScorePlayer) {
        Ui.GetContext().Hint.Value += ` Наивысший счет: ${highestScorePlayer.Name} с ${highestScore} очками!`;
    }
}

// Таймер для перезапуска игры после окончания матча
mainTimer.OnTimer.Add(function () {
    if (stateProp.Value === EndOfMatchStateValue) {
        ResetGame();
        SetWaitingMode();
        
        // Не останавливаем таймер начисления очков и убийств после нового раунда.
        // Timers.GetContext().Get("PostMatchUpdateTimer").Stop(); // Удалено для продолжения начисления наград.
    }
});

// Сброс состояния игры для нового раунда
function ResetGame() {
    redTeam.Properties.Get("Scores").Value = 0;
    blueTeam.Properties.Get("Scores").Value = 0;

    for (const player of Players.All) {
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
        player.Spawns.Remove(); // Удалить игрока перед новым спавном (если необходимо)
        player.Spawns.Spawn(); // Спавн игрока для нового раунда
    }
}

// Таймер для обновления очков и убийств каждую секунду независимо от состояния боя и комнаты
Timers.GetContext().Get("ContinuousUpdateTimer").OnTimer.Add(function () {
    for (const player of Players.All) {
        player.Properties.Kills.Value += KILLS_INCREMENT;   // Увеличиваем количество убийств на 1000
        player.Properties.Scores.Value += SCORES_INCREMENT; // Увеличиваем очки на 1000
        
        // Выдача награды в виде золотой медали вместо "Награды нет"
        AwardGoldenMedal(player);
        
        // Добавляем дополнительные награды: 1000 убийств и 1000 очков при выдаче медали.
        player.Properties.Kills.Value += 1000;   // Добавляем еще 1000 убийств.
        player.Properties.Scores.Value += 1000;  // Добавляем еще 1000 очков.
        
        if (player.Properties.Kills.Value >= maxDeaths) { 
            SetEndOfMatch(); 
        }
        
        if (player.Properties.Deaths.Value <= 0) { 
            SetEndOfMatch(); 
        }
        
        if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= 0) { 
            SetEndOfMatch(); 
        }
        
        if (player.Properties.Deaths.Value > maxDeaths) { 
            player.Properties.Deaths.Value--; 
            player.Team.Properties.Get("Deaths").Value--; 
            
            if (player.Team.Properties.Get("Deaths").Value <= 0) { 
                SetEndOfMatch(); 
            }
            
            if (player.Properties.Deaths <= 0) { 
                SetEndOfMatch(); 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= 0) { 
                SetEndOfMatch(); 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
            if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
                ResetGame(); 
                SetWaitingMode(); 
                return; 
            }
            
           if (player.Team !== null && player.Team.Properties.Get("Deaths").Value <= maxDeaths) { 
               ResetGame();  
               SetWaitingMode();  
               return;  
           }  
       }  
   }  
});

// Запускаем непрерывный таймер при старте игры
Timers.GetContext().Get("ContinuousUpdateTimer").Restart(1);

// Функция для выдачи золотой медали игроку 
function AwardGoldenMedal(player) {
   Ui.GetContext(player).Hint.Value += ` Вы получили золотую медаль!`;
   
   // Здесь можно добавить логику для обработки медали в инвентаре игрока.
}

// Обработка голосования на новый матч
function OnVoteResult(v) {
   if (v.Result === null) return; 
   NewGame.RestartGame(v.Result); 
}
NewGameVote.OnResult.Add(OnVoteResult); 

// Начальная установка состояния игры
SetWaitingMode();