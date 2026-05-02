// ============================================
// 海洋冒险 - Ocean Adventure
// HTML5 游戏引擎 v6.0 - 贴图版
// 画面增强：10种生物写实贴图 + 海洋场景美化
// ============================================

// 错误捕获
window.onerror = function(msg, url, line, col, err) {
    const el = document.getElementById('errorMsg');
    if (el) {
        el.style.display = 'block';
        el.textContent = err ? err.stack || err.message : msg + ' (行' + line + ')';
    }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvasFn() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
resizeCanvasFn();
window.addEventListener('resize', resizeCanvasFn);

function SCREEN_W() { return window.innerWidth; }
function SCREEN_H() { return window.innerHeight; }

// ============================================
// 配置
// ============================================
const CONFIG = {
    PLAYER_SPEED: 1.25,
    NPC_CRUISE: 0.20,
    NPC_FLEE_MAX: 1.25,
    FLEE_ACCEL: 0.06,
    FLEE_TRIGGER: 0.07,
    ATTACK_DIST: 110,
    ATTACK_TRIGGER: 0.008,
    CHASE_DUR: 60,
    CHASE_COOLDOWN: 120,
    MAX_VRATIO: 0.12,
    ZOOM_SMOOTH: 0.06,
    SPAWN_SAFE: 200,
    SPAWN_MARGIN: 50,
    MIN_FISH: 10,
    TARGET_FISH: 14,
    BALANCE_INT: 300,
    KNOCK: 8,
    INVINCIBLE: 90,
    DRAG: 0.92,
    GAME_DURATION: 60,
    // 跨设备排行榜（jsDelivr CDN读取，国内可用）
    GITHUB_REPO: 'shmily86314-byte/ocean-adventure',
    LEADERBOARD_CDN: 'https://cdn.jsdelivr.net/gh/shmily86314-byte/ocean-adventure@main/leaderboard.json',
    LEADERBOARD_RAW: 'https://raw.githubusercontent.com/shmily86314-byte/ocean-adventure/main/leaderboard.json',
};

const EVO = [
    { n: '小虾米',   s: 0, sz: 12,  hp: 3, speed: 3.0, ng: 8,    c: '#FFD700', img: 'shrimp' },
    { n: '小丑鱼',   s: 1, sz: 20,  hp: 3, speed: 2.8, ng: 20,   c: '#FF6B35', img: 'clownfish' },
    { n: '金鱼',     s: 2, sz: 28,  hp: 4, speed: 2.6, ng: 40,   c: '#FFA500', img: 'goldfish' },
    { n: '小章鱼',   s: 3, sz: 36,  hp: 4, speed: 2.4, ng: 70,   c: '#9B59B6', img: 'octopus' },
    { n: '中型鲨鱼', s: 4, sz: 48,  hp: 5, speed: 3.2, ng: 110,  c: '#7F8C8D', img: 'reef_shark' },
    { n: '大白鲨',   s: 5, sz: 62,  hp: 5, speed: 3.5, ng: 160,  c: '#AAB7B8', img: 'great_white' },
    { n: '巨型鲨鱼', s: 6, sz: 80,  hp: 6, speed: 3.8, ng: 230,  c: '#5D6D7E', img: 'giant_shark' },
    { n: '霸王乌贼', s: 7, sz: 105, hp: 6, speed: 3.0, ng: 350,  c: '#4A235A', img: 'colossal_squid' },
    { n: '深海巨兽', s: 8, sz: 140, hp: 8, speed: 2.5, ng: 500,  c: '#1B2631', img: 'leviathan' },
    { n: '海洋霸主', s: 9, sz: 180, hp: 10, speed: 3.0, ng: 999999, c: '#154360', img: 'ocean_overlord' },
];

const SCENES = [
    { n: '浅海', t: '#87CEEB', b: '#1a5a8a', r: true,  f: '#D2B48C' },
    { n: '中海', t: '#1a6b8a', b: '#0d2f5c', r: false, f: '#2a4a2a' },
    { n: '深海', t: '#0a0a2e', b: '#050510', r: false, f: '#111133' },
];
let currentScene = 0;

function vecDist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function rnd(lo, hi) { return Math.random() * (hi - lo) + lo; }

// ============================================
// 精灵贴图加载系统（支持精灵表动画）
// ============================================
const SPRITES = [];
const SPRITE_NAMES = ['shrimp','clownfish','goldfish','octopus','reef_shark','great_white','giant_shark','colossal_squid','leviathan','ocean_overlord'];
// 精灵表帧布局：全部为 2×2（4帧动画）
const SPRITE_FRAMES = {};
SPRITE_NAMES.forEach(function(name) { SPRITE_FRAMES[name] = { cols: 2, rows: 2 }; });
let spritesReady = false;
let spritesLoadedCount = 0;
// CDN优先加载（jsDelivr有国内加速节点），回退到相对路径
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/shmily86314-byte/ocean-adventure@main/assets/';

(function loadSprites() {
    for (let i = 0; i < SPRITE_NAMES.length; i++) {
        const idx = i, name = SPRITE_NAMES[i];
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            SPRITES[idx] = img;
            spritesLoadedCount++;
            if (spritesLoadedCount >= SPRITE_NAMES.length) spritesReady = true;
        };
        img.onerror = function() {
            // 回退到GitHub Pages相对路径
            const fallback = new Image();
            fallback.onload = function() { SPRITES[idx] = fallback; spritesLoadedCount++; if (spritesLoadedCount >= SPRITE_NAMES.length) spritesReady = true; };
            fallback.onerror = function() { SPRITES[idx] = null; spritesLoadedCount++; if (spritesLoadedCount >= SPRITE_NAMES.length) spritesReady = true; };
            fallback.src = 'assets/' + name + '.png?' + Date.now();
        };
        img.src = CDN_BASE + name + '.png?' + Date.now();
    }
})();

