// при запросе смены команды игрока - добавляем его в запрашиваемую команду
Teams.OnRequestJoinTeam.Add(function (player, team) {
    // Автоматически выбираем команду для игрока
    if (!player.Team) { // Проверяем, что игрок еще не в команде
        // Пример: простая логика для выбора команды на основе количества игроков
        if (blueTeam.Players.Count < redTeam.Players.Count) {
            blueTeam.Add(player);
        } else {
            redTeam.Add(player);
        }
        
        // Устанавливаем начальные значения убийств и очков
        player.Properties.Kills.Value = 5; // Добавляем 5 убийств
        player.Properties.Scores.Value = 45; // Добавляем 45 очков
    }
});

// обработчик спавнов
Spawns.OnSpawn.Add(function (player) {
    if (stateProp.Value == MockModeStateValue) return;
    
    ++player.Properties.Spawns.Value;
    
    // Убедитесь, что начальные значения убийств и очков установлены только при первом спавне
    if (player.Properties.Kills.Value === 0 && player.Properties.Scores.Value === 0) {
        player.Properties.Kills.Value = 5; // Добавляем 5 убийств
        player.Properties.Scores.Value = 45; // Добавляем 45 очков
    }
});