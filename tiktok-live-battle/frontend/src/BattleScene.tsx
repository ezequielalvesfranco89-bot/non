import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { State } from './types';

type Particle = { graphic: Graphics; vx: number; vy: number; life: number; maxLife: number; rotation: number };
type DamageLabel = { text: Text; life: number; maxLife: number; vy: number };
type Runtime = { app: Application; root: Container; backdrop: Container; boss: Container; aura: Container; ambient: Container; effects: Container; particles: Particle[]; labels: DamageLabel[]; seen: Set<string>; kind: string; level: number; session: string; hp: number; hit: number; time: number; ready: boolean; width: number; height: number; reduced: boolean; observer: ResizeObserver | null };
const COLORS = { cyan: 0x52ffe0, violet: 0xa769ff, pink: 0xff579a, gold: 0xffd168, ink: 0x0c0a24 };
const W = 1000;
const H = 620;

function polygon(g: Graphics, points: number[], color: number, border?: number, alpha = 1) {
  g.poly(points).fill({ color, alpha });
  if (border !== undefined) g.stroke({ color: border, width: 2, alpha: .8 });
}
function line(g: Graphics, points: number[], color: number, width = 2, alpha = 1) {
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.stroke({ color, width, alpha });
}
function label(text: string, size: number, color: number) {
  return new Text({ text, style: { fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: size, fill: color, stroke: { color: 0x171029, width: 5 }, dropShadow: { color: 0x000000, alpha: .4, blur: 6, distance: 2 } } });
}

function drawBackdrop(runtime: Runtime, level: number, transparent: boolean) {
  const layer = runtime.backdrop;
  layer.removeChildren().forEach((child) => child.destroy());
  const g = new Graphics();
  const palette = level % 3;
  const sky = [0x0f102b, 0x160d2a, 0x0a192d][palette];
  if (!transparent) {
    g.rect(0, 0, W, H).fill(sky);
    // Luminous, layered mist. Graphics remain static: animation only moves containers.
    for (let i = 7; i > 0; i--) g.ellipse(500, 270, i * 65, i * 43).fill({ color: [0x7150b8, 0x9c3c77, 0x266e91][palette], alpha: .018 });
    g.circle(764, 108, 48).fill({ color: 0xc5b4ff, alpha: .13 });
    g.circle(779, 97, 43).fill(sky);
    for (let i = 0; i < 55; i++) {
      const x = ((i * 137.51) % 960) + 20;
      const y = ((i * 53.17) % 335) + 15;
      g.circle(x, y, i % 4 === 0 ? 1.7 : .8).fill({ color: 0xe6dcff, alpha: .12 + (i % 5) * .08 });
    }
    // Silhouettes of the shattered citadel.
    polygon(g, [0, 200, 30, 190, 30, 120, 65, 100, 76, 177, 116, 190, 120, 97, 137, 68, 153, 97, 161, 214, 205, 230, 215, 171, 240, 147, 255, 214, 284, 241, 285, 360, 0, 360], 0x14172c);
    polygon(g, [1000, 150, 970, 178, 942, 160, 933, 78, 912, 54, 897, 82, 892, 190, 855, 211, 850, 155, 832, 135, 808, 170, 801, 249, 770, 260, 758, 216, 729, 198, 710, 247, 710, 370, 1000, 370], 0x13162a);
    // Foreground temple pillars frame the boss.
    polygon(g, [76, 377, 87, 115, 110, 83, 144, 105, 164, 376], 0x22203b, 0x37314f);
    polygon(g, [103, 118, 111, 110, 125, 120, 134, 350, 104, 350], 0x17182d);
    polygon(g, [838, 376, 860, 104, 892, 84, 917, 117, 930, 377], 0x22203b, 0x37314f);
    polygon(g, [875, 120, 890, 110, 899, 118, 900, 350, 869, 350], 0x17182d);
    line(g, [77, 374, 72, 396, 170, 396, 164, 374], 0x45405e, 3);
    line(g, [838, 374, 830, 396, 935, 396, 930, 374], 0x45405e, 3);
    g.rect(0, 385, W, H - 385).fill(0x101327);
    for (let i = 0; i < 10; i++) line(g, [500, 370, i * 140 - 150, H], 0x66628b, 1, .12);
    for (const y of [410, 460, 530, 615]) line(g, [0, y, W, y], 0x66628b, 1, .1);
    // Jagged edges of the arena.
    polygon(g, [0, 565, 50, 540, 90, 551, 132, 522, 192, 563, 248, 574, 270, 620, 0, 620], 0x0b0e1d);
    polygon(g, [1000, 555, 957, 548, 923, 520, 884, 552, 843, 545, 797, 585, 765, 620, 1000, 620], 0x0b0e1d);
    for (const x of [120, 880]) {
      g.ellipse(x, 311, 12, 25).fill({ color: COLORS.cyan, alpha: .06 });
      polygon(g, [x - 8, 323, x - 5, 299, x, 280, x + 7, 304, x + 6, 322], COLORS.cyan, undefined, .6);
      line(g, [x - 13, 329, x + 13, 329], 0x8570af, 3);
    }
  }
  // The rune platform is part of the game art, retained on the transparent overlay.
  g.ellipse(500, 480, 234, 48).fill({ color: 0x070914, alpha: .5 });
  g.ellipse(500, 468, 206, 42).fill({ color: 0x4f3e84, alpha: .26 }).stroke({ color: 0x9f7cff, width: 1.5, alpha: .35 });
  g.ellipse(500, 467, 183, 32).stroke({ color: COLORS.violet, width: 1, alpha: .35 });
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = 500 + Math.cos(angle) * 194;
    const y = 468 + Math.sin(angle) * 36;
    line(g, [x - 4, y - 2, x, y - 6, x + 4, y - 2, x, y + 2], COLORS.cyan, 1, .6);
  }
  layer.addChild(g);
}