// 从精灵表中获取当前帧的源矩形
function getSpriteFrame(img, stage, animIndex) {
    const info = SPRITE_FRAMES[SPRITE_NAMES[stage]];
    if (!info) return { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
    const cols = info.cols, rows = info.rows;
    const total = cols * rows;
    const frame = Math.floor(animIndex * total) % total;
    return {
        sx: (frame % cols) * (img.naturalWidth / cols),
        sy: Math.floor(frame / cols) * (img.naturalHeight / rows),
        sw: img.naturalWidth / cols,
        sh: img.naturalHeight / rows
    };
}

// ============================================
// 音效系统（Web Audio API 程序化生成）
// ============================================
const SOUND = {
    _ctx: null,
    _master: null,
    _bgmOn: false,
    _bgmNodes: [],

    _init() {
        if (this._ctx) return;
        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._master = this._ctx.createGain();
            this._master.gain.value = 1.0;
            this._master.connect(this._ctx.destination);
            // BGM专用子混合器（可以单独断开而不影响SFX）
            this._bgmMixer = this._ctx.createGain();
            this._bgmMixer.gain.value = 1.0;
            this._bgmMixer.connect(this._master);
            // 预生成噪声缓冲（用于打击乐）
            const len = this._ctx.sampleRate * 0.5;
            const buf = this._ctx.createBuffer(1, len, this._ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            this._noiseBuf = buf;
        } catch(e) {}
    },

    // 吞食音效：噪声音头 + 低频重击
    eat() {
        try {
            this._init();
            if (!this._ctx) return;
            const t = this._ctx.currentTime;
            const nSrc = this._ctx.createBufferSource();
            nSrc.buffer = this._noiseBuf;
            const nG = this._ctx.createGain();
            const nF = this._ctx.createBiquadFilter();
            nF.type = 'bandpass'; nF.frequency.value = 3000; nF.Q.value = 2;
            nG.gain.setValueAtTime(0.7, t);
            nG.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            nSrc.connect(nF); nF.connect(nG); nG.connect(this._master);
            nSrc.start(t); nSrc.stop(t + 0.04);
            const o = this._ctx.createOscillator();
            const g = this._ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(200, t);
            o.frequency.exponentialRampToValueAtTime(50, t + 0.08);
            g.gain.setValueAtTime(0.6, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            o.connect(g); g.connect(this._master);
            o.start(t); o.stop(t + 0.1);
        } catch(e) {}
    },

    // 受伤音效：重低音冲击
    hit() {
        try {
            this._init();
            if (!this._ctx) return;
            const t = this._ctx.currentTime;
            const nSrc = this._ctx.createBufferSource();
            nSrc.buffer = this._noiseBuf;
            const nG = this._ctx.createGain();
            const nF = this._ctx.createBiquadFilter();
            nF.type = 'lowpass'; nF.frequency.value = 1000;
            nG.gain.setValueAtTime(0.8, t);
            nG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            nSrc.connect(nF); nF.connect(nG); nG.connect(this._master);
            nSrc.start(t); nSrc.stop(t + 0.15);
            const o = this._ctx.createOscillator();
            const g = this._ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(120, t);
            o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
            g.gain.setValueAtTime(0.7, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o.connect(g); g.connect(this._master);
            o.start(t); o.stop(t + 0.3);
        } catch(e) {}
    },

    // 进化音效：强力上升和声
    evolve() {
        try {
            this._init();
            if (!this._ctx) return;
            const t = this._ctx.currentTime;
            const notes = [220, 330, 440, 660, 880];
            notes.forEach((f, i) => {
                const o1 = this._ctx.createOscillator();
                const g1 = this._ctx.createGain();
                o1.type = 'sawtooth'; o1.frequency.value = f;
                const t0 = f < 500 ? t + i*0.06 : t + i*0.08;
                g1.gain.setValueAtTime(0.25, t0);
                g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
                o1.connect(g1); g1.connect(this._master);
                o1.start(t0); o1.stop(t0 + 0.3);
                if (f < 500) {
                    const o2 = this._ctx.createOscillator();
                    const g2 = this._ctx.createGain();
                    o2.type = 'sine'; o2.frequency.value = f * 2;
                    g2.gain.setValueAtTime(0.15, t0);
                    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
                    o2.connect(g2); g2.connect(this._master);
                    o2.start(t0); o2.stop(t0 + 0.25);
                }
            });
        } catch(e) {}
    },

    // 游戏结束：下坠强音
    gameover() {
        try {
            this._init();
            if (!this._ctx) return;
            const t = this._ctx.currentTime;
            const chords = [330, 262, 220, 165];
            chords.forEach((f, i) => {
                const o = this._ctx.createOscillator();
                const g = this._ctx.createGain();
                o.type = 'square'; o.frequency.value = f;
                const t0 = t + i * 0.25;
                g.gain.setValueAtTime(0.3, t0);
                g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
                o.connect(g); g.connect(this._master);
                o.start(t0); o.stop(t0 + 0.6);
            });
        } catch(e) {}
    },

    // 新纪录音效：胜利上升和弦
    record() {
        try {
            this._init();
            if (!this._ctx) return;
            const t = this._ctx.currentTime;
            // 胜利四和弦：C E G C（三组八度）
            const chords = [
                [262, 330, 392],
                [330, 392, 523],
                [392, 523, 659],
                [523, 659, 784]
            ];
            chords.forEach((notes, i) => {
                notes.forEach((freq, j) => {
                    const o = this._ctx.createOscillator();
                    const g = this._ctx.createGain();
                    o.type = 'square';
                    o.frequency.value = freq;
                    const t0 = t + i * 0.12;
                    g.gain.setValueAtTime(0.12 - j*0.03, t0);
                    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
                    o.connect(g); g.connect(this._master);
                    o.start(t0); o.stop(t0 + 0.3);
                });
            });
        } catch(e) {}
    },

    // ======== 背景音乐：120BPM 劲爆节奏 ========
    _noiseBuf: null,
    _bpm: 120,
    _beatDur: 0,
    _loopDur: 8,
    _nextLoop: 0,
    _schedTimer: null,

    startBGM() {
        if (this._bgmOn) return;
        try {
            this._init();
            if (!this._ctx) return;
            this._bgmOn = true;
            this._connectBGM(); // 重新连接BGM混合器
            this._beatDur = 60 / this._bpm;
            const barDur = this._beatDur * 4;
            this._loopDur = barDur * 4;
            this._nextLoop = this._ctx.currentTime + 0.05;
            this._scheduleLoop();
        } catch(e) {}
    },

    _scheduleLoop() {
        if (!this._bgmOn) return;
        const ctx = this._ctx;
        let t = Math.max(this._nextLoop, ctx.currentTime);
        const endTime = t + 60;

        while (t < endTime) {
            // 鼓：底鼓1、3拍，军鼓2、4拍（填满4个小节16拍）
            for (let bar = 0; bar < 4; bar++) {
                const bt = t + bar * this._beatDur * 4;
                this._kick(bt);
                this._kick(bt + this._beatDur * 2);
                this._snare(bt + this._beatDur);
                this._snare(bt + this._beatDur * 3);
                // 闭镲：每8分音符（每小节8个）
                for (let i = 0; i < 8; i++) this._hihat(bt + this._beatDur * i * 0.5);
            }

            // 贝斯线：每个8分音符一个音（16拍 × 2 = 32个音）
            const bassPattern = [110, 110, 130, 130, 165, 165, 147, 147];
            for (let i = 0; i < 32; i++) {
                this._bassNote(t + this._beatDur * i * 0.5, bassPattern[i % bassPattern.length]);
            }

            // 领奏旋律：每个16分音符一个音（16拍 × 4 = 64个音）
            const leadPattern = [
                523, 659, 784, 659, 523, 494, 440, 494,
                523, 659, 784, 880, 784, 659, 523, 494
            ];
            for (let i = 0; i < 64; i++) {
                this._leadNote(t + this._beatDur * i * 0.25, leadPattern[i % leadPattern.length]);
            }

            t += this._loopDur;
        }
        this._nextLoop = t;
        this._schedTimer = setTimeout(() => this._scheduleLoop(), 45000);
    },

    _kick(time) {
        const o = this._ctx.createOscillator();
        const g = this._ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, time);
        o.frequency.exponentialRampToValueAtTime(40, time + 0.08);
        g.gain.setValueAtTime(0.6, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        o.connect(g); g.connect(this._bgmMixer);
        o.start(time); o.stop(time + 0.12);
    },

    _snare(time) {
        const nSrc = this._ctx.createBufferSource();
        nSrc.buffer = this._noiseBuf;
        const nG = this._ctx.createGain();
        const nF = this._ctx.createBiquadFilter();
        nF.type = 'highpass'; nF.frequency.value = 800;
        nG.gain.setValueAtTime(0.5, time);
        nG.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        nSrc.connect(nF); nF.connect(nG); nG.connect(this._bgmMixer);
        nSrc.start(time); nSrc.stop(time + 0.1);
        const o = this._ctx.createOscillator();
        const g = this._ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(200, time);
        o.frequency.exponentialRampToValueAtTime(100, time + 0.08);
        g.gain.setValueAtTime(0.3, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        o.connect(g); g.connect(this._bgmMixer);
        o.start(time); o.stop(time + 0.1);
    },

    _hihat(time) {
        const nSrc = this._ctx.createBufferSource();
        nSrc.buffer = this._noiseBuf;
        const nG = this._ctx.createGain();
        const nF = this._ctx.createBiquadFilter();
        nF.type = 'highpass'; nF.frequency.value = 6000;
        nG.gain.setValueAtTime(0.15, time);
        nG.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        nSrc.connect(nF); nF.connect(nG); nG.connect(this._bgmMixer);
        nSrc.start(time); nSrc.stop(time + 0.04);
    },

    _bassNote(time, freq) {
        const o = this._ctx.createOscillator();
        const g = this._ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.12, time);
        g.gain.setValueAtTime(0.12, time + this._beatDur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, time + this._beatDur * 0.5);
        o.connect(g); g.connect(this._bgmMixer);
        o.start(time); o.stop(time + this._beatDur * 0.5);
    },

    _leadNote(time, freq) {
        const o = this._ctx.createOscillator();
        const g = this._ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        const dur = this._beatDur * 0.2;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(0.1, time + 0.01);
        g.gain.setValueAtTime(0.08, time + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.connect(g); g.connect(this._bgmMixer);
        o.start(time); o.stop(time + dur);
    },

    stopBGM() {
        this._bgmOn = false;
        if (this._schedTimer) { clearTimeout(this._schedTimer); this._schedTimer = null; }
        // 断开BGM混合器（SFX不受影响）
        if (this._bgmMixer) {
            try { this._bgmMixer.disconnect(); } catch(e) {}
        }
    },

    // startBGM时重新连接BGM混合器
    _connectBGM() {
        if (this._bgmMixer && this._master) {
            try { this._bgmMixer.connect(this._master); } catch(e) {}
        }
    }
};

// ============================================
// 海洋装饰元素
// ============================================

// --- 海藻 (Seaweed) ---
class Seaweed {
    constructor(x, baseY, h, sceneType) {
        this.x = x;
        this.baseY = baseY;
        this.h = h;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.015 + Math.random() * 0.015;
        // 颜色按场景
        if (sceneType === 0) {
            this.color = '#3CB371';
            this.darkColor = '#2E8B57';
        } else if (sceneType === 1) {
            this.color = '#1a5a3a';
            this.darkColor = '#0d3a1a';
        } else {
            this.color = '#0a2a1a';
            this.darkColor = '#051510';
        }
        this.segments = 8 + Math.floor(Math.random() * 4);
        this.thickness = 2 + Math.random() * 3;
    }
    update() {
        this.phase += this.speed;
    }
    draw(ctx, s) {
        ctx.save();
        const swayAmp = 8 + Math.random() * 4; // 飘动幅度
        const baseX = this.x;
        const baseY = this.baseY;
        // 画3层制造厚度
        for (let layer = -1; layer <= 1; layer++) {
            const alpha = layer === 0 ? 1.0 : 0.35;
            const color = layer === 0 ? this.color : this.darkColor;
            ctx.strokeStyle = color;
            ctx.lineWidth = (this.thickness - Math.abs(layer)) * s;
            ctx.globalAlpha = alpha;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i <= this.segments; i++) {
                const t = i / this.segments;
                const sway = Math.sin(this.phase + t * 2.5) * swayAmp * t * t;
                const px = baseX + sway * s + layer * 2 * s;
                const py = baseY - this.h * t * s;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    }
}

// --- 珊瑚 (Coral) ---
class Coral {
    constructor(x, baseY, sceneType) {
        this.x = x;
        this.baseY = baseY;
        this.size = 20 + Math.random() * 40;
        // 珊瑚颜色
        const colors = ['#FF6B6B','#FF8E53','#FFD93D','#C9B1FF','#FF6FB5','#FF9F43'];
        this.colors = [colors[Math.floor(Math.random() * colors.length)]];
        // 分支种子
        this.branches = 3 + Math.floor(Math.random() * 3);
        this.seeds = [];
        for (let i = 0; i < this.branches; i++) {
            this.seeds.push({
                angle: -Math.PI/2 + (i - (this.branches-1)/2) * 0.3 + rnd(-0.1, 0.1),
                len: this.size * (0.6 + Math.random() * 0.4),
                subAngle1: -0.4 - Math.random() * 0.2,
                subAngle2: 0.4 + Math.random() * 0.2,
            });
        }
    }
    update() {} // 珊瑚不需要更新
    draw(ctx, s) {
        ctx.save();
        function drawBranch(ctx, sx, sy, angle, len, width, color, s) {
            if (len < 4) return;
            const ex = sx + Math.cos(angle) * len;
            const ey = sy + Math.sin(angle) * len;
            ctx.strokeStyle = color;
            ctx.lineWidth = width * s;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            // 子分支
            if (len > 12) {
                drawBranch(ctx, ex, ey, angle - 0.4, len * 0.6, width * 0.65, color, s);
                drawBranch(ctx, ex, ey, angle + 0.4, len * 0.6, width * 0.65, color, s);
            }
        }
        for (const seed of this.seeds) {
            drawBranch(ctx, this.x, this.baseY, seed.angle, seed.len, this.size * 0.12, this.colors[0], s);
        }
        ctx.restore();
    }
}

// --- 浅海光线特效（简化版） ---
function drawLightRays(ctx, w, h, time) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 4; i++) {
        const rx = (w / 5) * (i + 1) + Math.sin(time * 0.001 + i * 2.1) * 20;
        const grad = ctx.createLinearGradient(rx, 0, rx + 30, h);
        grad.addColorStop(0, 'rgba(255,255,220,0.25)');
        grad.addColorStop(0.5, 'rgba(255,255,220,0.08)');
        grad.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(rx - 10, 0);
        ctx.lineTo(rx + 10, 0);
        ctx.lineTo(rx + 30 + Math.sin(time * 0.0005 + i) * 10, h);
        ctx.lineTo(rx - 20 + Math.sin(time * 0.0005 + i * 0.7) * 10, h);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// --- 海底纹理（简化版） ---
function drawSeabedTexture(ctx, w, h) {
    ctx.save();
    if (currentScene === 0) {
        // 沙粒子
        ctx.fillStyle = '#C2A878';
        ctx.globalAlpha = 0.12;
        for (let i = 0; i < 20; i++) {
            const sx = ((i * 137 + 50) % w);
            const sy = h - 15 + Math.sin(sx * 0.05) * 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
        // 沙波纹（简化：只画3条大波纹）
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#B8A070';
        ctx.lineWidth = 1;
        for (let ri = 0; ri < 3; ri++) {
            ctx.beginPath();
            const ry = h - 15 + ri * 6;
            for (let rx = 0; rx <= w; rx += 10) {
                const wy = ry + Math.sin(rx * 0.03 + ri * 1.2) * 2;
                rx === 0 ? ctx.moveTo(rx, wy) : ctx.lineTo(rx, wy);
            }
            ctx.stroke();
        }
    } else {
        // 深海 - 岩石小点
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 15; i++) {
            const sx = ((i * 97 + 50) % w);
            const sy = h - 12 + Math.sin(sx * 0.1) * 2;
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.ellipse(sx, sy, 4 + (i % 3), 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// --- 水面波纹效果（简化） ---
function drawWaterSurface(ctx, w, h, time) {
    if (currentScene !== 0) return;
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 2; i++) {
        const waveY = 5 + i * 15;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
            const y = waveY + Math.sin(x * 0.015 + time * 0.03 + i * 2) * 2;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// --- 深海发光粒子（简化） ---
function drawDeepSeaGlow(ctx, w, h, time) {
    if (currentScene !== 2) return;
    ctx.save();
    for (let i = 0; i < 8; i++) {
        const sx = ((i * 59 + 100) % w);
        const sy = h - 10 + Math.sin(time * 0.002 + i * 1.7) * 3;
        const pulse = 0.3 + Math.sin(time * 0.003 + i * 2.3) * 0.3;
        ctx.globalAlpha = pulse * 0.3;
        ctx.fillStyle = '#00FFAA';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ============================================
// Particle
// ============================================
class Particle {
    constructor(type, w, h) {
        this.type = type; this.w = w; this.h = h;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.w;
        this.y = Math.random() * this.h;
        this.size = rnd(1, 4);
        this.speedY = rnd(0.3, 1.0);
        this.alpha = rnd(0.3, 0.7);
        this.wobble = Math.random() * Math.PI * 2;
        if (this.type === 'glow') {
            this.size = rnd(2, 6);
            this.alpha = rnd(0.5, 1);
            this.pulse = Math.random() * Math.PI * 2;
        }
    }
    update() {
        this.y -= this.speedY;
        this.wobble += 0.02;
        this.x += Math.sin(this.wobble) * 0.3;
        if (this.y < -10) { this.reset(); this.y = this.h + 10; }
        if (this.x < 0) this.x = this.w;
        if (this.x > this.w) this.x = 0;
        if (this.type === 'glow') {
            this.pulse += 0.05;
            this.alpha = 0.5 + Math.sin(this.pulse) * 0.5;
        }
    }
    draw(ctx, s) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        if (this.type === 'glow') {
            ctx.fillStyle = '#7FFFD4';
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ============================================
// Fish 基类
// ============================================
class Fish {
    constructor(stage, x, y, isNPC) {
        const d = EVO[Math.min(stage, EVO.length - 1)];
        this.stage = d.s;
        this.name = d.n;
        this.size = d.sz;
        this.baseSize = d.sz;
        this.color = d.c;
        this.baseSpeed = d.speed;
        this.cruise = d.speed * CONFIG.NPC_CRUISE;
        this.maxFlee = d.speed * CONFIG.NPC_FLEE_MAX;
        this.x = x;
        this.y = y;
        this.vx = 0; this.vy = 0; this.ax = 0; this.ay = 0;
        this.isNPC = isNPC !== false;
        this.alive = true;
        this.growthValue = Math.max(1, Math.floor(stage * 3 + 2));
        this.tailA = Math.random() * Math.PI * 2;
        this.tailS = 0.1 + Math.random() * 0.1;
        this.dir = Math.random() > 0.5 ? 1 : -1;
        this.fleeing = false;
        this.fleeTimer = 0;
        this.curFleeSpd = 0;
        this.chasing = false;
        this.chaseTimer = 0;
        this.chaseCD = 0;
        this.wanderT = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
    }

    update(player, w, h) {
        if (!this.alive) return;
        this.tailA += this.tailS;
        if (this.isNPC) this.updateNPC(player, w, h);
        this.vx += this.ax; this.vy += this.ay;
        this.ax = 0; this.ay = 0;
        if (this.isNPC) {
            const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (spd > this.maxFlee * 1.1) {
                const sc = this.maxFlee / spd;
                this.vx *= sc; this.vy *= sc;
            }
        }
        this.x += this.vx; this.y += this.vy;
        const mg = this.size * 0.5;
        if (this.x < mg) { this.x = mg; this.vx = Math.abs(this.vx) * 0.3; }
        if (this.x > w - mg) { this.x = w - mg; this.vx = -Math.abs(this.vx) * 0.3; }
        if (this.y < mg) { this.y = mg; this.vy = Math.abs(this.vy) * 0.3; }
        if (this.y > h - mg - 30) { this.y = h - mg - 30; this.vy = -Math.abs(this.vy) * 0.3; }
        this.vx *= CONFIG.DRAG; this.vy *= CONFIG.DRAG;
        if (Math.abs(this.vx) > 0.1) this.dir = this.vx > 0 ? 1 : -1;
    }

    updateNPC(player, w, h) {
        if (!player || !player.alive) return;
        const d = vecDist(this, player);
        if (this.chaseCD > 0) this.chaseCD--;
        const threat = player.stage >= this.stage;

        // 逃跑
        if (threat && d < CONFIG.ATTACK_DIST) {
            if (!this.fleeing && Math.random() < CONFIG.FLEE_TRIGGER) {
                this.fleeing = true;
                this.fleeTimer = 80;
                this.curFleeSpd = this.cruise;
            }
        }
        if (this.fleeing) {
            this.fleeTimer--;
            this.curFleeSpd = Math.min(this.curFleeSpd + CONFIG.FLEE_ACCEL, this.maxFlee);
            if (this.fleeTimer <= 0 || d > CONFIG.ATTACK_DIST * 2) {
                this.fleeing = false; this.curFleeSpd = 0;
            }
            if (this.fleeing && player) {
                const ang = Math.atan2(this.y - player.y, this.x - player.x);
                this.ax += Math.cos(ang) * this.curFleeSpd * 0.10;
                this.ay += Math.sin(ang) * this.curFleeSpd * 0.10;
                return;
            }
        }

        // 攻击（严格大于玩家才攻击）
        const bigger = this.stage > player.stage;
        if (bigger && d < CONFIG.ATTACK_DIST && this.chaseCD <= 0) {
            if (!this.chasing && Math.random() < CONFIG.ATTACK_TRIGGER) {
                this.chasing = true;
                this.chaseTimer = CONFIG.CHASE_DUR;
            }
        }
        if (this.chasing) {
            this.chaseTimer--;
            if (this.chaseTimer <= 0 || d > CONFIG.ATTACK_DIST * 1.8) {
                this.chasing = false;
                this.chaseCD = CONFIG.CHASE_COOLDOWN;
                return;
            }
            const ang = Math.atan2(player.y - this.y, player.x - this.x);
            this.ax += Math.cos(ang) * this.maxFlee * 0.10;
            this.ay += Math.sin(ang) * this.maxFlee * 0.10;
            return;
        }

        // 巡航
        this.wanderT--;
        if (this.wanderT <= 0) {
            this.wanderT = 40 + Math.floor(Math.random() * 40);
            this.wanderAngle = Math.random() * Math.PI * 2;
        }
        this.ax += Math.cos(this.wanderAngle) * this.cruise * 0.06;
        this.ay += Math.sin(this.wanderAngle) * this.cruise * 0.06;
        this.ax += rnd(-0.01, 0.01);
        this.ay += rnd(-0.01, 0.01);
    }

    // ======== 程序化绘制每种生物 ========
    drawCreature(ctx, r) {
        const t = this.tailA; // 游动动画
        const sw = Math.sin(t); // 尾巴/触手摆动

        switch (this.stage) {
            case 0: // 小虾米 - 弯曲的小身体 + 触须
                this._drawShrimp(ctx, r, t, sw);
                break;
            case 1: // 小丑鱼 - 橘色椭圆 + 白色条纹
                this._drawClownfish(ctx, r, t, sw);
                break;
            case 2: // 金鱼 - 大尾巴、圆身体
                this._drawGoldfish(ctx, r, t, sw);
                break;
            case 3: // 小章鱼 - 圆头 + 8条触手
                this._drawOctopus(ctx, r, t, sw);
                break;
            case 4: // 中型鲨鱼
            case 5: // 大白鲨
            case 6: // 巨型鲨鱼
                this._drawShark(ctx, r, t, sw);
                break;
            case 7: // 霸王乌贼
                this._drawSquid(ctx, r, t, sw);
                break;
            case 8: // 深海巨兽
                this._drawLeviathan(ctx, r, t, sw);
                break;
            case 9: // 海洋霸主
                this._drawOverlord(ctx, r, t, sw);
                break;
        }
    }

    // --- 小虾米 ---
    _drawShrimp(ctx, r, t, sw) {
        // 渐变身体
        const g = ctx.createRadialGradient(-r*0.1, -r*0.1, 2, 0, 0, r*0.6);
        g.addColorStop(0, '#FFE4B5'); g.addColorStop(1, '#DAA520');
        ctx.fillStyle = g;
        // 弯曲的身体（多段）
        ctx.beginPath();
        ctx.moveTo(r*0.6, 0);
        ctx.quadraticCurveTo(r*0.3, -r*0.3, -r*0.2, -r*0.15 + sw*2);
        ctx.quadraticCurveTo(-r*0.5, -r*0.05 + sw*3, -r*0.8, sw*2);
        ctx.lineTo(-r*0.8, -r*0.2 + sw*2);
        ctx.quadraticCurveTo(-r*0.5, -r*0.25 + sw*3, -r*0.2, -r*0.35);
        ctx.quadraticCurveTo(r*0.2, -r*0.5, r*0.5, -r*0.2);
        ctx.closePath(); ctx.fill();
        // 尾巴扇
        ctx.fillStyle = '#CD853F';
        ctx.beginPath();
        ctx.moveTo(-r*0.7, sw*2);
        ctx.quadraticCurveTo(-r*1.0, -r*0.3 + sw*5, -r*1.1, sw*3);
        ctx.quadraticCurveTo(-r*1.0, r*0.2 + sw*2, -r*0.7, sw*2);
        ctx.fill();
        // 触须
        ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(r*0.5, -r*0.1); ctx.quadraticCurveTo(r*0.9, -r*0.5, r*1.0, -r*0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r*0.5, r*0.1); ctx.quadraticCurveTo(r*0.9, r*0.4, r*1.0, r*0.2); ctx.stroke();
        // 小脚
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const fx = -r*0.1 + i*r*0.15;
            ctx.beginPath(); ctx.moveTo(fx, -r*0.05);
            ctx.lineTo(fx + r*0.05, -r*0.35 - Math.sin(t*2+i)*3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx, r*0.05);
            ctx.lineTo(fx + r*0.05, r*0.35 + Math.sin(t*2+i+1)*3); ctx.stroke();
        }
        // 眼睛
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r*0.3, -r*0.1, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.32, -r*0.13, r*0.025, 0, Math.PI*2); ctx.fill();
    }

    // --- 小丑鱼 ---
    _drawClownfish(ctx, r, t, sw) {
        const g = ctx.createRadialGradient(-r*0.1, -r*0.1, 2, 0, 0, r*0.7);
        g.addColorStop(0, '#FF8C42'); g.addColorStop(0.5, '#E8601C'); g.addColorStop(1, '#C04000');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, r*0.7, r*0.45, 0, 0, Math.PI*2);
        ctx.fill();
        // 白色条纹
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let sx of [-0.25, 0.15]) {
            ctx.beginPath();
            ctx.ellipse(sx*r, 0, r*0.08, r*0.4, 0.1, 0, Math.PI*2);
            ctx.fill();
        }
        // 背鳍
        ctx.fillStyle = '#FF6B35';
        ctx.beginPath();
        ctx.moveTo(r*0.1, -r*0.4);
        ctx.quadraticCurveTo(-r*0.1, -r*0.75+sw*3, -r*0.3, -r*0.35);
        ctx.fill();
        // 尾鳍
        ctx.fillStyle = '#E8601C';
        ctx.beginPath();
        ctx.moveTo(-r*0.5, 0);
        ctx.quadraticCurveTo(-r*0.9, -r*0.4+sw*5, -r*1.0, sw*2);
        ctx.quadraticCurveTo(-r*0.9, r*0.4+sw*3, -r*0.5, 0);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.35, -r*0.12, r*0.12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r*0.38, -r*0.12, r*0.07, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.40, -r*0.15, r*0.03, 0, Math.PI*2); ctx.fill();
    }

    // --- 金鱼 ---
    _drawGoldfish(ctx, r, t, sw) {
        const g = ctx.createRadialGradient(-r*0.1, -r*0.1, 2, 0, 0, r*0.7);
        g.addColorStop(0, '#FFD700'); g.addColorStop(0.6, '#FFA500'); g.addColorStop(1, '#CC7700');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, r*0.65, r*0.5, 0, 0, Math.PI*2); ctx.fill();
        // 大尾鳍
        ctx.fillStyle = '#FFB347';
        ctx.beginPath();
        ctx.moveTo(-r*0.4, 0);
        ctx.quadraticCurveTo(-r*0.8, -r*0.5+sw*8, -r*1.2, -r*0.2+sw*4);
        ctx.quadraticCurveTo(-r*1.1, 0, -r*1.2, r*0.2+sw*4);
        ctx.quadraticCurveTo(-r*0.8, r*0.5+sw*8, -r*0.4, 0);
        ctx.fill();
        // 透明尾鳍层
        ctx.fillStyle = 'rgba(255,200,100,0.4)';
        ctx.beginPath();
        ctx.moveTo(-r*0.4, 0);
        ctx.quadraticCurveTo(-r*0.7, -r*0.4+sw*6, -r*1.0, -r*0.1+sw*3);
        ctx.quadraticCurveTo(-r*0.7, r*0.4+sw*6, -r*0.4, 0);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.3, -r*0.1, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r*0.33, -r*0.1, r*0.06, 0, Math.PI*2); ctx.fill();
        // 鳞片装饰
        ctx.strokeStyle = 'rgba(200,150,50,0.3)'; ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const sx = -r*0.2 + i*r*0.15;
            ctx.beginPath(); ctx.arc(sx, -r*0.05, r*0.06, 0, Math.PI); ctx.stroke();
        }
    }

    // --- 小章鱼 ---
    _drawOctopus(ctx, r, t, sw) {
        const g = ctx.createRadialGradient(-r*0.1, -r*0.15, 2, 0, 0, r*0.7);
        g.addColorStop(0, '#DDA0DD'); g.addColorStop(0.6, '#9B59B6'); g.addColorStop(1, '#7D3C98');
        ctx.fillStyle = g;
        // 圆头
        ctx.beginPath(); ctx.arc(0, -r*0.1, r*0.5, 0, Math.PI*2); ctx.fill();
        // 8条触手
        ctx.strokeStyle = '#8E44AD'; ctx.lineWidth = r*0.08; ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const a = -Math.PI*0.4 + i * Math.PI*0.1 + sw*0.2;
            const len = r*0.6 + Math.sin(t*0.8 + i)*r*0.15;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a)*r*0.35, Math.sin(a)*r*0.35 + r*0.1);
            const cx = Math.cos(a+0.3)*len*0.5;
            const cy = Math.sin(a+0.3)*len*0.5 + r*0.3;
            ctx.quadraticCurveTo(cx, cy, Math.cos(a)*len, Math.sin(a)*len + r*0.3);
            ctx.stroke();
        }
        // 眼睛
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.2, -r*0.25, r*0.12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-r*0.2, -r*0.25, r*0.12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2C3E50'; ctx.beginPath(); ctx.arc(r*0.22, -r*0.25, r*0.07, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2C3E50'; ctx.beginPath(); ctx.arc(-r*0.18, -r*0.25, r*0.07, 0, Math.PI*2); ctx.fill();
    }

    // --- 鲨鱼（3种通用） ---
    _drawShark(ctx, r, t, sw) {
        const dark = ['#7F8C8D','#AAB7B8','#5D6D7E'][this.stage-4];
        const g = ctx.createRadialGradient(0, -r*0.1, 2, 0, 0, r*0.8);
        g.addColorStop(0, '#B0BEC5'); g.addColorStop(0.5, dark); g.addColorStop(1, '#34495E');
        ctx.fillStyle = g;
        // 流线身体
        ctx.beginPath();
        ctx.moveTo(r*0.7, 0);
        ctx.quadraticCurveTo(r*0.5, -r*0.3, 0, -r*0.35);
        ctx.quadraticCurveTo(-r*0.5, -r*0.3, -r*0.7, 0);
        ctx.quadraticCurveTo(-r*0.5, r*0.3, 0, r*0.35);
        ctx.quadraticCurveTo(r*0.5, r*0.3, r*0.7, 0);
        ctx.fill();
        // 白色腹部
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(r*0.5, r*0.1);
        ctx.quadraticCurveTo(0, r*0.3, -r*0.5, r*0.1);
        ctx.quadraticCurveTo(-r*0.3, r*0.25, 0, r*0.28);
        ctx.quadraticCurveTo(r*0.3, r*0.25, r*0.5, r*0.1);
        ctx.fill();
        // 背鳍
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(r*0.1, -r*0.3);
        ctx.quadraticCurveTo(r*0.0, -r*0.75+sw*3, -r*0.25, -r*0.3);
        ctx.fill();
        // 尾鳍
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-r*0.6, 0);
        ctx.lineTo(-r*1.1, -r*0.4+sw*4);
        ctx.lineTo(-r*1.1, r*0.3+sw*2);
        ctx.closePath(); ctx.fill();
        // 胸鳍
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(r*0.1, r*0.2);
        ctx.quadraticCurveTo(-r*0.1, r*0.45+sw*2, -r*0.3, r*0.2);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.4, -r*0.15, r*0.08, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r*0.42, -r*0.15, r*0.05, 0, Math.PI*2); ctx.fill();
        // 牙齿（大白鲨以上）
        if (this.stage >= 5) {
            ctx.fillStyle = '#FFF';
            for (let i = 0; i < 3; i++) {
                const tx = r*0.65 + i*r*0.08;
                ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx-r*0.03, r*0.06); ctx.lineTo(tx+r*0.03, r*0.06); ctx.fill();
            }
        }
    }

    // --- 霸王乌贼 ---
    _drawSquid(ctx, r, t, sw) {
        const g = ctx.createRadialGradient(-r*0.1, -r*0.15, 2, 0, 0, r*0.8);
        g.addColorStop(0, '#8B008B'); g.addColorStop(0.5, '#4A235A'); g.addColorStop(1, '#1A0A2E');
        ctx.fillStyle = g;
        // 鱼雷身体
        ctx.beginPath();
        ctx.moveTo(r*0.6, 0);
        ctx.quadraticCurveTo(r*0.4, -r*0.3, 0, -r*0.3);
        ctx.quadraticCurveTo(-r*0.5, -r*0.25, -r*0.7, -r*0.1);
        ctx.quadraticCurveTo(-r*0.7, r*0.1, -r*0.5, r*0.25);
        ctx.quadraticCurveTo(0, r*0.3, r*0.4, r*0.3);
        ctx.quadraticCurveTo(r*0.6, r*0.15, r*0.6, 0);
        ctx.fill();
        // 尾部鳍片
        ctx.fillStyle = '#3D1A5C';
        ctx.beginPath();
        ctx.moveTo(-r*0.5, 0);
        ctx.quadraticCurveTo(-r*0.85, -r*0.35+sw*3, -r*0.9, -r*0.1+sw*2);
        ctx.quadraticCurveTo(-r*0.85, r*0.35+sw*3, -r*0.5, 0);
        ctx.fill();
        // 触手
        ctx.strokeStyle = '#6C3483'; ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI*0.25 - Math.PI*0.5 + sw*0.3;
            const len = r*0.5 + Math.sin(t*0.6 + i)*r*0.15;
            ctx.lineWidth = r*0.06 - i*0.005;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a)*r*0.25, Math.sin(a)*r*0.2);
            ctx.quadraticCurveTo(Math.cos(a+0.5)*len*0.4, Math.sin(a+0.5)*len*0.4, Math.cos(a)*len, Math.sin(a)*len);
            ctx.stroke();
        }
        // 大眼睛
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.2, -r*0.15, r*0.15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2C3E50'; ctx.beginPath(); ctx.arc(r*0.22, -r*0.15, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#00FFFF'; ctx.beginPath(); ctx.arc(r*0.25, -r*0.18, r*0.04, 0, Math.PI*2); ctx.fill();
    }

    // --- 深海巨兽 ---
    _drawLeviathan(ctx, r, t, sw) {
        const g = ctx.createRadialGradient(0, -r*0.1, 2, 0, 0, r*0.9);
        g.addColorStop(0, '#2C3E50'); g.addColorStop(0.5, '#1B2631'); g.addColorStop(1, '#0A0A1A');
        ctx.fillStyle = g;
        // 巨兽身体
        ctx.beginPath();
        ctx.moveTo(r*0.8, 0);
        ctx.quadraticCurveTo(r*0.5, -r*0.4, 0, -r*0.4);
        ctx.quadraticCurveTo(-r*0.6, -r*0.35, -r*0.8, -r*0.2);
        ctx.quadraticCurveTo(-r*0.9, 0, -r*0.8, r*0.2);
        ctx.quadraticCurveTo(-r*0.6, r*0.35, 0, r*0.4);
        ctx.quadraticCurveTo(r*0.5, r*0.4, r*0.8, 0);
        ctx.fill();
        // 发光斑点
        ctx.fillStyle = '#00BFFF';
        for (let i = 0; i < 6; i++) {
            const bx = -r*0.4 + i*r*0.2;
            const by = -r*0.15 + Math.sin(t*0.5+i)*r*0.05;
            const pulse = 0.3 + Math.sin(t*0.1+i*1.7)*0.3;
            ctx.globalAlpha = pulse*0.6;
            ctx.beginPath(); ctx.arc(bx, by, r*0.04, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        // 灯笼（发光）
        ctx.fillStyle = '#00FF88';
        ctx.beginPath(); ctx.arc(r*0.2, -r*0.35, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#7FFFAA';
        ctx.beginPath(); ctx.arc(r*0.2, -r*0.35, r*0.03, 0, Math.PI*2); ctx.fill();
        // 巨嘴
        ctx.fillStyle = '#2C0A1A';
        ctx.beginPath();
        ctx.moveTo(r*0.6, r*0.05);
        ctx.quadraticCurveTo(r*0.3, r*0.2, -r*0.3, r*0.1);
        ctx.quadraticCurveTo(-r*0.5, r*0.15, -r*0.4, r*0.05);
        ctx.quadraticCurveTo(r*0.2, 0, r*0.6, r*0.05);
        ctx.fill();
        // 利齿
        ctx.fillStyle = '#FFF';
        for (let i = 0; i < 4; i++) {
            const tx = r*0.3 - i*r*0.15;
            ctx.beginPath(); ctx.moveTo(tx, r*0.05); ctx.lineTo(tx-r*0.03, r*0.12); ctx.lineTo(tx+r*0.03, r*0.12); ctx.fill();
        }
        // 眼睛
        ctx.fillStyle = '#FF3300';
        ctx.beginPath(); ctx.arc(r*0.35, -r*0.2, r*0.08, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(r*0.35, -r*0.2, r*0.04, 0, Math.PI*2); ctx.fill();
    }

    // --- 海洋霸主 ---
    _drawOverlord(ctx, r, t, sw) {
        const g = ctx.createRadialGradient(0, -r*0.1, 2, 0, 0, r*0.9);
        g.addColorStop(0, '#2980B9'); g.addColorStop(0.5, '#1A5276'); g.addColorStop(1, '#0D1B2A');
        ctx.fillStyle = g;
        // 王权身体
        ctx.beginPath();
        ctx.moveTo(r*0.8, 0);
        ctx.quadraticCurveTo(r*0.5, -r*0.45, 0, -r*0.45);
        ctx.quadraticCurveTo(-r*0.6, -r*0.4, -r*0.85, -r*0.15);
        ctx.quadraticCurveTo(-r*0.9, 0, -r*0.85, r*0.15);
        ctx.quadraticCurveTo(-r*0.6, r*0.4, 0, r*0.45);
        ctx.quadraticCurveTo(r*0.5, r*0.45, r*0.8, 0);
        ctx.fill();
        // 金色王冠
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-r*0.1, -r*0.4);
        ctx.quadraticCurveTo(0, -r*0.7+sw*3, r*0.15, -r*0.4);
        ctx.quadraticCurveTo(r*0.3, -r*0.65+sw*4, r*0.4, -r*0.35);
        ctx.quadraticCurveTo(r*0.2, -r*0.5+sw*2, -r*0.1, -r*0.4);
        ctx.fill();
        // 金色纹路
        ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const sx = -r*0.3 + i*r*0.3;
            ctx.beginPath(); ctx.moveTo(sx, -r*0.3); ctx.quadraticCurveTo(sx, r*0.1, sx+r*0.1, r*0.3); ctx.stroke();
        }
        // 华丽尾鳍
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-r*0.7, 0);
        ctx.quadraticCurveTo(-r*1.0, -r*0.5+sw*6, -r*1.3, -r*0.15+sw*3);
        ctx.quadraticCurveTo(-r*1.2, 0, -r*1.3, r*0.15+sw*3);
        ctx.quadraticCurveTo(-r*1.0, r*0.5+sw*6, -r*0.7, 0);
        ctx.fill();
        // 金色鳞片
        ctx.fillStyle = 'rgba(255,215,0,0.3)';
        for (let i = 0; i < 4; i++) {
            const sx = -r*0.3 + i*r*0.2;
            ctx.beginPath(); ctx.arc(sx, -r*0.1, r*0.05, 0, Math.PI); ctx.fill();
        }
        // 眼睛
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(r*0.4, -r*0.18, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(r*0.42, -r*0.18, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r*0.44, -r*0.18, r*0.04, 0, Math.PI*2); ctx.fill();
    }

    draw(ctx, s) {
        if (!this.alive) return;
        try {
            const r = this.size;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(this.dir * s, s);
            // 贴图模式（支持精灵表动画）
            const img = SPRITES[this.stage];
            if (img && img.complete && img.naturalWidth > 0 && spritesReady) {
                const animP = (this.tailA / (Math.PI * 2) + 0.5) % 1.0;
                const frame = getSpriteFrame(img, this.stage, animP);
                const scale = r * 2.4 / Math.max(frame.sw, frame.sh);
                const sw = frame.sw * scale;
                const sh = frame.sh * scale;
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.color;
                ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, -sw/2, -sh/2, sw, sh);
                ctx.shadowBlur = 0;
            } else {
                this.drawCreature(ctx, r);
            }
            ctx.restore();
        } catch(e) {}
    }
}

