import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// Game settings
const GameDuration = 1; // Game lasts 1 second

// Fixed values for scores and kills
const FIXED_SCORE_VALUE = 1000; // Fixed score value
const FIXED_KILLS_VALUE = 1000; // Fixed kills value

// State values
const WaitingStateValue = "Waiting";
const GameStateValue = "Game";
const EndOfMatchStateValue = "EndOfMatch";

// Get context objects
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");

// Create standard teams
const blueTeam = teams.create_team_blue();
const redTeam = teams.create_team_red();

// Configure leaderboard display values
LeaderBoard.PlayerLeaderBoardValues = [
    new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort"),
    new DisplayValueHeader("Kills", "Statistics/Kills", "Statistics/KillsShort"),
    new DisplayValueHeader("Deaths", "Statistics/Deaths", "Statistics/DeathsShort"),
];
LeaderBoard.TeamLeaderBoardValue = new DisplayValueHeader("Scores", "Statistics/Scores", "Statistics/ScoresShort");

// Initialize team scores to zero
redTeam.Properties.Get("Scores").Value = 0;
blueTeam.Properties.Get("Scores").Value = 0;

// Set initial game state to waiting mode
SetWaitingMode();

// Function to set waiting mode
function SetWaitingMode() {
    stateProp.Value = WaitingStateValue;
    Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
    mainTimer.Restart(1); // Wait for players for 1 second

    // Start the continuous score update timer
    StartContinuousScoreUpdate();
}

// Function to start the game mode
function SetGameMode() {
    stateProp.Value = GameStateValue;
    Ui.GetContext().Hint.Value = "Hint/GameStarted";

    // Auto-spawn players and assign initial points and kills
    for (const player of Players.All) {
        player.Properties.Scores.Value = FIXED_SCORE_VALUE; // Set initial score to 1000
        player.Properties.Kills.Value = FIXED_KILLS_VALUE;   // Set initial kills to 1000
        player.Spawns.Spawn(); // Spawn player in a random team
    }

    mainTimer.Restart(GameDuration); // Set timer for game duration
}

// Timer to switch states based on game logic
mainTimer.OnTimer.Add(function () {
    if (stateProp.Value === WaitingStateValue) {
        SetGameMode();
    } else if (stateProp.Value === GameStateValue) {
        SetEndOfMatch();
    }
});

// Function to handle end of match logic
function SetEndOfMatch() {
    Ui.GetContext().Hint.Value = "ИГРА ОКОНЧЕНА, ОЖИДАЙТЕ..."; // Display end of game message
    
    // Maintain fixed values during end of match
    for (const player of Players.All) {
        player.Properties.Scores.Value = FIXED_SCORE_VALUE; // Set scores to 1000 during end of match
        player.Properties.Kills.Value = FIXED_KILLS_VALUE;   // Set kills to 1000 during end of match
    }

    // End the game and display results
    Game.GameOver(LeaderBoard.GetTeams());
    
    // Compare player scores after match ends (optional)
    ComparePlayerScores();

    // Restart main timer for potential next round or reset (if needed)
    mainTimer.Restart(1); 
}

// Function to compare player scores and display the highest score
function ComparePlayerScores() {
    let highestScorePlayer = null;
    let highestScore = -Infinity;

    for (const player of Players.All) {
        const score = player.Properties.Scores.Value;
        if (score > highestScore) {
            highestScore = score;
            highestScorePlayer = player;
        }
    }

    if (highestScorePlayer) {
        Ui.GetContext().Hint.Value += ` Highest Score: ${highestScorePlayer.Name} with ${highestScore} points!`;
    }
}

// Start continuous score update timer for all players every second
function StartContinuousScoreUpdate() {
    const continuousScoreTimer = Timers.GetContext().Get("ContinuousScoreUpdateTimer");
    
    continuousScoreTimer.OnTimer.Add(function () {
        for (const player of Players.All) {
            player.Properties.Scores.Value = FIXED_SCORE_VALUE; // Keep scores at 1000 every second
            player.Properties.Kills.Value = FIXED_KILLS_VALUE;   // Keep kills at 1000 every second
        }
    });

    continuousScoreTimer.Restart(1); // Start the timer to run every second
}

// Start the initial waiting mode when the script runs
SetWaitingMode();