function createGolem() {
  const boss = new Container();
  const shadow = new Graphics().ellipse(0, 116, 97, 17).fill({ color: 0x030611, alpha: .48 });
  boss.addChild(shadow);
  const g = new Graphics();
  // Articulated stone slabs and floating shoulder crystals.
  polygon(g, [-94, -106, -129, -72, -128, -18, -91, 1, -66, -54], 0x34304f, 0x60517a);
  polygon(g, [94, -106, 129, -72, 128, -18, 91, 1, 66, -54], 0x34304f, 0x60517a);
  polygon(g, [-128, -16, -143, 20, -128, 65, -98, 62, -86, 25, -91, -2], 0x27273f, 0x59506f);
  polygon(g, [128, -16, 143, 20, 128, 65, 98, 62, 86, 25, 91, -2], 0x27273f, 0x59506f);
  polygon(g, [-68, 48, -73, 110, -31, 120, -13, 64], 0x31304a, 0x62577b);
  polygon(g, [68, 48, 73, 110, 31, 120, 13, 64], 0x31304a, 0x62577b);
  polygon(g, [-75, 105, -80, 122, -22, 122, -21, 105], 0x48415f, 0x76678e);
  polygon(g, [75, 105, 80, 122, 22, 122, 21, 105], 0x48415f, 0x76678e);
  polygon(g, [-65, -102, 0, -125, 65, -102, 83, -30, 62, 48, 0, 77, -62, 48, -83, -30], 0x3e3659, 0x80638d);
  polygon(g, [-62, -95, -8, -113, -8, -7, -56, -24, -74, -53], 0x55436d);
  polygon(g, [62, -95, 8, -113, 8, -7, 56, -24, 74, -53], 0x2b2c48);
  polygon(g, [-58, -11, -8, 9, -8, 60, -49, 39], 0x292b44);
  polygon(g, [58, -11, 8, 9, 8, 60, 49, 39], 0x4d3a60);
  // Angular head with hooked obsidian horns.
  polygon(g, [-42, -126, -67, -165, -49, -154, -27, -140], 0x504066, 0x8b6497);
  polygon(g, [42, -126, 67, -165, 49, -154, 27, -140], 0x504066, 0x8b6497);
  polygon(g, [-44, -142, 0, -157, 44, -142, 48, -97, 25, -75, -25, -75, -48, -97], 0x4c3c63, 0x8b679c);
  polygon(g, [-36, -133, 0, -144, 35, -133, 28, -119, -30, -119], 0x674b7a);
  polygon(g, [-34, -116, -7, -111, -14, -103, -31, -106], COLORS.cyan);
  polygon(g, [34, -116, 7, -111, 14, -103, 31, -106], COLORS.cyan);
  polygon(g, [-13, -96, 0, -104, 13, -96, 0, -86], 0x1e233c);
  line(g, [-20, -84, 20, -84], 0xb090bb, 2, .6);
  // Fractures with a magical core.
  line(g, [-111, -69, -97, -47, -105, -24], COLORS.violet, 3, .85);
  line(g, [110, -69, 97, -47, 105, -24], COLORS.violet, 3, .85);
  line(g, [-62, -72, -45, -59, -51, -35], COLORS.cyan, 2, .6);
  line(g, [36, 17, 48, 30, 42, 50], COLORS.cyan, 2, .5);
  polygon(g, [0, -54, 24, -24, 0, 7, -24, -24], 0x172b3a, 0x7affee);
  polygon(g, [0, -46, 15, -24, 0, -3, -15, -24], COLORS.cyan);
  line(g, [-63, 82, -34, 77], COLORS.violet, 3, .65);
  line(g, [63, 82, 34, 77], COLORS.violet, 3, .65);
  boss.addChild(g);
  return boss;
}