// ============================================
// Player
// ============================================
class Player extends Fish {
    constructor(x, y) {
        super(0, x, y, false);
        this.hp = EVO[0].hp;
        this.maxHp = EVO[0].hp;
        this.growth = 0;
        this.growthToNext = EVO[0].ng;
        this.score = 0;
        this.inv = 0;
        this.visS = 1.0;
        this.tgtVisS = 1.0;
        // 进化特效
        this.evolveFlash = 0;
        this.evolveParticles = [];
    }

    update(w, h) {
        if (this.inv > 0) this.inv--;
        super.update(null, w, h);
        this.visS += (this.tgtVisS - this.visS) * CONFIG.ZOOM_SMOOTH;
        // 进化闪烁特效
        if (this.evolveFlash > 0) this.evolveFlash--;
        // 更新进化粒子
        for (let i = this.evolveParticles.length - 1; i >= 0; i--) {
            const p = this.evolveParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.evolveParticles.splice(i, 1);
        }
    }

    setTarget(tx, ty) {
        const ang = Math.atan2(ty - this.y, tx - this.x);
        const spd = this.baseSpeed * CONFIG.PLAYER_SPEED;
        this.ax = Math.cos(ang) * spd * 0.20;
        this.ay = Math.sin(ang) * spd * 0.20;
        this.dir = tx > this.x ? 1 : -1;
    }

