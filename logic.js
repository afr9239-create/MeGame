const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WORLD = { width: 700, height: 2500 }; 
const ZOOM = 0.55; 

// --- ПЕРЕМЕННЫЕ ИГРЫ ---
let mySide = null; 
let gameActive = false;
let isSolo = false;
let soloSideTracker = 1; 
let players = { 1: { hp: 1000, mana: 500 }, 2: { hp: 1000, mana: 500 } }; // HP теперь 1000 как на сервере
let units = [];
let buildings = [];   
let playerGold = 100; 
let cameraY = 0;

const mapImg = new Image(); mapImg.src = 'map.jpg';
const bazaImg = new Image(); bazaImg.src = 'baza.jpg';

// --- КЛАСС ВОИНА ---
class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id; this.side = side; this.type = type;
        this.x = x; this.y = y; this.hp = 100;
        this.range = 250; this.speed = 3.5; this.damage = 0.7;
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
        } else { 
            this.y += (this.side === 1) ? this.speed : -this.speed; 
        }
    }
    draw() {
        // Добавляем тень для объема (3D эффект)
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, 15, 8, 0, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        
        // Полоска жизни над головой
        ctx.fillStyle = "red"; ctx.fillRect(this.x-25, this.y-45, 50, 7);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-25, this.y-45, 50*(this.hp/100), 7);
    }
}

// --- СЕТЕВЫЕ СОБЫТИЯ ---
socket.on('playerRole', role => { 
    mySide = role; 
    document.getElementById('net-info').innerText = "Сторона: " + (role === 1 ? "Красный (Верх)" : "Синий (Низ)"); 
});

socket.on('updateHP', (data) => {
    players[1].hp = data.hp1;
    players[2].hp = data.hp2;
    // Обновляем визуальные полоски (в процентах от 1000)
    document.getElementById('hp-red').style.width = (data.hp1 / 10) + '%';
    document.getElementById('hp-blue').style.width = (data.hp2 / 10) + '%';
});

socket.on('gameOver', (data) => {
    gameActive = false;
    document.getElementById('result-title').innerText = (data.winner === mySide) ? "ПОБЕДА!" : "ПОРАЖЕНИЕ";
    document.getElementById('result-screen').style.display = 'flex';
});

socket.on('spawnUnit', d => { units.push(new Warrior(d.id, d.side, d.type, d.x, d.y)); });
socket.on('spawnBuilding', b => { buildings.push(b); });
socket.on('gameStart', () => { launchGame(); });

// --- ФУНКЦИИ ИГРЫ ---
function spawnUnit() {
    if (!gameActive || players[mySide].mana < 50) return;
    players[mySide].mana -= 50;
    let targetSide = isSolo ? soloSideTracker : mySide;
    const unitData = {
        id: Math.random(), side: targetSide, type: 'scout',
        x: (Math.random() * (WORLD.width - 120)) - (WORLD.width/2 - 60),
        y: (targetSide === 1) ? -WORLD.height + 400 : WORLD.height - 400
    };
    units.push(new Warrior(unitData.id, unitData.side, unitData.type, unitData.x, unitData.y));
    if (!isSolo) socket.emit('spawnUnit', unitData);
    else soloSideTracker = (soloSideTracker === 1) ? 2 : 1;
}

function buildMine() {
    if (!gameActive || playerGold < 50) return;
    playerGold -= 50;
    const newMine = {
        id: Math.random(), side: mySide,
        x: (Math.random() * (WORLD.width - 150)) - (WORLD.width/2 - 75),
        y: (mySide === 1) ? -WORLD.height + 600 : WORLD.height - 600
    };
    buildings.push(newMine);
    if (!isSolo) socket.emit('spawnBuilding', newMine);
}

function update() {
    if (!gameActive) return;

    for (let i = units.length - 1; i >= 0; i--) {
        let u = units[i]; u.update();
        
        // Если юнит дошел до базы врага
        if (u.side === 2 && u.y < -WORLD.height + 350) {
            if (!isSolo) socket.emit('baseDamage', { targetSide: 1, damage: 15 });
            else players[1].hp -= 15;
            units.splice(i, 1);
        }
        else if (u.side === 1 && u.y > WORLD.height - 350) {
            if (!isSolo) socket.emit('baseDamage', { targetSide: 2, damage: 15 });
            else players[2].hp -= 15;
            units.splice(i, 1);
        }
        else if (u.hp <= 0) units.splice(i, 1);
    }

    // Золото от шахт
    if (Math.random() < 0.005) { 
        playerGold += buildings.filter(b => b.side === mySide).length * 10;
        document.getElementById('gold-val').innerText = Math.floor(playerGold);
    }

    players[1].mana += 0.3; players[2].mana += 0.3;
    document.getElementById('mana-val').innerText = Math.floor(players[mySide].mana);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(0, -cameraY);

    // Фон и Карта
    if (mapImg.complete) {
        ctx.drawImage(mapImg, -WORLD.width/2, -WORLD.height, WORLD.width, WORLD.height * 2);
    } else {
        ctx.fillStyle = '#1a2b1a';
        ctx.fillRect(-WORLD.width/2, -WORLD.height, WORLD.width, WORLD.height * 2);
    }

    // Базы
    if (bazaImg.complete) {
        const bW = 550, bH = 300;
        ctx.drawImage(bazaImg, -bW/2, -WORLD.height + 180, bW, bH);
        ctx.save(); ctx.translate(0, WORLD.height - 180); ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -bW/2, -bH, bW, bH); ctx.restore();
    }

    buildings.forEach(b => {
        ctx.fillStyle = (b.side === 1) ? '#ffcc00' : '#ffa500';
        ctx.fillRect(b.x - 40, b.y - 40, 80, 80);
        ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.strokeRect(b.x - 40, b.y - 40, 80, 80);
    });

    units.forEach(u => u.draw());
    ctx.restore();
    
    if (gameActive) update();
    requestAnimationFrame(draw);
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function launchGame() {
    gameActive = true;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    cameraY = (mySide === 1) ? -WORLD.height + 800 : WORLD.height - 800;
}

function createHostRoom() { 
    const r = Math.floor(1000 + Math.random() * 9000).toString(); 
    document.getElementById('room-input').value = r; joinLobby(); 
}
function joinLobby() { 
    const r = document.getElementById('room-input').value; 
    if(r) { socket.emit('joinRoom', r); document.getElementById('lobby-init').style.display='none'; document.getElementById('lobby-waiting').style.display='block'; document.getElementById('display-room-id').innerText=r; }
}
function startGameNetwork() { socket.emit('startGame'); }

// Управление камерой (скролл)
let isDrag = false, startY = 0;
canvas.ontouchstart = e => { isDrag = true; startY = e.touches[0].clientY / ZOOM + cameraY; };
canvas.ontouchmove = e => { 
    if(isDrag) { 
        cameraY = startY - e.touches[0].clientY / ZOOM;
        e.preventDefault(); 
    } 
};
canvas.ontouchend = () => isDrag = false;

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
