function SetEndOfMatch() {
    Ui.GetContext().Hint.Value = "Hint/EndOfMatch";
    
    // Завершение игры и отображение результатов
    Game.GameOver(LeaderBoard.GetTeams());

    // Сравнение результатов игроков после окончания игры
    ComparePlayerScores();

    // Перезапуск игры через 3 секунды после окончания матча
    mainTimer.Restart(1); 

    // Reset scores and kills to 1000 after the match ends
    for (const player of Players.All) {
        player.Properties.Scores.Value = 1000;
        player.Properties.Kills.Value = 1000;
    }
}

// Функция для выдачи золотой медали игроку 
function AwardGoldenMedal(player) {
    Ui.GetContext(player).Hint.Value += ` You received a golden medal!`;
    
    // Reset the player's scores and kills to 1000 after awarding the medal
    player.Properties.Scores.Value = 1000;
    player.Properties.Kills.Value = 1000;
    
    // Additional logic for handling the medal in the player's inventory can be added here.
}
