import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, NewGame, NewGameVote } from 'pixel_combats/room';
import * as teams from './default_teams.js';

// Game settings
const GameDuration = 1; // Game lasts 1 second
const KILL_SCORES = 995; // Points for a kill
const WINNER_SCORES = 9910; // Points for winning
const SCORES_INCREMENT = 1000; // Points increment every second
const KILLS_INCREMENT = 1000; // Kills increment every second

// Initial values
const KILLS_INITIAL_VALUE = 1000; // Initial kills
const SCORES_INITIAL_VALUE = 10009919; // Initial scores

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
        player.Properties.Scores.Value = SCORES_INITIAL_VALUE;
        player.Properties.Kills.Value = KILLS_INITIAL_VALUE;
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
    Ui.GetContext().Hint.Value = "Hint/EndOfMatch";
    
    // End the game and display results
    Game.GameOver(LeaderBoard.GetTeams());
    
    // Compare player scores after match ends
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
            player.Properties.Scores.Value += SCORES_INCREMENT; // Increment scores by 1000
            player.Properties.Kills.Value += KILLS_INCREMENT;   // Increment kills by 1000
        }
    });

    continuousScoreTimer.Restart(1); // Start the timer to run every second
}

// Start the initial waiting mode when the script runs
SetWaitingMode();