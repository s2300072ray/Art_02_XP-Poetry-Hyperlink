
import React, { useEffect, useRef, useState } from 'react';
import { BackgroundType, PoetryNode } from '../types';

interface Props {
  bgType: BackgroundType;
  nodes: PoetryNode[];
}

const PoetryCanvas: React.FC<Props> = ({ bgType, nodes }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<any>(null);
  const [isP5Ready, setIsP5Ready] = useState(false);

  useEffect(() => {
    // 檢查 p5 是否已載入
    const checkP5 = setInterval(() => {
      if ((window as any).p5) {
        setIsP5Ready(true);
        clearInterval(checkP5);
      }
    }, 100);
    return () => clearInterval(checkP5);
  }, []);

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.setBgType(bgType);
      p5Instance.current.updateNodes(nodes);
    }
  }, [bgType, nodes]);

  useEffect(() => {
    if (!isP5Ready || !containerRef.current) return;
    if (p5Instance.current) return; 

    const p5 = (window as any).p5;

    const sketch = (p: any) => {
      let interactionForce = 0;
      let clickPulse = 0;
      
      p.activeBgType = bgType; 
      p.currentNodes = nodes;

      p.updateNodes = (newNodes: PoetryNode[]) => {
        p.currentNodes = newNodes;
      };

      p.setBgType = (type: BackgroundType) => {
        if (p.activeBgType !== type) {
          p.activeBgType = type;
          p.initEntities();
        }
      };

      const entities = {
        clouds: [] as any[],
        hillGrid: [] as any[],
        blissParticles: [] as any[],
        bgGradientGfx: null as any,
        noiseGfx: null as any,
        isNoiseFrozen: false,
        noiseFreezeTimer: 0,
        waveShockwaveRadius: 0,
        sharpSparkles: [] as any[],
        sharpExplosion: 0,
        circles: [] as any[],
        cylinderRotation: 0,
        tunnelVelocity: 0,
        dots: [] as any[],
        asciiParticles: [] as any[],
        figures: [] as any[],
        glitchFilterTimer: 0,
        meshPoints: [] as any[]
      };

      const vividColors: number[][] = [[255, 0, 127], [0, 255, 255], [255, 255, 0], [127, 0, 255], [255, 127, 0], [0, 255, 127]];
      const HILL_COLS = 40; 
      const HILL_ROWS = 25;

      p.setup = () => {
        const cnv = p.createCanvas(window.innerWidth, window.innerHeight);
        cnv.style('display', 'block');
        p.pixelDensity(1);
        entities.noiseGfx = p.createGraphics(200, 200);
        p.initEntities();
      };

      p.initEntities = () => {
        const w = Math.max(1, p.width);
        const h = Math.max(1, p.height);
        const type = p.activeBgType;

        entities.clouds = []; entities.hillGrid = []; entities.blissParticles = [];
        entities.circles = []; entities.dots = []; entities.asciiParticles = [];
        entities.figures = []; entities.meshPoints = []; entities.sharpSparkles = [];
        entities.isNoiseFrozen = false; entities.tunnelVelocity = 0;
        
        if (type !== BackgroundType.BlissDream) entities.bgGradientGfx = null; 

        switch (type) {
          case BackgroundType.BlissDream: initBlissDream(w, h); break;
          case BackgroundType.Circles: initCircles(w, h); break;
          case BackgroundType.DotGrid: initDotGrid(w, h); break;
          case BackgroundType.ShadowFigures: initShadowFigures(w, h); break;
          case BackgroundType.DelaunayMesh: initDelaunayMesh(w, h); break;
        }
      };

      p.mousePressed = () => {
        clickPulse = 1.0; 
        const mx = p.mouseX, my = p.mouseY;

        switch (p.activeBgType) {
          case BackgroundType.BlissDream:
             for(let i=0; i<12; i++) {
               entities.blissParticles.push({
                 x: mx + p.random(-20, 20), y: my + p.random(-20, 20),
                 size: p.random(8, 20), vy: p.random(-3, -8), vx: p.random(-2, 2),
                 color: p.lerpColor(p.color(30, 90, 230), p.color(255), p.random()), life: 1.0
               });
             }
             break;
          case BackgroundType.Noise:
             entities.isNoiseFrozen = true; entities.noiseFreezeTimer = 120;
             break;
          case BackgroundType.WavesColor:
             entities.waveShockwaveRadius = 1; 
             break;
          case BackgroundType.WavesSharp:
             entities.sharpExplosion = 1.0;
             break;
          case BackgroundType.Circles:
             entities.tunnelVelocity = 30;
             break;
          case BackgroundType.DotGrid:
             for (let i = entities.dots.length - 1; i >= 0; i--) {
               const d = entities.dots[i];
               if (p.dist(mx, my, d.x, d.y) < 180) {
                  entities.asciiParticles.push({
                    x: d.x, y: d.y, vx: (d.x - mx) * 0.15, vy: (d.y - my) * 0.15,
                    char: String.fromCharCode(65 + p.floor(p.random(26))), color: d.color, life: 1.0
                  });
                  entities.dots.splice(i, 1);
                  entities.dots.push({ x: p.random(p.width), y: p.random(p.height), vx: 0, vy: 0, color: d.color, noiseOffset: p.random(1000) });
               }
             }
             break;
          case BackgroundType.ShadowFigures:
             entities.glitchFilterTimer = 10;
             break;
          case BackgroundType.DelaunayMesh:
             entities.meshPoints.push({ baseX: mx, baseY: my, x: mx, y: my, vx: 0, vy: 0, isNew: true });
             break;
        }
      };

      p.draw = () => {
        interactionForce = p.mouseIsPressed ? p.lerp(interactionForce, 1, 0.1) : p.lerp(interactionForce, 0, 0.05);
        clickPulse = p.lerp(clickPulse, 0, 0.1);

        p.push();
        switch (p.activeBgType) {
          case BackgroundType.BlissDream: drawBlissDream(); break;
          case BackgroundType.Noise: drawNoise(); break;
          case BackgroundType.WavesColor: drawWavesColor(); break;
          case BackgroundType.WavesSharp: drawWavesSharp(); break;
          case BackgroundType.Circles: drawCircles(); break;
          case BackgroundType.DotGrid: drawDotGrid(); break;
          case BackgroundType.ShadowFigures: drawShadowFigures(); break;
          case BackgroundType.DelaunayMesh: drawDelaunayMesh(); break;
          default: drawBlissDream(); break;
        }
        p.pop();
      };
      
      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        p.initEntities();
      };

      // --- Entity Helpers ---
      function initBlissDream(w: number, h: number) {
        if (!entities.bgGradientGfx) {
           entities.bgGradientGfx = p.createGraphics(w, h);
           entities.bgGradientGfx.noFill();
           for (let i = 0; i < h; i += 5) {
             const inter = p.map(i, 0, h, 0, 1);
             const c = p.lerpColor(p.color(30, 90, 230), p.color(160, 220, 255), inter);
             entities.bgGradientGfx.stroke(c);
             entities.bgGradientGfx.rect(0, i, w, 5);
           }
        }
        entities.clouds = Array.from({ length: 12 }, () => ({
           x: p.random(w), y: p.random(h * 0.05, h * 0.4), speed: p.random(0.2, 0.6), trail: [],
           blobs: Array.from({ length: 5 }, () => ({ ox: p.random(-80, 80), oy: p.random(-30, 30), size: p.random(80, 150), seed: p.random(1000) }))
        }));
        for (let r = 0; r < HILL_ROWS; r++) {
           let row = [];
           for (let c = 0; c < HILL_COLS; c++) row.push({ baseX: (w / (HILL_COLS - 1)) * c, baseY: h * 0.55 + (r * 30), x: 0, y: 0 });
           entities.hillGrid.push(row);
        }
      }

      function initCircles(w: number, h: number) {
        entities.circles = Array.from({ length: 85 }, () => ({
           x: p.random(-w, w), y: p.random(-h, h), z: p.random(100, 900),
           baseR: p.random(10, 80), color: vividColors[p.floor(p.random(vividColors.length))]
        }));
      }

      function initDotGrid(w: number, h: number) {
        entities.dots = Array.from({ length: 600 }, () => ({
          x: p.random(w), y: p.random(h), vx: p.random(-1, 1), vy: p.random(-1, 1),
          noiseOffset: p.random(1000), color: vividColors[p.floor(p.random(vividColors.length))]
        }));
      }

      function initShadowFigures(w: number, h: number) {
        entities.figures = Array.from({ length: 12 }, () => ({
          x: p.random(w), y: p.random(h * 0.2, h * 0.9), w: p.random(80, 160), h: p.random(200, 450),
          opacity: p.random(30, 80), noiseOffset: p.random(1000), trail: []
        }));
      }

      function initDelaunayMesh(w: number, h: number) {
        const rows = 15, cols = 20;
        for(let r=0; r<rows; r++) {
          for(let c=0; c<cols; c++) {
            entities.meshPoints.push({ baseX: (w/(cols-1))*c, baseY: (h/(rows-1))*r, x: (w/(cols-1))*c, y: (h/(rows-1))*r, vx: 0, vy: 0 });
          }
        }
      }

      // --- Drawing Functions ---
      function drawBlissDream() {
        p.background(50, 120, 230);
        if (entities.bgGradientGfx) p.image(entities.bgGradientGfx, 0, 0);
        p.push(); p.drawingContext.filter = 'blur(30px)';
        entities.clouds.forEach((c: any) => {
          c.x += c.speed; if (c.x > p.width + 300) c.x = -300;
          p.push(); p.translate(c.x, c.y); p.fill(255, 200); p.noStroke();
          c.blobs.forEach((b: any) => { const sz = b.size; p.ellipse(b.ox, b.oy, sz, sz * 0.6); });
          p.pop();
        });
        p.pop();
        entities.clouds.forEach((c: any) => {
            if (p.frameCount % 5 === 0) { c.trail.unshift({x: c.x, y: c.y}); if (c.trail.length > 5) c.trail.pop(); }
            c.trail.forEach((t: any, i: number) => { p.fill(255, 50 - i * 10); p.noStroke(); p.rect(t.x, t.y, 100, 40); });
        });
        p.push(); p.noStroke();
        for (let r = 0; r < HILL_ROWS - 1; r++) {
          p.beginShape(p.TRIANGLE_STRIP);
          for (let c = 0; c < HILL_COLS; c++) {
            const pt = entities.hillGrid[r][c];
            const dist = p.dist(p.mouseX, p.mouseY, pt.baseX, pt.baseY);
            let stretchX = 0, stretchY = 0;
            if (p.mouseIsPressed && dist < 300) { stretchX = (p.mouseX - pt.baseX) * 0.3; stretchY = (p.mouseY - pt.baseY) * 0.3; }
            pt.x = p.lerp(pt.x, pt.baseX + stretchX, 0.1);
            pt.y = p.lerp(pt.y, pt.baseY - p.noise(r, c, p.frameCount*0.01)*100 + stretchY, 0.1);
            const nextPt = entities.hillGrid[r+1][c];
            const nextYTarget = nextPt.baseY - p.noise(r+1, c, p.frameCount*0.01)*100;
            const nextX = nextPt.baseX + (p.mouseIsPressed && p.dist(p.mouseX, p.mouseY, nextPt.baseX, nextPt.baseY)<300 ? (p.mouseX-nextPt.baseX)*0.3 : 0);
            const brightness = p.map(pt.y, 0, p.height, 1, 0.4);
            p.fill(p.lerpColor(p.color(100, 200, 100), p.color(30, 100, 50), 1-brightness));
            p.vertex(pt.x, pt.y); p.vertex(nextX, nextYTarget);
          }
          p.endShape();
        }
        p.pop();
        for (let i = entities.blissParticles.length - 1; i >= 0; i--) {
           const part = entities.blissParticles[i];
           part.x += part.vx; part.y += part.vy; part.life -= 0.02;
           p.fill(part.color, part.life * 255); p.rect(part.x, part.y, part.size, part.size);
           if (part.life <= 0) entities.blissParticles.splice(i, 1);
        }
      }

      function drawNoise() {
        p.background(10);
        if (entities.isNoiseFrozen) { entities.noiseFreezeTimer--; if (entities.noiseFreezeTimer <= 0) entities.isNoiseFrozen = false; }
        if (entities.noiseGfx && entities.noiseGfx.width > 0) {
          if (!entities.isNoiseFrozen) {
            entities.noiseGfx.loadPixels();
            const d = entities.noiseGfx.pixelDensity();
            const count = 4 * (entities.noiseGfx.width * d) * (entities.noiseGfx.height * d);
            const gfxMouseX = p.map(p.mouseX, 0, p.width, 0, entities.noiseGfx.width);
            const gfxMouseY = p.map(p.mouseY, 0, p.height, 0, entities.noiseGfx.height);
            for (let i = 0; i < count; i += 4) {
              const r = p.random(255), g = p.random(255), b = p.random(255);
              const px = (i / 4) % (entities.noiseGfx.width * d), py = p.floor((i / 4) / (entities.noiseGfx.width * d));
              let alpha = 255; if (p.mouseIsPressed && p.dist(px, py, gfxMouseX * d, gfxMouseY * d) < 30 * d) alpha = 20;
              entities.noiseGfx.pixels[i] = r; entities.noiseGfx.pixels[i+1] = g; entities.noiseGfx.pixels[i+2] = b; entities.noiseGfx.pixels[i+3] = alpha;
            }
            entities.noiseGfx.updatePixels();
          } else {
             p.stroke(255, 50); p.strokeWeight(2);
             for(let x=0; x<p.width; x+=10) if (p.random() > 0.5) p.line(x, 0, x, p.height);
          }
          p.image(entities.noiseGfx, 0, 0, p.width, p.height);
        }
      }

      function drawWavesColor() {
        p.background(5, 5, 15); p.blendMode(p.SCREEN);
        if (entities.waveShockwaveRadius > 0 && entities.waveShockwaveRadius < p.width * 1.5) entities.waveShockwaveRadius += 20; else entities.waveShockwaveRadius = 0;
        const sy = 15;
        for (let y = 0; y < p.height + 100; y += sy) {
          const idx = p.floor((y / sy + p.frameCount / 50) % vividColors.length);
          const c = vividColors[idx];
          p.stroke(c[0], c[1], c[2], 200); p.strokeWeight(1.5); p.noFill(); p.beginShape();
          for (let x = -50; x < p.width + 50; x += 10) {
             let py = y + p.sin(x * 0.01 + p.frameCount * 0.03) * 50;
             const d = p.dist(x, py, p.mouseX, p.mouseY);
             if (p.mouseIsPressed && d < 300) { const pull = (1 - d/300) * 150; if (p.mouseY < py) py -= pull; else py += pull; }
             if (entities.waveShockwaveRadius > 0) {
                const distToCenter = p.dist(x, py, p.mouseX, p.mouseY);
                if (Math.abs(distToCenter - entities.waveShockwaveRadius) < 50) py += p.sin(distToCenter * 0.1) * 60;
             }
             p.curveVertex(x, py);
          }
          p.endShape();
        }
        p.blendMode(p.BLEND);
      }

      function drawWavesSharp() {
        const bgColor = p.lerpColor(p.color(10, 15, 30), p.color(40, 0, 40), p.map(p.mouseX, 0, p.width, 0, 1));
        p.background(bgColor); p.stroke(50, 255, 50, 200); p.noFill();
        if (entities.sharpExplosion > 0) entities.sharpExplosion -= 0.05;
        for (let y = 0; y < p.height; y += 25) {
          p.beginShape(); let cutting = false;
          for (let x = 0; x < p.width; x += 5) {
            let py = y + p.noise(x * 0.02, y, p.frameCount * 0.1) * 80;
            if (entities.sharpExplosion > 0) { const d = p.dist(x, py, p.mouseX, p.mouseY); if (d < 400 * entities.sharpExplosion) { py += p.random(-100, 100) * entities.sharpExplosion; x += p.random(-20, 20) * entities.sharpExplosion; } }
            const mouseDist = p.dist(x, py, p.mouseX, p.mouseY);
            if (p.mouseIsPressed && mouseDist < 30) {
               if (!cutting) { p.endShape(); cutting = true; }
               if (p.random() > 0.8) entities.sharpSparkles.push({x, y: py, vx: p.random(-2,2), vy: p.random(-2,2), life: 1});
               continue; 
            }
            if (cutting && mouseDist >= 30) { p.beginShape(); cutting = false; }
            if (!cutting) p.vertex(x, py);
          }
          p.endShape();
        }
        for (let i = entities.sharpSparkles.length - 1; i >= 0; i--) {
          const s = entities.sharpSparkles[i]; s.x += s.vx; s.y += s.vy; s.life -= 0.1;
          p.stroke(255, s.life * 255); p.point(s.x, s.y); if (s.life <= 0) entities.sharpSparkles.splice(i, 1);
        }
      }

      function drawCircles() {
        p.background(10, 10, 25); if (entities.tunnelVelocity > 0) entities.tunnelVelocity *= 0.95;
        const baseSpeed = 5 + entities.tunnelVelocity;
        if (p.mouseIsPressed) entities.cylinderRotation += (p.mouseX - p.width/2) * 0.0001;
        p.push(); p.translate(p.width/2, p.height/2);
        entities.circles.forEach((c: any) => {
          c.z -= baseSpeed; if (c.z < 10) c.z = 900;
          const rx = c.x * p.cos(entities.cylinderRotation) - c.z * p.sin(entities.cylinderRotation);
          const rz = c.x * p.sin(entities.cylinderRotation) + c.z * p.cos(entities.cylinderRotation);
          const scale = 300 / (rz + 500); const sx = rx * scale, sy = c.y * scale, sr = c.baseR * scale;
          p.stroke(c.color[0], c.color[1], c.color[2], p.map(rz, 0, 900, 255, 50)); p.strokeWeight(2 * scale); p.noFill();
          if (entities.tunnelVelocity > 5) for(let k=0; k<3; k++) p.ellipse(sx * (1+k*0.1), sy * (1+k*0.1), sr, sr); else p.ellipse(sx, sy, sr, sr);
          if (p.random() > 0.95) { p.stroke(255, 50); p.line(sx - sr, sy, sx + sr, sy); }
        });
        p.pop();
      }

      function drawDotGrid() {
        p.background(5);
        entities.dots.forEach((d: any) => {
           if (p.mouseIsPressed && p.dist(p.mouseX, p.mouseY, d.x, d.y) < 200) { d.x = p.lerp(d.x, p.mouseX + p.random(-20,20), 0.1); d.y = p.lerp(d.y, p.mouseY + p.random(-20,20), 0.1); }
           const nX = p.map(p.noise(d.x * 0.005, p.frameCount * 0.005), 0, 1, -1, 1), nY = p.map(p.noise(d.y * 0.005, p.frameCount * 0.005 + 1000), 0, 1, -1, 1);
           d.x += nX; d.y += nY;
           if (d.x < 0) d.x = p.width; else if (d.x > p.width) d.x = 0;
           if (d.y < 0) d.y = p.height; else if (d.y > p.height) d.y = 0;
           p.stroke(d.color[0], d.color[1], d.color[2]); p.strokeWeight(2); p.point(d.x, d.y);
           if (p.random() > 0.995) { p.strokeWeight(1); p.stroke(255, 50); p.line(d.x, d.y, d.x + p.random(-50, 50), d.y + p.random(-50, 50)); }
        });
        entities.asciiParticles.forEach((ap: any, i: number) => {
           ap.x += ap.vx; ap.y += ap.vy; ap.life -= 0.02;
           p.fill(ap.color[0], ap.color[1], ap.color[2], ap.life * 255); p.textSize(14); p.text(ap.char, ap.x, ap.y);
           if (ap.life <= 0) entities.asciiParticles.splice(i, 1);
        });
      }

      function drawShadowFigures() {
        if (entities.glitchFilterTimer > 0) { p.background(50, 0, 0); entities.glitchFilterTimer--; } else p.background(235, 235, 225);
        p.push(); p.drawingContext.filter = 'blur(15px)';
        entities.figures.forEach((f: any) => {
           const time = p.frameCount * 0.02; const oscillation = p.sin(time + f.noiseOffset) * 5, nX = p.map(p.noise(f.noiseOffset, time), 0, 1, -3, 3), nY = p.map(p.noise(f.noiseOffset + 1000, time), 0, 1, -1.5, 1.5);
           f.x += oscillation + nX; f.y += nY;
           if (p.currentNodes) p.currentNodes.forEach((node: PoetryNode) => {
                 const nodeCx = node.x + node.width / 2, nodeCy = node.y + node.height / 2, dist = p.dist(f.x, f.y, nodeCx, nodeCy);
                 if (dist < Math.max(node.width, node.height) * 0.8) { const angle = p.atan2(f.y - nodeCy, f.x - nodeCx); f.x += p.cos(angle) * 8; f.y += p.sin(angle) * 8; }
           });
           if (f.x < -150) f.x = p.width + 150; else if (f.x > p.width + 150) f.x = -150;
           if (f.y < -150) f.y = p.height + 150; else if (f.y > p.height + 150) f.y = -150;
           if (p.mouseIsPressed) { f.x = p.lerp(f.x, p.mouseX + p.random(-150, 150), 0.05); f.y = p.lerp(f.y, p.mouseY + p.random(-100, 100), 0.05); }
           if (p.frameCount % 4 === 0) { f.trail.unshift({x: f.x, y: f.y}); if (f.trail.length > 10) f.trail.pop(); }
           p.noStroke(); f.trail.forEach((t: any, i: number) => { p.fill(20, 20, 20, (f.opacity - i*5) * 0.3); const scale = 1.0 - i * 0.05; p.rect(t.x - f.w*scale/2, t.y - f.h*scale/2, f.w*scale, f.h*scale, 10); });
           p.fill(20, 20, 20, f.opacity); p.rect(f.x - f.w/2 + (entities.glitchFilterTimer > 0 ? p.random(-20, 20) : 0), f.y - f.h/2 + p.sin(p.frameCount * 0.05) * 10, f.w, f.h, 10);
        });
        p.pop();
        p.loadPixels(); for(let i=0; i<2000; i++) p.set(p.floor(p.random(p.width)), p.floor(p.random(p.height)), p.color(0, 20)); p.updatePixels();
      }

      function drawDelaunayMesh() {
        p.background(8, 12, 25);
        entities.meshPoints.forEach((pt: any) => {
           const nx = pt.baseX + p.noise(pt.baseX, p.frameCount * 0.005) * 100 - 50, ny = pt.baseY + p.noise(pt.baseY, p.frameCount * 0.005) * 100 - 50;
           if (p.mouseIsPressed && p.dist(p.mouseX, p.mouseY, nx, ny) < 150) { pt.x = p.lerp(pt.x, p.mouseX, 0.2); pt.y = p.lerp(pt.y, p.mouseY, 0.2); } else { pt.x = p.lerp(pt.x, nx, 0.1); pt.y = p.lerp(pt.y, ny, 0.1); }
           if (pt.isNew) { p.stroke(255, 100, 100); p.strokeWeight(6); p.point(pt.x, pt.y); }
        });
        p.strokeWeight(1.5); 
        for(let i=0; i < entities.meshPoints.length; i++) {
           const p1 = entities.meshPoints[i];
           for(let j=i+1; j < entities.meshPoints.length; j++) {
              const p2 = entities.meshPoints[j];
              if (Math.abs(p1.x - p2.x) > 100 || Math.abs(p1.y - p2.y) > 100) continue;
              const dist = p.dist(p1.x, p1.y, p2.x, p2.y);
              if (dist < 90) { const stretch = dist / 90; p.stroke(100 + stretch*155, 180 - stretch*100, 255 - stretch*100, 100 * (1-stretch)); p.line(p1.x, p1.y, p2.x, p2.y); } else if (dist < 100 && p.random() > 0.98) { p.stroke(255); p.point((p1.x+p2.x)/2, (p1.y+p2.y)/2); }
           }
        }
      }
    };

    p5Instance.current = new p5(sketch, containerRef.current);
    return () => { if (p5Instance.current) { p5Instance.current.remove(); p5Instance.current = null; } };
  }, [isP5Ready]);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
};

export default PoetryCanvas;