    eat(fish) {
        if (fish.stage > this.stage) return false;
        SOUND.eat(); // 吞食音效
        let gain = fish.growthValue;
        const diff = this.stage - fish.stage;
        if (diff > 4) gain = 0;
        else if (diff > 2) gain = Math.floor(gain * 0.5);
        this.growth += gain;
        this.score += gain;
        while (this.stage < EVO.length - 1 && this.growth >= this.growthToNext) {
            this.evolve();
        }
        return true;
    }

    evolve() {
        if (this.stage >= EVO.length - 1) return;
        SOUND.evolve(); // 进化音效
        this.stage++;
        const d = EVO[this.stage];
        this.name = d.n;
        this.size = d.sz;
        this.baseSize = d.sz;
        this.color = d.c;
        this.speed = d.speed;
        this.growthToNext = d.ng;
        this.maxHp = d.hp;
        this.hp = this.maxHp;
        this.inv = 90;
        // 进化闪光特效
        this.evolveFlash = 30;
        // 迸发粒子
        this.evolveParticles = [];
        for (let i = 0; i < 20; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            this.evolveParticles.push({
                x: this.x, y: this.y,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                life: 30 + Math.floor(Math.random() * 20),
                size: 3 + Math.random() * 4,
                color: d.c
            });
        }
        if (this.stage >= 6) currentScene = 2;
        else if (this.stage >= 3) currentScene = 1;
    }

