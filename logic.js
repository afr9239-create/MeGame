const socket = io('https://megame-server.onrender.com', { transports: ['websocket'] });
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WORLD = { width: 600, height: 2000 }; 
let mySide = null; 
let gameActive = false;
let isSolo = false;
let soloSideTracker = 1; 
let players = { 1: { hp: 100, mana: 500 }, 2: { hp: 100, mana: 500 } };
let units = [];
let cameraY = 0;

const mapImg = new Image(); mapImg.src = 'map.jpg';
const bazaImg = new Image(); bazaImg.src = 'baza.jpg';

// СЕТЕВАЯ ЛОГИКА
socket.on('playerRole', role => { 
    mySide = role; 
    document.getElementById('net-info').innerText = "Ты Игрок " + role;
});

socket.on('playerCount', count => {
    if (count >= 2 && mySide === 2) document.getElementById('start-btn').style.display = 'block';
});

socket.on('gameStart', () => { launchGame(false); });
socket.on('spawnUnit', data => { units.push(data); });

function startSoloGame() {
    isSolo = true;
    mySide = 2; 
    launchGame(true);
}

function launchGame(solo) {
    gameActive = true;
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    cameraY = (mySide === 1) ? -800 : 800;
}

function spawnUnit() {
    if (!gameActive) return;
    let targetSide = isSolo ? soloSideTracker : mySide;
    if (!isSolo && players[mySide].mana < 50) return;
    if (!isSolo) players[mySide].mana -= 50;

    const unit = {
        id: Math.random(),
        side: targetSide,
        x: (Math.random() * 400) - 200,
        y: (targetSide === 1) ? -WORLD.height + 250 : WORLD.height - 250,
        hp: 100,
        color: (targetSide === 1) ? '#ff4757' : '#00d2ff'
    };

    units.push(unit);
    if (!isSolo) socket.emit('spawnUnit', unit);
    else soloSideTracker = (soloSideTracker === 1) ? 2 : 1; 
}

function update() {
    if (!gameActive) return;
    units.forEach((u, i) => {
        let target = null;
        units.forEach(o => {
            if (u.side !== o.side && Math.abs(u.y - o.y) < 50 && Math.abs(u.x - o.x) < 40) target = o;
        });
        if (target) target.hp -= 0.8;
        else u.y += (u.side === 1) ? 3 : -3;

        if (u.side === 2 && u.y < -WORLD.height + 150) { players[1].hp -= 5; u.hp = 0; }
        if (u.side === 1 && u.y > WORLD.height - 150) { players[2].hp -= 5; u.hp = 0; }
        if (u.hp <= 0) units.splice(i, 1);
    });
    players[1].mana += 0.2; players[2].mana += 0.2;
    
    if (players[1].hp <= 0 || players[2].hp <= 0) {
        gameActive = false;
        document.getElementById('result-title').innerText = (players[1].hp <= 0) ? "СИНИЕ ПОБЕДИЛИ" : "КРАСНЫЕ ПОБЕДИЛИ";
        document.getElementById('result-screen').style.display = 'flex';
    }

    document.getElementById('mana-val').innerText = Math.floor(players[mySide].mana);
    document.getElementById('hp-blue').style.width = players[2].hp + '%';
    document.getElementById('hp-red').style.width = players[1].hp + '%';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2 - cameraY);
    
    if (mapImg.complete) {
        for (let y = -WORLD.height; y < WORLD.height; y += 400) {
            ctx.drawImage(mapImg, -WORLD.width/2, y, WORLD.width, 405);
        }
    }
    
    if (bazaImg.complete) {
        ctx.drawImage(bazaImg, -WORLD.width/2, -WORLD.height, WORLD.width, 250);
        ctx.save(); ctx.translate(0, WORLD.height); ctx.rotate(Math.PI);
        ctx.drawImage(bazaImg, -WORLD.width/2, -250, WORLD.width, 250); ctx.restore();
    }
    
    units.forEach(u => {
        ctx.fillStyle = u.color;
        ctx.beginPath(); ctx.arc(u.x, u.y, 18, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "red"; ctx.fillRect(u.x-20, u.y-35, 40, 5);
        ctx.fillStyle = "lime"; ctx.fillRect(u.x-20, u.y-35, 40*(u.hp/100), 5);
    });
    ctx.restore();
    if (gameActive) update();
    requestAnimationFrame(draw);
}

// УПРАВЛЕНИЕ КАМЕРОЙ
let isDrag = false, startY = 0;
canvas.ontouchstart = e => { isDrag = true; startY = e.touches[0].clientY + cameraY; };
canvas.ontouchmove = e => { if(isDrag) { cameraY = startY - e.touches[0].clientY; e.preventDefault(); } };
canvas.ontouchend = () => isDrag = false;

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
draw();