function createSpecter() {
  const boss = new Container();
  const g = new Graphics();
  for (let i = 4; i > 0; i--) g.ellipse(0, -6, 45 + i * 17, 73 + i * 17).fill({ color: COLORS.violet, alpha: .035 });
  polygon(g, [-14, -164, -58, -113, -71, -37, -104, 47, -69, 26, -86, 94, -36, 70, -12, 119, 9, 76, 51, 107, 50, 53, 95, 70, 69, -5, 56, -101, 14, -164], 0x3a285c, 0x8061a5);
  polygon(g, [0, -153, -40, -112, -31, -38, -54, 49, -20, 28, 0, 76, 19, 27, 52, 51, 29, -39, 37, -112], 0x151b37);
  polygon(g, [-30, -105, 0, -124, 30, -105, 20, -55, 0, -40, -20, -55], 0x071c31);
  polygon(g, [-21, -90, -4, -84, -12, -76, -21, -79], COLORS.cyan);
  polygon(g, [21, -90, 4, -84, 12, -76, 21, -79], COLORS.cyan);
  polygon(g, [0, -71, 7, -56, 0, -49, -7, -56], 0x57baca);
  polygon(g, [-55, -48, -108, -20, -133, 19, -112, 10, -126, 36, -104, 24, -115, 48, -81, 24, -46, -7], 0x4b3470, 0x9170b4);
  polygon(g, [55, -48, 108, -20, 133, 19, 112, 10, 126, 36, 104, 24, 115, 48, 81, 24, 46, -7], 0x4b3470, 0x9170b4);
  line(g, [-45, -44, -35, -16, -40, 20, -28, 43], 0xb38aff, 2, .65);
  line(g, [45, -44, 35, -16, 40, 20, 28, 43], 0xb38aff, 2, .65);
  polygon(g, [0, -22, 22, 0, 0, 26, -22, 0], 0x13333d, COLORS.cyan);
  polygon(g, [0, -13, 12, 0, 0, 16, -12, 0], COLORS.cyan);
  for (let i = 0; i < 5; i++) {
    const x = -80 + i * 40;
    polygon(g, [x, -191 - (i % 2) * 14, x + 5, -178 - (i % 2) * 14, x, -165 - (i % 2) * 14, x - 5, -178 - (i % 2) * 14], 0xa17df0, undefined, .8);
  }
  boss.addChild(g);
  return boss;
}