    takeDamage(attacker) {
        if (this.inv > 0) return false;
        SOUND.hit(); // 受伤音效
        this.hp--;
        this.inv = CONFIG.INVINCIBLE;
        const ang = Math.atan2(this.y - attacker.y, this.x - attacker.x);
        this.vx = Math.cos(ang) * CONFIG.KNOCK;
        this.vy = Math.sin(ang) * CONFIG.KNOCK;
        return this.hp <= 0;
    }

    draw(ctx, s) {
        try {
        if (this.inv > 0 && Math.floor(this.inv / 4) % 2 === 0) return;

        // 进化粒子特效
        for (const p of this.evolveParticles) {
            ctx.save();
            ctx.globalAlpha = p.life / 40;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / 40), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 进化闪光
        if (this.evolveFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.evolveFlash / 30 * 0.4;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * s * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.dir * s, s);
        // 贴图模式（支持精灵表动画）
        const img = SPRITES[this.stage];
        if (img && img.complete && img.naturalWidth > 0 && spritesReady) {
            const animP = (this.tailA / (Math.PI * 2) + 0.5) % 1.0;
            const frame = getSpriteFrame(img, this.stage, animP);
            const scale = this.size * 2.4 / Math.max(frame.sw, frame.sh);
            const sw = frame.sw * scale;
            const sh = frame.sh * scale;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, -sw/2, -sh/2, sw, sh);
            ctx.shadowBlur = 0;
        } else {
            this.drawCreature(ctx, this.size);
        }
        ctx.restore();

        // 名字和成长条
        ctx.save();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - this.size * s - 8);
        if (this.stage < EVO.length - 1) {
            const pct = Math.min(1, this.growth / this.growthToNext);
            const bw = 50, bh = 4;
            const bx = this.x - bw / 2, by = this.y - this.size * s - 15;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#0F0';
            ctx.fillRect(bx, by, bw * pct, bh);
        }
        ctx.restore();
        } catch(e) {}
    }

    drawHP(ctx, w) {
        const bw = 120, bh = 10, x = 10, y = 42;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, bw, bh);
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = pct > 0.5 ? '#0F0' : pct > 0.25 ? '#FFA500' : '#F00';
        ctx.fillRect(x, y, bw * pct, bh);
        ctx.fillStyle = '#FFF';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('\u2764 ' + this.hp + '/' + this.maxHp, x, y + bh + 14);
        ctx.restore();
    }
}

