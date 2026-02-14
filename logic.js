const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WORLD = { width: 700, height: 2500 }; 
const ZOOM = 0.55; 

// --- СОСТОЯНИЕ ИГРЫ ---
let mySide = null; 
let gameActive = false;
let playerGold = 100; 
let baseIncome = 2; 
let mineBonus = 5;  
let units = [];
let buildings = [];   
let cameraY = 0;
let players = { 1: { hp: 1000 }, 2: { hp: 1000 } };

const mapImg = new Image(); mapImg.src = 'map.jpg';
const bazaImg = new Image(); bazaImg.src = 'baza.jpg';

// --- КЛАСС ВОИНА ---
class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id; this.side = side; this.type = type;
        this.x = x; this.y = y; this.hp = 100;
        this.range = 250; this.speed = 3.5; this.damage = 1.2;
        this.color = (side === 1) ? '#ff4757' : '#00d2ff';
    }
    update() {
        let target = null;
        let minDist = this.range;
        units.forEach(o => {
            if (this.side !== o.side) {
                let dx = o.x - this.x; let dy = o.y - this.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < minDist) { minDist = dist; target = o; }
            }
        });
        if (target) {
            if (minDist < 45) target.hp -= this.damage;
            else {
                let angle = Math.atan2(target.y - this.y, target.x - this.x);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        } else { this.y += (this.side === 1) ? this.speed : -this.speed; }
    }
    draw() {
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, 15, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "red"; ctx.fillRect(this.x-25, this.y-45, 50, 7);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-25, this.y-45, 50*(this.hp/100), 7);
    }
}

// --- СЕТЕВЫЕ ФУНКЦИИ ЛОББИ ---
function createHostRoom() {
    const r = Math.floor(1000 + Math.random() * 9000).toString();
    document.getElementById('display-room-id').innerText = r;
    socket.emit('joinRoom', r); // Создаем комнату, заходя в неё первым
    showWaitingLobby(r);
}

function joinLobby() {
    const r = document.getElementById('room-input').value;
    if(r) {
        socket.emit('joinRoom', r);
        showWaitingLobby(r);
    } else {
        alert("Введите код!");
    }
}

function showWaitingLobby(id) {
    document.getElementById('lobby-init').style.display = 'none';
    document.getElementById('lobby-waiting').style.display = 'block';
    document.getElementById('display-room-id').innerText = id;
}

function startGameNetwork() {
    socket.emit('startGame');
}

// --- ОБРАБОТКА СОБЫТИЙ СЕРВЕРА ---
socket.on('updateOnline', count => {
    document.getElementById('online-count').innerText = count;
});

socket.on('playerRole', r => { 
    mySide = r; 
    if (r === 2) {
        document.getElementById('waiting-status').innerText = "Союзник подключился!";
        document.getElementById('start-btn').style.display = 'block';
    }
});

socket.on('gameStart', () => { 
    gameActive = true; 
    document.getElementById('lobby').style.display = 'none'; 
    document.getElementById('game-ui').style.display = 'block'; 
    cameraY = (mySide === 1) ? -WORLD.height + 800 : WORLD.height - 800; 
});

socket.on('spawnUnit', d => { units.push(new Warrior(d.id, d.side, d.type, d.x, d.y)); });
socket.on('spawnBuilding', d => { buildings.push(d); });

socket.on('updateHP', d => {
    players[1].hp = d.hp1; players[2].hp = d.hp2;
    document.getElementById('hp-red').style.width = (d.hp1/10)+'%';
    document.getElementById('hp-blue').style.width = (d.hp2/10)+'%';
});

// --- ИГРОВЫЕ ДЕЙСТВИЯ ---
function spawnUnit() {
    if (!gameActive || playerGold < 50) return;
    playerGold -= 50;
    const unitData = {
        id: Math.random(), side: mySide, type: 'scout',
        x: (Math.random() * (WORLD.width - 120)) - (WORLD.width/2 - 60),
        y: (mySide === 1) ? -WORLD.height + 400 : WORLD.height - 400
    };
    socket.emit('spawnUnit', unitData);
}

function buildMine() {
    if (!gameActive || playerGold < 100) return;
    playerGold -= 100;
    const mineData = {
        id: Math.random(), side: mySide,
        x: (Math.random() * (WORLD.width - 150)) - (WORLD.width/2 - 75),
        y: (mySide === 1) ? -WORLD.height + 650 : WORLD.height - 650
    };
    socket.emit('spawnBuilding', mineData);
}

// --- ЦИКЛЫ ОБНОВЛЕНИЯ ---
function update() {
    if (!gameActive) return;
    const myMines = buildings.filter(b => b.side === mySide).length;
    const income = baseIncome + (myMines * mineBonus);
    playerGold += income / 60; 
    document.getElementById('gold-val').innerText = Math.floor(playerGold);
    document.getElementById('gold-income').innerText = "+" + income + "/сек";

    for (let i = units.length - 1; i >= 0; i--) {
        let u = units[i]; u.update();
        if (u.side === 2 && u.y < -WORLD.height + 350) {
            socket.emit('baseDamage', { targetSide: 1, damage: 20 });
            units.splice(i, 1);
        } else if (u.side === 1 && u.y > WORLD.height - 350) {
            socket.emit('baseDamage', { targetSide: 2, damage: 20 });
            units.splice(i, 1);
        } else if (u.hp <= 0) units.splice(i, 1);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(0, -cameraY);

    if (mapImg.complete) ctx.drawImage(mapImg, -WORLD.width/2, -WORLD.height, WORLD.width, WORLD.height*2);
    if (bazaImg.complete) {
        ctx.drawImage(bazaImg, -275, -WORLD.height + 180, 550, 300);
        ctx.save(); ctx.translate(0, WORLD.height - 180); ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -275, -300, 550, 300); ctx.restore();
    }

    buildings.forEach(b => {
        ctx.fillStyle = (b.side === 1) ? '#FFD700' : '#FFA500';
        ctx.fillRect(b.x - 40, b.y - 40, 80, 80);
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.strokeRect(b.x - 40, b.y - 40, 80, 80);
    });

    units.forEach(u => u.draw());
    ctx.restore();
    if (gameActive) update();
    requestAnimationFrame(draw);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
