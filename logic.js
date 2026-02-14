const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ПАРАМЕТРЫ МИРА
const WORLD = { width: 700, height: 2500 }; 
const ZOOM = 0.55; // Оптимальное отдаление

let mySide = null; 
let gameActive = false;
let isSolo = false;
let soloSideTracker = 1; 
let players = { 1: { hp: 100, mana: 500 }, 2: { hp: 100, mana: 500 } };
let units = [];
let cameraY = 0;

const mapImg = new Image(); mapImg.src = 'map.jpg';
const bazaImg = new Image(); bazaImg.src = 'baza.jpg';

class Warrior {
    constructor(id, side, type, x, y) {
        this.id = id;
        this.side = side;
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = 100;
        this.range = 250; 
        this.speed = 3.5;
        this.damage = 0.7;
        this.color = (side === 1) ? '#ff4757' : '#00d2ff';
    }

    update() {
        let target = null;
        let minDist = this.range;
        units.forEach(o => {
            if (this.side !== o.side) {
                let dx = o.x - this.x;
                let dy = o.y - this.y;
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
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "red"; ctx.fillRect(this.x-25, this.y-45, 50, 7);
        ctx.fillStyle = "lime"; ctx.fillRect(this.x-25, this.y-45, 50*(this.hp/100), 7);
    }
}

// УПРАВЛЕНИЕ
function startSoloGame() { isSolo = true; mySide = 2; launchGame(); }
function startGameNetwork() { socket.emit('startGame'); }

socket.on('playerRole', role => { mySide = role; document.getElementById('net-info').innerText = "Игрок " + role; });
socket.on('playerCount', count => { if (count >= 2 && mySide === 2) document.getElementById('start-btn').style.display = 'block'; });
socket.on('gameStart', () => { launchGame(); });
socket.on('spawnUnit', d => { units.push(new Warrior(d.id, d.side, d.type, d.x, d.y)); });

function launchGame() {
    gameActive = true;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    cameraY = (mySide === 1) ? -WORLD.height + 800 : WORLD.height - 800;
}

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

function update() {
    if (!gameActive) return;
    for (let i = units.length - 1; i >= 0; i--) {
        let u = units[i]; u.update();
        if (u.side === 2 && u.y < -WORLD.height + 300) { players[1].hp -= 5; units.splice(i, 1); }
        else if (u.side === 1 && u.y > WORLD.height - 300) { players[2].hp -= 5; units.splice(i, 1); }
        else if (u.hp <= 0) units.splice(i, 1);
    }
    players[1].mana += 0.3; players[2].mana += 0.3;
    document.getElementById('mana-val').innerText = Math.floor(players[mySide].mana);
    document.getElementById('hp-blue').style.width = players[2].hp + '%';
    document.getElementById('hp-red').style.width = players[1].hp + '%';
    if (players[1].hp <= 0 || players[2].hp <= 0) {
        gameActive = false;
        document.getElementById('result-title').innerText = (players[1].hp <= 0) ? "ПОБЕДА СИНИХ" : "ПОБЕДА КРАСНЫХ";
        document.getElementById('result-screen').style.display = 'flex';
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(0, -cameraY);

    // Трава
    ctx.fillStyle = '#1a2b1a';
    ctx.fillRect(-WORLD.width*2, -WORLD.height - 1000, WORLD.width * 4, WORLD.height * 2 + 2000);

    // Дорога
    if (mapImg.complete) {
        const roadH = mapImg.height * (WORLD.width / mapImg.width);
        for (let y = -WORLD.height; y < WORLD.height; y += roadH) {
            ctx.drawImage(mapImg, -WORLD.width/2, y, WORLD.width, roadH);
        }
    }

    // Базы (С ОТСТУПОМ)
    if (bazaImg.complete) {
        const bW = 550, bH = 300, offset = 180;
        ctx.drawImage(bazaImg, -bW/2, -WORLD.height + offset, bW, bH);
        ctx.save();
        ctx.translate(0, WORLD.height - offset); ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -bW/2, -bH, bW, bH);
        ctx.restore();
    }

    units.forEach(u => u.draw());
    ctx.restore();
    if (gameActive) update();
    requestAnimationFrame(draw);
}

// КАМЕРА С ОГРАНИЧЕНИЕМ
let isDrag = false, startY = 0;
canvas.ontouchstart = e => { isDrag = true; startY = e.touches[0].clientY / ZOOM + cameraY; };
canvas.ontouchmove = e => { 
    if(isDrag) { 
        let nextY = startY - e.touches[0].clientY / ZOOM;
        const limit = WORLD.height - 400; 
        if (nextY > limit) nextY = limit;
        if (nextY < -limit) nextY = -limit;
        cameraY = nextY; e.preventDefault(); 
    } 
};
canvas.ontouchend = () => isDrag = false;

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