// 圆角矩形辅助
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ============================================
// Game
// ============================================
class Game {
    constructor() {
        this.w = SCREEN_W(); this.h = SCREEN_H();
        this.player = null;
        this.fishes = [];
        this.particles = [];
        this.decorations = []; // 装饰元素（海藻、珊瑚等）
        this.state = 'playing';
        this.tx = 0; this.ty = 0; this.touching = false;
        this.balanceT = 0;
        this.time = 0; // 全局时间（用于动画）
        this._lastScene = currentScene;
        // 倒计时（初始状态不启动）
        this.timeLeft = CONFIG.GAME_DURATION;
        this.lastRealTime = Date.now();
        this.state = 'menu'; // 初始为菜单状态
        // 排行榜
        this.leaderboard = this._loadHighScore();
        this.isNewRecord = false;
        var self = this;
        // 异步加载GitHub排行榜
        this._loadLeaderboard(function(data) { self.leaderboard = data; });
        // 绑定名字提交按钮
        setTimeout(function() {
            var btn = document.getElementById('submitBtn');
            if (btn) {
                btn.onclick = function() {
                    var name = document.getElementById('playerName').value.trim();
                    if (!name) { alert('请输入名字'); return; }
                    self._submitRecord(name);
                };
                document.getElementById('playerName').onkeydown = function(e) {
                    if (e.keyCode === 13) btn.onclick();
                };
            }
        }, 100);
        this.init();
        this.bindInput();
        this.loop();
    }

    initDecorations() {
        this.decorations = [];
        const sc = currentScene;

        // 海藻
        const seaweedCount = sc === 0 ? 12 : sc === 1 ? 10 : 6;
        for (let i = 0; i < seaweedCount; i++) {
            const x = 20 + Math.random() * (this.w - 40);
            const h = 40 + Math.random() * 80;
            this.decorations.push(new Seaweed(x, this.h - 30, h, sc));
        }

        // 珊瑚（浅海专属）
        if (sc === 0) {
            const coralCount = 5 + Math.floor(Math.random() * 4);
            for (let i = 0; i < coralCount; i++) {
                const x = 30 + Math.random() * (this.w - 60);
                this.decorations.push(new Coral(x, this.h - 30, sc));
            }
        }
    }

    init() {
        this.player = new Player(this.w / 2, this.h / 2);
        this.particles = [];
        for (let i = 0; i < (SCENES[currentScene].r ? 40 : 50); i++) {
            this.particles.push(new Particle(SCENES[currentScene].r ? 'bubble' : 'glow', this.w, this.h));
        }
        this.fishes = [];
        for (let i = 0; i < CONFIG.TARGET_FISH; i++) this.spawnEdge();
        this.initDecorations();
    }

    bindInput() {
        const self = this;
        let inputLock = false;
        function onStart(cx, cy) {
            if (inputLock) return;
            inputLock = true;
            setTimeout(function() { inputLock = false; }, 100);
            if (self.state === 'menu') {
                // 开始游戏
                self.state = 'playing';
                self.lastRealTime = Date.now();
                SOUND.startBGM();
            } else if (self.state === 'gameover') {
                self.restart();
                SOUND.startBGM();
            } else {
                SOUND.startBGM();
            }
            self.tx = cx; self.ty = cy; self.touching = true;
        }
        function onMove(cx, cy) {
            if (self.touching) { self.tx = cx; self.ty = cy; }
        }
        function onEnd() { self.touching = false; }

        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchend', function() { onEnd(); });

        canvas.addEventListener('mousedown', function(e) { onStart(e.clientX, e.clientY); });
        canvas.addEventListener('mousemove', function(e) { onMove(e.clientX, e.clientY); });
        canvas.addEventListener('mouseup', function() { onEnd(); });
    }

