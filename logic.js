const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });

let myNickname = localStorage.getItem('war_castle_nick') || "";
let currentRoom = null;

// Загружаем ник из памяти, если он есть
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
    document.getElementById('welcome-text').innerText = `Командир, ${myNickname}`;
}

function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    joinProcess(code);
}

function joinRoom() {
    const code = document.getElementById('join-input').value.trim();
    if (code.length === 4) joinProcess(code);
    else alert("Введите 4 цифры кода!");
}

function joinProcess(code) {
    currentRoom = code;
    socket.emit('joinLobby', { roomId: code, nickname: myNickname });
    
    document.getElementById('screen-menu').style.display = 'none';
    document.getElementById('screen-lobby').style.display = 'block';
    document.getElementById('room-code-display').innerText = code;
}

// ОБНОВЛЕНИЕ СПИСКА ИГРОКОВ В ЛОББИ
socket.on('updatePlayerList', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    
    players.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'player-slot';
        // Первый в списке — Хост
        const isHost = index === 0;
        div.innerHTML = `
            <span>${p.nickname} ${p.id === socket.id ? '(Вы)' : ''}</span>
            ${isHost ? '<span class="badge">HOST</span>' : ''}
        `;
        list.appendChild(div);
    });

    if (players.length >= 2) {
        document.getElementById('lobby-status').innerText = "Все на месте!";
        // Только первый игрок (хост) видит кнопку старта
        if (players[0].id === socket.id) {
            document.getElementById('start-btn').style.display = 'block';
        }
    } else {
        document.getElementById('lobby-status').innerText = "Ожидание противника...";
        document.getElementById('start-btn').style.display = 'none';
    }
});

function requestStart() {
    socket.emit('startGameRequest', currentRoom);
}

socket.on('gameStarted', () => {
    console.log("Игра началась!");
    // Здесь мы в будущем будем загружать саму игру
    document.querySelector('.container').innerHTML = "<h1>ЗАГРУЗКА БИТВЫ...</h1>";
});