function createDragon() {
  const boss = new Container();
  const g = new Graphics();
  g.ellipse(0, 114, 118, 19).fill({ color: 0x070711, alpha: .5 });
  // Sweeping wings have contrasting membrane panels and articulated bones.
  polygon(g, [-42, -85, -107, -150, -206, -139, -177, -90, -210, -52, -159, -45, -148, 5, -91, -29, -35, -4], 0x4b214c, 0xad567e);
  polygon(g, [42, -85, 107, -150, 206, -139, 177, -90, 210, -52, 159, -45, 148, 5, 91, -29, 35, -4], 0x4b214c, 0xad567e);
  polygon(g, [-104, -139, -182, -135, -157, -89, -62, -47], 0x742b5a);
  polygon(g, [104, -139, 182, -135, 157, -89, 62, -47], 0x742b5a);
  line(g, [-42, -72, -105, -145, -188, -137], 0xd17ca1, 4);
  line(g, [42, -72, 105, -145, 188, -137], 0xd17ca1, 4);
  line(g, [-104, -139, -150, -47, -148, -1], 0xc36c96, 2);
  line(g, [104, -139, 150, -47, 148, -1], 0xc36c96, 2);
  polygon(g, [20, 45, 83, 81, 136, 67, 166, 41, 155, 78, 117, 104, 51, 99, 3, 73], 0x57345e, 0x9c5f8b);
  polygon(g, [-49, 23, -70, 90, -97, 109, -72, 119, -22, 107, -10, 49], 0x563252, 0xa66886);
  polygon(g, [49, 23, 70, 90, 97, 109, 72, 119, 22, 107, 10, 49], 0x563252, 0xa66886);
  polygon(g, [-40, -83, 0, -102, 42, -83, 69, -21, 40, 70, 0, 92, -40, 70, -69, -21], 0x713b67, 0xb96992);
  polygon(g, [0, -67, 27, -30, 22, 48, 0, 70, -22, 48, -27, -30], 0xbc746f);
  for (let i = 0; i < 5; i++) line(g, [-18 - (i < 2 ? 4 : 0), -28 + i * 19, 18 + (i < 2 ? 4 : 0), -28 + i * 19], 0x5c3957, 2);
  polygon(g, [-34, -121, -49, -173, -25, -152, -10, -130], 0xf0c186, 0xbb886e);
  polygon(g, [34, -121, 49, -173, 25, -152, 10, -130], 0xf0c186, 0xbb886e);
  polygon(g, [-45, -136, 0, -149, 45, -136, 52, -100, 30, -69, -30, -69, -52, -100], 0x834a76, 0xd180a2);
  polygon(g, [-39, -120, -8, -111, -15, -101, -35, -106], COLORS.gold);
  polygon(g, [39, -120, 8, -111, 15, -101, 35, -106], COLORS.gold);
  polygon(g, [-23, -97, 23, -97, 30, -77, -30, -77], 0x9e617b);
  polygon(g, [-21, -79, -14, -68, -8, -79], 0xffedcb);
  polygon(g, [21, -79, 14, -68, 8, -79], 0xffedcb);
  for (const x of [-98, -82, -65, 65, 82, 98]) polygon(g, [x - 4, 109, x + 4, 109, x + 2, 120, x - 5, 123], 0xd8c8b0);
  boss.addChild(g);
  return boss;
}

function drawBoss(runtime: Runtime, kind: string) {
  runtime.boss.removeChildren().forEach((child) => child.destroy({ children: true }));
  const art = kind === 'dragon' ? createDragon() : kind === 'specter' ? createSpecter() : createGolem();
  runtime.boss.addChild(art);
  runtime.kind = kind;
}

function spawnBurst(runtime: Runtime, color: number, amount = 18, explosive = false) {
  const budget = Math.min(amount, Math.max(0, 140 - runtime.particles.length));
  for (let i = 0; i < budget; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = (explosive ? 3.8 : 1.8) + Math.random() * (explosive ? 6 : 4);
    const size = 2 + Math.random() * 4;
    const graphic = new Graphics();
    if (i % 3 === 0) polygon(graphic, [0, -size, size / 2, 0, 0, size, -size / 2, 0], color);
    else graphic.circle(0, 0, size / 2).fill(color);
    graphic.position.set(500 + (Math.random() - .5) * 65, 309 + (Math.random() - .5) * 55);
    runtime.effects.addChild(graphic);
    const life = 30 + Math.random() * 25;
    runtime.particles.push({ graphic, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 1, life, maxLife: life, rotation: (Math.random() - .5) * .2 });
  }
}
function floatLabel(runtime: Runtime, message: string, color: number, damage = false) {
  if (runtime.labels.length >= 10) {
    runtime.labels.shift()?.text.destroy();
  }
  const text = label(message, damage ? 38 : 19, color);
  text.anchor.set(.5);
  text.position.set(500 + (damage ? (Math.random() - .5) * 115 : 0), damage ? 238 : 190);
  runtime.effects.addChild(text);
  runtime.labels.push({ text, life: 70, maxLife: 70, vy: damage ? -1.45 : -.7 });
}

