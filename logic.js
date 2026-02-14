const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });

let myNickname = localStorage.getItem('war_castle_nick') || "";
let currentRoom = null;

// Инициализация при загрузке
if (myNickname) {
    document.getElementById('nickname-input').value = myNickname;
}

function saveNickname() {
    const input = document.getElementById('nickname-input').value.trim();
    if (input.length < 2) return alert("Ник слишком короткий!");
    
    myNickname = input;
    localStorage.setItem('war_castle_nick', myNickname);
    
    document.getElementById('screen-nick').style.display = 'none';
    document.getElementById('screen-menu').style.display = 'block';
    document.getElementById('welcome-text').innerText = `Привет, ${myNickname}!`;
}

function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    joinProcess(code);
}

function joinRoom() {
    const code = document.getElementById('join-input').value.trim();
    if (code.length === 4) joinProcess(code);
    else alert("Введите 4-значный код!");
}

function joinProcess(code) {
    currentRoom = code;
    socket.emit('joinLobby', { roomId: code, nickname: myNickname });
    
    document.getElementById('screen-menu').style.display = 'none';
    document.getElementById('screen-lobby').style.display = 'block';
    document.getElementById('room-code-display').innerText = code;
}

// СЛУШАТЕЛИ СЕРВЕРА
socket.on('updatePlayerList', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    
    players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'player-slot';
        div.innerHTML = `<span>${p.nickname}</span> ${p.isHost ? '<span class="badge">HOST</span>' : ''}`;
        list.appendChild(div);
    });

    if (players.length >= 2) {
        document.getElementById('lobby-status').innerText = "Готовы к битве!";
        // Показываем кнопку старта только хосту (первому в списке)
        if (players[0].id === socket.id) {
            document.getElementById('start-btn').style.display = 'block';
        }
    }
});

function requestStart() {
    socket.emit('startGameRequest', currentRoom);
}

socket.on('gameStarted', () => {
    alert("Игра начинается! (Здесь будет переход к новой механике)");
    // Здесь мы позже добавим смену экрана на игровой холст
});