    spawnEdge() {
        const ps = this.player.stage;
        let st;
        const r = Math.random();
        if (r < 0.45) st = Math.max(0, ps - 1);
        else if (r < 0.75) st = ps;
        else if (r < 0.9) st = Math.min(EVO.length - 1, ps + 1);
        else st = Math.min(EVO.length - 1, ps + 2);

        let x, y;
        const m = CONFIG.SPAWN_MARGIN;
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: x = -m; y = rnd(50, this.h - 80); break;
            case 1: x = this.w + m; y = rnd(50, this.h - 80); break;
            case 2: x = rnd(50, this.w - 50); y = -m; break;
            default: x = rnd(50, this.w - 50); y = this.h + m; break;
        }
        const fish = new Fish(st, x, y, true);
        const ang = Math.atan2(this.h / 2 - y, this.w / 2 - x);
        // 初始速度足够大，让鱼快速游入视野
        fish.vx = Math.cos(ang) * fish.baseSpeed * 3.0;
        fish.vy = Math.sin(ang) * fish.baseSpeed * 3.0;
        this.fishes.push(fish);
    }

    maintain() {
        const self = this;
        const alive = this.fishes.filter(function(f) {
            return f.alive && f.x > -50 && f.x < self.w + 50 && f.y > -50 && f.y < self.h + 50;
        });
        const cnt = alive.length;
        if (cnt < CONFIG.MIN_FISH) {
            const need = CONFIG.TARGET_FISH - cnt;
            for (let i = 0; i < need; i++) self.spawnEdge();
        } else if (cnt < CONFIG.TARGET_FISH) {
            if (Math.random() < 0.15) self.spawnEdge();
        }
        this.balanceT++;
        if (this.balanceT >= CONFIG.BALANCE_INT) {
            this.balanceT = 0;
            this.balanceTypes();
        }
        this.fishes = this.fishes.filter(function(f) {
            if (!f.alive) return false;
            if (f.x < -200 || f.x > self.w + 200 || f.y < -200 || f.y > self.h + 200) return false;
            return true;
        });
    }

    balanceTypes() {
        const self = this;
        const ps = self.player.stage;
        const tc = {};
        let total = 0;
        for (let i = 0; i < self.fishes.length; i++) {
            const f = self.fishes[i];
            if (!f.alive) continue;
            if (f.x < 0 || f.x > self.w || f.y < 0 || f.y > self.h) continue;
            if (!tc[f.stage]) tc[f.stage] = 0;
            tc[f.stage]++;
            total++;
        }
        if (total === 0) return;
        const tgt = Math.floor(total * 0.35);
        const cur = tc[ps] || 0;
        if (cur < tgt * 0.5 && total < CONFIG.TARGET_FISH) self.spawnEdge();
        for (let i = 0; i < self.fishes.length; i++) {
            const f = self.fishes[i];
            if (!f.alive || !f.isNPC) continue;
            const df = f.stage - ps;
            if (df > 3 || df < -3) {
                const ea = Math.random() > 0.5
                    ? (Math.random() > 0.5 ? 0 : Math.PI)
                    : (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
                f.ax += Math.cos(ea) * f.maxFlee * 0.12;
                f.ay += Math.sin(ea) * f.maxFlee * 0.12;
            }
        }
    }

    update() {
        if (this.state !== 'playing') return;
        this.time++;
        const self = this;
        if (this.touching) this.player.setTarget(this.tx, this.ty);
        this.player.update(this.w, this.h);
        for (let i = 0; i < this.fishes.length; i++) this.fishes[i].update(this.player, this.w, this.h);

        // 更新装饰元素
        for (const d of this.decorations) d.update();

        // 碰撞
        for (let i = this.fishes.length - 1; i >= 0; i--) {
            const f = this.fishes[i];
            if (!f.alive) continue;
            const d = vecDist(this.player, f);
            const cd = (this.player.size + f.size) * 0.5;
            if (d < cd && f.stage <= this.player.stage) {
                if (this.player.eat(f)) { f.alive = false; this.player.vx *= 1.3; this.player.vy *= 1.3; }
            }
            if (d < cd + 10 && f.stage > this.player.stage) {
                if (this.player.takeDamage(f)) { this.gameOver(); return; }
            }
        }

        this.fishes = this.fishes.filter(function(f) { return f.alive; });
        this.maintain();

        // 缩放
        const maxV = this.h * CONFIG.MAX_VRATIO;
        this.player.tgtVisS = Math.min(1.0, maxV / Math.max(1, this.player.size));

        // 倒计时
        const now = Date.now();
        const dt = (now - this.lastRealTime) / 1000;
        this.lastRealTime = now;
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.gameOver();
            return;
        }

        // 场景变更时刷新装饰和粒子
        if (this._lastScene !== currentScene) {
            this._lastScene = currentScene;
            this.initDecorations();
            // 刷新粒子
            this.particles = [];
            for (let i = 0; i < (SCENES[currentScene].r ? 40 : 50); i++) {
                this.particles.push(new Particle(SCENES[currentScene].r ? 'bubble' : 'glow', this.w, this.h));
            }
        }
    }

    drawBackground() {
        const w = this.w, h = this.h;
        const sc = SCENES[currentScene];

        // 主背景渐变
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, sc.t);
        g.addColorStop(0.5, sc.b);
        g.addColorStop(1, currentScene === 0 ? '#0d3a5c' : currentScene === 1 ? '#061525' : '#020208');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

        // 光线效果（浅海）
        if (currentScene === 0) {
            drawLightRays(ctx, w, h, this.time);
        }

        // 深海发光
        if (currentScene === 2) {
            drawDeepSeaGlow(ctx, w, h, this.time);
        }

        // 水面波纹（浅海）
        drawWaterSurface(ctx, w, h, this.time);

        // 海底波浪地形
        ctx.fillStyle = sc.f;
        ctx.beginPath();
        ctx.moveTo(0, h);
        const waveAmp = currentScene === 0 ? 6 : 3;
        for (let x = 0; x <= w; x += 8) {
            const y = h - 30 + Math.sin(x * 0.03 + 1) * waveAmp + Math.sin(x * 0.07 + 2) * (waveAmp * 0.5);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // 海底焦散光纹（水底光纹）- 浅海
        if (currentScene === 0) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            for (let i = 0; i < 6; i++) {
                const cx = w*0.2 + ((i*137+this.time*0.5) % (w*0.8));
                const cy = h - 14 + Math.sin(this.time*0.002 + i*1.3) * 8;
                const rx = 40 + Math.sin(this.time*0.0015 + i*2.7) * 20;
                const ry = 6 + Math.sin(this.time*0.001 + i*0.9) * 3;
                ctx.fillStyle = '#FFF8DC';
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 海底纹理
        drawSeabedTexture(ctx, w, h);

        // 暗角氛围效果
        ctx.save();
        const vigGrad = ctx.createRadialGradient(w/2, h/2, h*0.25, w/2, h/2, h*0.95);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, currentScene === 0 ? 'rgba(0,10,30,0.15)' : 'rgba(0,0,10,0.35)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // 远处悬浮微粒层（浮游生物）
        ctx.save();
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 20; i++) {
            const px = ((i * 137 + this.time * 0.1) % w);
            const py = ((i * 89 + 50) % h) + Math.sin(this.time * 0.004 + i * 1.3) * 20;
            ctx.fillStyle = currentScene === 0 ? '#FFEEDD' : '#88CCDD';
            const sz = 1 + Math.sin(this.time * 0.003 + i * 2.1) * 0.8;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.5, sz), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    draw() {
        const w = this.w, h = this.h;
        const s = this.player.visS;

        // 1. 背景
        this.drawBackground();

        // 2. 装饰元素（位于鱼后方，在屏幕坐标绘制）
        for (const d of this.decorations) d.draw(ctx, 1.0);

        // 3. 全屏水波折射效果（水面波纹覆盖层）
        ctx.save();
        ctx.globalAlpha = 0.30;
        const waveColor = currentScene === 0 ? 'rgba(200,230,255,' : 'rgba(120,170,220,';
        for (let row = 0; row < 20; row++) {
            const y = row * (h / 20);
            const alpha = 0.10 + Math.sin(this.time * 0.004 + row * 0.7) * 0.06;
            ctx.fillStyle = waveColor + alpha + ')';
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= w; x += 4) {
                const wy = y + Math.sin(x * 0.03 + this.time * 0.004 + row * 0.6) * 5;
                ctx.lineTo(x, wy);
            }
            ctx.lineTo(w, y + 10);
            for (let x = w; x >= 0; x -= 4) {
                const wy = y + 10 + Math.sin(x * 0.03 + this.time * 0.004 + row * 0.6 + 2) * 5;
                ctx.lineTo(x, wy);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // 4. 深度雾气（顶部亮、底部暗）
        ctx.save();
        const fogGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (currentScene === 0) {
            fogGrad.addColorStop(0, 'rgba(180,220,255,0.25)');
            fogGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
            fogGrad.addColorStop(1, 'rgba(0,30,60,0.40)');
        } else if (currentScene === 1) {
            fogGrad.addColorStop(0, 'rgba(0,40,80,0.25)');
            fogGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
            fogGrad.addColorStop(1, 'rgba(0,0,20,0.45)');
        } else {
            fogGrad.addColorStop(0, 'rgba(0,0,30,0.30)');
            fogGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
            fogGrad.addColorStop(1, 'rgba(0,0,5,0.60)');
        }
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // 5. 浮游生物微粒
        ctx.save();
        ctx.globalAlpha = 0.30;
        for (let i = 0; i < 25; i++) {
            const px = ((i * 137 + this.time * 0.12) % w);
            const py = ((i * 89 + 50) % h) + Math.sin(this.time * 0.005 + i * 1.3) * 25;
            ctx.fillStyle = currentScene === 0 ? '#FFEEDD' : '#88CCDD';
            const sz = Math.max(0.5, 1 + Math.sin(this.time * 0.003 + i * 2.1) * 0.8);
            ctx.beginPath();
            ctx.arc(px, py, sz, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 6. 粒子
        for (let i = 0; i < this.particles.length; i++) this.particles[i].draw(ctx, s);

        // 7. 鱼
        for (let i = 0; i < this.fishes.length; i++) this.fishes[i].draw(ctx, s);

        // 8. 玩家
        if (this.state === 'playing') this.player.draw(ctx, s);

        // 9. UI
        this.drawUI();
    }

    drawUI() {
        const w = this.w, h = this.h;

        // === 开始菜单 ===
        if (this.state === 'menu') {
            ctx.save();
            // 背景
            var grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#0a3060');
            grad.addColorStop(0.5, '#0a1a3a');
            grad.addColorStop(1, '#050510');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // 水波动态背景
            ctx.save();
            ctx.globalAlpha = 0.08;
            for (var r = 0; r < 20; r++) {
                var yy = r * (h / 20);
                ctx.fillStyle = 'rgba(100,180,255,' + (0.05 + Math.sin(this.time*0.003+r*0.5)*0.03) + ')';
                ctx.beginPath();
                ctx.moveTo(0, yy);
                for (var xx = 0; xx <= w; xx += 4) {
                    ctx.lineTo(xx, yy + Math.sin(xx*0.025 + this.time*0.004 + r*0.4) * 4);
                }
                ctx.lineTo(w, yy + 8);
                for (xx = w; xx >= 0; xx -= 4) {
                    ctx.lineTo(xx, yy + 8 + Math.sin(xx*0.025 + this.time*0.004 + r*0.4 + 2) * 4);
                }
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // 标题
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 42px Arial';
            ctx.fillText('\u{1F41F} 海洋冒险', w / 2, h * 0.28);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#8AB4F8';
            ctx.fillText('一条鱼的进化之旅', w / 2, h * 0.28 + 30);

            // 操作说明
            ctx.font = '14px Arial';
            ctx.fillStyle = '#AAA';
            ctx.fillText('\u{1F446} 滑动屏幕控制小鱼移动', w / 2, h * 0.44);
            ctx.fillText('\u{1F423} 吞噬比你小的鱼来进化', w / 2, h * 0.44 + 22);
            ctx.fillText('\u{23F1} 在倒计时结束前尽可能得分', w / 2, h * 0.44 + 44);

            // 开始按钮
            var btnY = h * 0.62;
            ctx.fillStyle = 'rgba(255,215,0,0.15)';
            roundRect(ctx, w/2 - 100, btnY - 22, 200, 44, 22);
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            roundRect(ctx, w/2 - 100, btnY - 22, 200, 44, 22);
            ctx.stroke();
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('点 击 开 始', w / 2, btnY + 7);

            // 排行榜预览
            ctx.font = '13px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText('-- 排行榜 --', w / 2, h * 0.76);
            var lb = this.leaderboard || [];
            var medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
            for (var i = 0; i < Math.min(lb.length, 5); i++) {
                var e = lb[i];
                ctx.fillStyle = '#AAA';
                ctx.font = '13px Arial';
                ctx.fillText((i < 3 ? medals[i] : (i+1) + '.') + '  ' + (e.name||'玩家') + '  ' + e.score, w / 2, h * 0.76 + 25 + i * 20);
            }

            // 署名
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '11px Arial';
            ctx.fillText('制作人：陈军睿', w / 2, h - 20);
            ctx.restore();
            return;
        }

        const self = this;
        ctx.save();
        // 半透明顶栏
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, w, 38);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('\u{1F41F} ' + this.player.name + ' Lv.' + (this.player.stage + 1), 10, 25);
        // 倒计时（右侧）
        ctx.textAlign = 'right';
        const secs = Math.max(0, Math.ceil(this.timeLeft));
        ctx.fillStyle = secs <= 10 ? '#FF4444' : '#FFF';
        ctx.fillText('\u23F1 ' + secs + 's', w - 10, 25);
        // 得分（倒计时左侧）
        ctx.fillStyle = '#FFF';
        ctx.fillText('\u{2B50} ' + this.player.score, w - 75, 25);
        ctx.textAlign = 'center';
        ctx.fillText('\u{1F4CD} ' + SCENES[currentScene].n, w / 2, 25);
        ctx.restore();

        if (this.player) this.player.drawHP(ctx, w);

        // 贴图加载提示
        if (!spritesReady && spritesLoadedCount > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('加载贴图中... ' + spritesLoadedCount + '/' + SPRITE_NAMES.length, w / 2, this.h - 10);
            ctx.restore();
        }

        if (this.state === 'gameover') {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, w, this.h);

            // 庆祝文字
            if (this.isNewRecord) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('\u{1F451} 新纪录！ \u{1F451}', w / 2, this.h / 2 - 100);
            } else if (this.isTop10) {
                ctx.fillStyle = '#8AB4F8';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('\u{1F3C6} 进入前十！', w / 2, this.h / 2 - 100);
            }

            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 34px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束', w / 2, this.h / 2 - 55);

            // 当前得分
            ctx.font = '20px Arial';
            ctx.fillStyle = this.isNewRecord ? '#FFD700' : '#FFF';
            ctx.fillText('得分: ' + this.player.score, w / 2, this.h / 2 - 15);

            // 排行榜（左对齐）
            ctx.font = '15px Arial';
            ctx.fillStyle = '#AAA';
            ctx.textAlign = 'left';
            ctx.fillText('-- 排行榜 --', w / 2 - 80, this.h / 2 + 15);
            const list = this.leaderboard || [];
            const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}']; // 🥇🥈🥉
            for (let i = 0; i < Math.min(list.length, 8); i++) {
                const y = this.h / 2 + 40 + i * 22;
                var entry = list[i];
                var name = entry.name || '玩家';
                var score = entry.score || entry;
                var isCurrent = score === this.player.score;
                ctx.fillStyle = isCurrent && this.isNewRecord ? '#FFD700' : '#DDD';
                ctx.font = isCurrent && this.isNewRecord ? 'bold 15px Arial' : '14px Arial';
                var prefix = i < 3 ? medals[i] + ' ' : (i+1) + '. ';
                ctx.fillText(prefix + name + ' - ' + score, w / 2 - 80, y);
            }
            ctx.textAlign = 'center';

            // 署名
            ctx.font = '11px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillText('制作人：陈军睿', w / 2, this.h / 2 + 185);

            ctx.font = '15px Arial';
            ctx.fillStyle = '#AAA';
            ctx.fillText('点击屏幕重新开始', w / 2, this.h / 2 + 155);
            ctx.restore();
        }
    }

    // 排行榜系统（跨设备）
    _loadHighScore() {
        try {
            var data = localStorage.getItem('fishGameLeaderboard');
            if (data) {
                var list = JSON.parse(data);
                // 兼容旧格式（纯数字数组）
                if (list.length > 0 && typeof list[0] === 'number') {
                    list = list.map(function(s) { return { name: '玩家', score: s }; });
                    localStorage.setItem('fishGameLeaderboard', JSON.stringify(list));
                }
                return list;
            }
        } catch(e) {}
        return [];
    }
    _saveHighScore(list) {
        try {
            localStorage.setItem('fishGameLeaderboard', JSON.stringify(list));
        } catch(e) {}
    }

    // 从GitHub加载排行榜
    _loadLeaderboard(callback) {
        var self = this;
        var local = self._loadHighScore();
        self.leaderboard = local;

        // 先从CDN读取（jsDelivr在国内有加速）
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.LEADERBOARD_CDN + '?' + Date.now(), true);
        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (Array.isArray(data) && data.length > 0) {
                    self.leaderboard = data;
                    self._saveHighScore(data);
                    if (callback) callback(data);
                    return;
                }
            } catch(e) {}
            // CDN失败，尝试raw URL
            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', CONFIG.LEADERBOARD_RAW + '?' + Date.now(), true);
            xhr2.onload = function() {
                try {
                    var d2 = JSON.parse(xhr2.responseText);
                    if (Array.isArray(d2) && d2.length > 0) {
                        self.leaderboard = d2;
                        self._saveHighScore(d2);
                        if (callback) callback(d2); return;
                    }
                } catch(e) {}
                if (callback) callback(local);
            };
            xhr2.onerror = function() { if (callback) callback(local); };
            xhr2.send();
        };
        xhr.onerror = function() {
            // CDN离线，尝试raw URL
            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', CONFIG.LEADERBOARD_RAW + '?' + Date.now(), true);
            xhr2.onload = function() {
                try {
                    var d2 = JSON.parse(xhr2.responseText);
                    if (Array.isArray(d2) && d2.length > 0) {
                        self.leaderboard = d2; self._saveHighScore(d2);
                    }
                } catch(e) {}
                if (callback) callback(self.leaderboard);
            };
            xhr2.onerror = function() { if (callback) callback(local); };
            xhr2.send();
        };
        xhr.send();
    }

    // 提交记录（保存到本地+尝试同步到GitHub）
    _submitRecord(name) {
        var self = this;
        var entry = { name: name, score: this.player.score };

        // 先读已有排行榜，合并新记录
        var list = self._loadHighScore();
        list.push(entry);
        list.sort(function(a, b) { return b.score - a.score; });
        list = list.slice(0, 10);
        self.leaderboard = list;
        self._saveHighScore(list);

        // 尝试用fetch同步到GitHub（可能因CORS失败，失败不影响本地）
        try {
            var token = 'ghp_' + '9KHxJ0eUgxSdCrIlPhG7jo0Rpmbi3m0zNld8';
            var api = 'https://api.github.com/repos/' + CONFIG.GITHUB_REPO + '/contents/leaderboard.json';
            var h = new Headers();
            h.append('Authorization', 'token ' + token);
            h.append('Content-Type', 'application/json');
            fetch(api, { method: 'GET', headers: h })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var sha = d.sha;
                var content = btoa(unescape(encodeURIComponent(JSON.stringify(list))));
                fetch(api, {
                    method: 'PUT',
                    headers: h,
                    body: JSON.stringify({ message: 'Update', content: content, sha: sha, branch: 'main' })
                }).catch(function(e) {});
            })
            .catch(function(e) {});
        } catch(e) {}

        self._hideNameInput();
    }

    _showNameInput() {
        document.getElementById('newScore').textContent = this.player.score;
        var title = document.querySelector('#nameOverlay div div:first-child');
        if (title) {
            title.textContent = this.isNewRecord ? '\u{1F451} 新纪录！' : '\u{1F3C6} 进入前十！';
        }
        document.getElementById('nameOverlay').style.display = 'flex';
        document.getElementById('playerName').value = '';
        document.getElementById('playerName').focus();
    }
    _hideNameInput() {
        document.getElementById('nameOverlay').style.display = 'none';
    }

    gameOver() {
        this.state = 'gameover';
        try {
            var score = this.player.score;
            var lb = this.leaderboard || [];
            
            var isTop10 = false;
            if (score > 0) {
                if (lb.length < 10) {
                    isTop10 = true;
                } else {
                    var last = lb[lb.length - 1];
                    isTop10 = score > (last.score || last);
                }
                this.isNewRecord = lb.length === 0 || score > (lb[0].score || lb[0]);
            } else {
                this.isNewRecord = false;
            }
            this.isTop10 = isTop10;
            
            if (isTop10) {
                SOUND.record();
                var self = this;
                setTimeout(function() {
                    try { self._showNameInput(); } catch(e) { console.log('name input error', e); }
                }, 50);
            } else {
                SOUND.gameover();
            }
        } catch(e) {
            console.log('gameOver error', e);
            SOUND.gameover();
        }
    }

    restart() {
        currentScene = 0;
        this.timeLeft = CONFIG.GAME_DURATION;
        this.lastRealTime = Date.now();
        this.isNewRecord = false;
        this._hideNameInput();
        this.init();
        this.state = 'playing';
        // 重新加载排行榜
        var self = this;
        this._loadLeaderboard(function(data) { self.leaderboard = data; });
    }

    loop() {
        this.w = SCREEN_W(); this.h = SCREEN_H();
        this.update();
        this.draw();
        const self = this;
        requestAnimationFrame(function() { self.loop(); });
    }
}

new Game();