export default function BattleScene({ state, overlay = false }: { state: State; overlay?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const runtimeRef = useRef<Runtime | null>(null);
  stateRef.current = state;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let canceled = false;
    const app = new Application();
    const root = new Container();
    const backdrop = new Container();
    const aura = new Container();
    const ambient = new Container();
    const boss = new Container();
    const effects = new Container();
    const runtime: Runtime = { app, root, backdrop, boss, aura, ambient, effects, particles: [], labels: [], seen: new Set(), kind: '', level: 0, session: '', hp: stateRef.current.battle.boss.hp, hit: 0, time: 0, ready: false, width: 0, height: 0, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, observer: null };
    runtimeRef.current = runtime;
    const initialize = async () => {
      try {
        await app.init({ antialias: true, backgroundAlpha: overlay ? 0 : 1, background: overlay ? 0 : COLORS.ink, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', powerPreference: 'low-power' });
        if (canceled) { app.destroy(true, { children: true }); return; }
        host.appendChild(app.canvas);
        app.canvas.setAttribute('aria-hidden', 'true');
        app.canvas.style.display = 'block';
        root.addChild(backdrop, aura, ambient, boss, effects);
        app.stage.addChild(root);
        const resize = () => {
          if (canceled) return;
          const rect = host.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width));
          const height = Math.max(1, Math.round(rect.height));
          if (width === runtime.width && height === runtime.height) return;
          runtime.width = width; runtime.height = height;
          app.renderer.resize(width, height);
          const portraitBoost = width / height < .85 ? 2.5 : 1;
          const scale = Math.min(width / W * portraitBoost, height / H);
          root.scale.set(scale);
          root.position.set((width - W * scale) / 2, (height - H * scale) / 2);
        };
        runtime.observer = new ResizeObserver(resize);
        runtime.observer.observe(host);
        resize();
        const auraGraphics = new Graphics();
        for (let i = 3; i > 0; i--) auraGraphics.ellipse(0, 0, 55 + i * 21, 65 + i * 31).fill({ color: COLORS.cyan, alpha: .02 });
        aura.addChild(auraGraphics); aura.position.set(500, 305);
        // Ambient sparks are separate from action particles and have a strict cap.
        for (let i = 0; i < 18; i++) {
          const spark = new Graphics().circle(0, 0, i % 4 === 0 ? 1.8 : 1).fill({ color: i % 2 ? COLORS.cyan : COLORS.violet, alpha: .4 });
          spark.position.set(200 + ((i * 79.3) % 600), 170 + ((i * 37.9) % 290));
          ambient.addChild(spark);
        }
        const initial = stateRef.current;
        runtime.seen = new Set(initial.events.map((event) => event.id));
        runtime.session = initial.session.id;
        runtime.level = initial.battle.level;
        drawBackdrop(runtime, initial.battle.level, overlay);
        drawBoss(runtime, initial.battle.boss.kind);
        runtime.ready = true;
        app.ticker.maxFPS = 60;
        app.ticker.add((ticker) => {
          const current = stateRef.current;
          const dt = Math.min(ticker.deltaTime, 3);
          const animated = current.settings.animations && !runtime.reduced;
          const active = current.battle.status === 'running';
          runtime.time += dt * .024;
          if (runtime.session !== current.session.id) {
            runtime.session = current.session.id;
            runtime.seen = new Set(current.events.map((event) => event.id));
            runtime.hp = current.battle.boss.hp;
            runtime.particles.forEach((particle) => particle.graphic.destroy()); runtime.particles = [];
            runtime.labels.forEach((item) => item.text.destroy()); runtime.labels = [];
          }
          if (runtime.level !== current.battle.level) {
            runtime.level = current.battle.level;
            runtime.hp = current.battle.boss.hp;
            drawBackdrop(runtime, runtime.level, overlay);
            if (animated) { spawnBurst(runtime, COLORS.violet, 45, true); floatLabel(runtime, `FASE ${runtime.level}`, COLORS.cyan); }
          }
          if (runtime.kind !== current.battle.boss.kind) drawBoss(runtime, current.battle.boss.kind);
          const hpLost = runtime.hp - current.battle.boss.hp;
          if (hpLost > 0 && animated) {
            runtime.hit = 1;
            floatLabel(runtime, `−${Math.round(hpLost).toLocaleString('pt-BR')}`, hpLost >= 250 ? COLORS.gold : 0xffffff, true);
          }
          runtime.hp = current.battle.boss.hp;
          const newEvents = current.events.filter((event) => !runtime.seen.has(event.id));
          for (const event of newEvents) {
            runtime.seen.add(event.id);
            if (!animated) continue;
            if (event.type === 'attack' && event.animation !== 'none') {
              const color = event.animation === 'critical' ? COLORS.pink : event.animation === 'legendary' ? COLORS.gold : event.animation === 'burst' ? COLORS.violet : COLORS.cyan;
              spawnBurst(runtime, color, event.animation === 'legendary' ? 60 : event.animation === 'burst' ? 32 : 15, ['legendary', 'critical', 'burst'].includes(event.animation || ''));
              if (event.animation === 'legendary') {
                const ring = new Graphics().ellipse(0, 0, 110, 70).stroke({color: COLORS.gold, width: 5, alpha: .8});
                ring.position.set(500, 315); runtime.effects.addChild(ring);
                runtime.particles.push({graphic:ring,vx:0,vy:-.5,life:35,maxLife:35,rotation:.02});
                floatLabel(runtime, 'ATAQUE LENDÁRIO!', COLORS.gold);
              }
              if (event.animation === 'critical') floatLabel(runtime, 'CRÍTICO!', COLORS.pink);
            }
            if (event.type === 'heal') { spawnBurst(runtime, COLORS.cyan, 25); floatLabel(runtime, `+${event.amount} VIDA`, COLORS.cyan); }
            if (event.type === 'power') { spawnBurst(runtime, COLORS.violet, 35, true); floatLabel(runtime, 'PODER COLETIVO ×2', COLORS.violet); }
            if (event.type === 'goal') { spawnBurst(runtime, COLORS.gold, 35, true); floatLabel(runtime, 'META ALCANÇADA!', COLORS.gold); }
            if (event.type === 'victory') { spawnBurst(runtime, COLORS.cyan, 60, true); floatLabel(runtime, 'CHEFE DERROTADO!', COLORS.gold); }
            if (event.type === 'defeat') floatLabel(runtime, 'EQUIPE DERROTADA', COLORS.pink);
          }
          if (runtime.seen.size > 800) runtime.seen = new Set(current.events.map((event) => event.id));
          const wave = animated ? Math.sin(runtime.time * (active ? 1.6 : .7)) : 0;
          const hit = animated ? runtime.hit : 0;
          boss.position.set(500 + Math.sin(runtime.time * 35) * hit * 9, 350 + wave * (current.battle.boss.kind === 'specter' ? 13 : 4));
          boss.rotation = animated ? Math.sin(runtime.time * .8) * .012 : 0;
          boss.alpha = current.battle.status === 'victory' ? .35 + Math.abs(Math.sin(runtime.time * 5)) * .4 : 1;
          boss.scale.set(1 + Math.sin(runtime.time * 1.2) * (animated ? .012 : 0));
          runtime.hit = Math.max(0, runtime.hit - dt * .065);
          aura.alpha = animated ? .5 + Math.sin(runtime.time * 2) * .25 : .5;
          aura.scale.set(1 + (animated ? Math.sin(runtime.time) * .06 : 0));
          ambient.visible = animated;
          if (animated) ambient.children.forEach((spark, index) => {
            spark.y -= dt * (.18 + index % 3 * .08);
            spark.x += Math.sin(runtime.time + index) * .12;
            spark.alpha = .25 + Math.abs(Math.sin(runtime.time + index)) * .55;
            if (spark.y < 130) spark.y = 460;
          });
          for (let i = runtime.particles.length - 1; i >= 0; i--) {
            const p = runtime.particles[i];
            p.life -= dt;
            if (p.life <= 0 || !animated) { p.graphic.destroy(); runtime.particles.splice(i, 1); continue; }
            p.graphic.x += p.vx * dt; p.graphic.y += p.vy * dt; p.vy += .08 * dt;
            p.graphic.rotation += p.rotation * dt; p.graphic.alpha = p.life / p.maxLife;
          }
          for (let i = runtime.labels.length - 1; i >= 0; i--) {
            const item = runtime.labels[i]; item.life -= dt;
            if (item.life <= 0 || !animated) { item.text.destroy(); runtime.labels.splice(i, 1); continue; }
            item.text.y += item.vy * dt;
            item.text.alpha = Math.min(1, item.life / 20);
            const pop = 1 + Math.max(0, (item.life - 55) / 15) * .23;
            item.text.scale.set(pop);
          }
        });
      } catch (error) {
        if (!canceled) {
          console.error('Não foi possível iniciar o renderizador PixiJS.', error);
          host.dataset.renderError = 'true';
          host.setAttribute('aria-label', 'O renderizador não pôde iniciar. Os controles e dados da batalha continuam disponíveis.');
        }
      }
    };
    void initialize();
    return () => {
      canceled = true;
      runtime.observer?.disconnect();
      if (runtime.ready) app.destroy(true, { children: true });
      runtimeRef.current = null;
    };
  }, [overlay]);

  return <div className="battle-scene" ref={hostRef} role="img" aria-label={`Cenário da batalha: ${state.battle.boss.name}, fase ${state.battle.level}. Vida ${Math.max(0, Math.ceil(state.battle.boss.hp))} de ${state.battle.boss.max_hp}.`} />;
}
