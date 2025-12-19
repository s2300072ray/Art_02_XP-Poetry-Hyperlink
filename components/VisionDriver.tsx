
import React, { useEffect, useRef, useState } from 'react';
import { PoetryNode, VirtualCursor } from '../types';

interface Props {
  nodes: PoetryNode[];
  onCursorUpdate: (cursor: VirtualCursor) => void;
  onNodeFocus: (id: string) => void;
  onSpawn: (word: string, node: PoetryNode) => void;
  onToggleBg: () => void;
  onClose: () => void;
}

const VisionDriver: React.FC<Props> = ({ nodes, onCursorUpdate, onNodeFocus, onSpawn, onToggleBg, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef(nodes);
  
  const cursorRef = useRef<VirtualCursor>({ 
    x: window.innerWidth / 2, 
    y: window.innerHeight / 2, 
    isDown: false, 
    targetId: null, 
    progress: 0 
  });
  
  const lastPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const stillCountRef = useRef(0);
  const [cameraStatus, setCameraStatus] = useState<'IDLE' | 'ACTIVE' | 'ERROR' | 'NOT_FOUND'>('IDLE');

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const setupCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('ERROR');
      return;
    }

    setCameraStatus('IDLE');
    try {
      // First, try to list devices to see if any videoinput exists
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      
      if (!hasVideo) {
        setCameraStatus('NOT_FOUND');
        return;
      }

      // Use a set of constraints that are more likely to succeed
      const constraints = {
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user"
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        setCameraStatus('ACTIVE');
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      const name = err.name || '';
      const msg = err.message || '';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.toLowerCase().includes('not found')) {
        setCameraStatus('NOT_FOUND');
      } else {
        setCameraStatus('ERROR');
      }
    }
  };

  useEffect(() => {
    setupCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let animationId: number;
    let frameSkip = 0;
    
    const triggerVirtualClick = () => {
      const { x, y } = cursorRef.current;
      const hitNodes = [...nodesRef.current].sort((a, b) => b.zIndex - a.zIndex);
      const target = hitNodes.find(n => 
        x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height
      );

      if (target) {
        onNodeFocus(target.id);
        if (y <= target.y + 32) {
          cursorRef.current.isDown = true;
          cursorRef.current.targetId = target.id;
        } else {
          const words = target.fullText.split(/[\s,，。？?！!]+/).filter(w => w.length > 0);
          const word = words[Math.floor(Math.random() * words.length)];
          if (word) onSpawn(word, target);
        }
      } else {
        onToggleBg();
      }
    };

    const process = () => {
      // Performance optimization: Analyze every 2nd frame
      frameSkip++;
      if (frameSkip % 2 !== 0) {
        animationId = requestAnimationFrame(process);
        return;
      }

      if (videoRef.current && canvasRef.current && cameraStatus === 'ACTIVE' && videoRef.current.readyState === 4) {
        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Process a mirrored smaller frame
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -320, 0, 320, 240);
        ctx.restore();

        const frame = ctx.getImageData(0, 0, 320, 240);
        const data = frame.data;
        let brightestX = 0;
        let brightestY = 0;
        let maxVal = 0;

        // Sparse sampling for performance (every 80th index = every 20th pixel)
        // This dramatically reduces loop iterations while keeping enough precision for light tracking.
        for (let i = 0; i < data.length; i += 80) {
          const brightness = data[i] + data[i+1] + data[i+2];
          if (brightness > maxVal) {
            maxVal = brightness;
            const pxIdx = i / 4;
            brightestX = pxIdx % 320;
            brightestY = Math.floor(pxIdx / 320);
          }
        }

        if (maxVal > 150) { 
          const targetX = (brightestX / 320) * window.innerWidth;
          const targetY = (brightestY / 240) * window.innerHeight;

          // Smooth cursor movement
          cursorRef.current.x += (targetX - cursorRef.current.x) * 0.25;
          cursorRef.current.y += (targetY - cursorRef.current.y) * 0.25;

          const dx = cursorRef.current.x - lastPosRef.current.x;
          const dy = cursorRef.current.y - lastPosRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 20) {
            stillCountRef.current++;
          } else {
            stillCountRef.current = 0;
            if (!cursorRef.current.isDown) cursorRef.current.progress = 0;
          }

          // Progress click logic
          if (stillCountRef.current > 30 && !cursorRef.current.isDown) {
            triggerVirtualClick();
            stillCountRef.current = 0;
          } else if (cursorRef.current.isDown) {
            if (dist > 150) { 
               cursorRef.current.isDown = false;
               cursorRef.current.targetId = null;
               cursorRef.current.progress = 0;
            }
          } else {
            cursorRef.current.progress = Math.min(1, stillCountRef.current / 30);
          }

          lastPosRef.current = { x: cursorRef.current.x, y: cursorRef.current.y };
          onCursorUpdate({ ...cursorRef.current });
        }
      }
      animationId = requestAnimationFrame(process);
    };

    animationId = requestAnimationFrame(process);
    return () => cancelAnimationFrame(animationId);
  }, [cameraStatus, onCursorUpdate, onNodeFocus, onSpawn, onToggleBg]);

  const getStatusText = () => {
    switch (cameraStatus) {
      case 'ACTIVE': return 'LUMINANCE_TRACKING: OK';
      case 'ERROR': return 'ERROR: ACCESS_DENIED';
      case 'NOT_FOUND': return 'ERROR: DEVICE_NOT_FOUND';
      case 'IDLE': return 'SYSTEM: INITIALIZING...';
      default: return 'SYSTEM: STANDBY';
    }
  };

  return (
    <div className="fixed bottom-12 right-4 w-48 h-36 bg-[#ece9d8] border-[3px] border-[#0058e3] rounded shadow-2xl z-[60] overflow-hidden flex flex-col xp-shadow">
      <div className="h-6 bg-gradient-to-r from-[#0058e3] to-[#27c6ff] flex items-center px-2 justify-between select-none">
        <span className="text-white text-[10px] font-bold italic flex items-center gap-1">
          <span className={`w-2 h-2 ${cameraStatus === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'} rounded-full`}></span>
          VISION_DRIVER.SYS
        </span>
        <button onClick={onClose} className="w-4 h-4 bg-[#e96e5c] border border-white text-white text-[8px] flex items-center justify-center hover:brightness-125">✕</button>
      </div>
      <div className="flex-1 bg-black relative flex items-center justify-center group">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        {cameraStatus === 'ACTIVE' ? (
          <canvas ref={canvasRef} width={320} height={240} className="w-full h-full opacity-60 grayscale contrast-125" />
        ) : (
          <div className="text-[10px] text-green-500 font-mono text-center p-4 flex flex-col gap-2">
            <span>
              {cameraStatus === 'IDLE' ? 'BOOTING...' : 
               cameraStatus === 'NOT_FOUND' ? 'CAMERA_NOT_FOUND' : 
               'PERMISSION_DENIED'}
            </span>
            {(cameraStatus === 'NOT_FOUND' || cameraStatus === 'ERROR') && (
              <button 
                onClick={setupCamera}
                className="text-[8px] border border-green-500 px-2 py-1 hover:bg-green-500 hover:text-black transition-colors"
              >
                RESCAN_HARDWARE
              </button>
            )}
          </div>
        )}
      </div>
      <div className={`h-4 bg-[#ece9d8] border-t border-gray-400 text-[8px] px-1 flex items-center ${cameraStatus === 'ERROR' || cameraStatus === 'NOT_FOUND' ? 'text-red-600' : 'text-gray-600'} font-mono whitespace-nowrap overflow-hidden select-none`}>
        {getStatusText()}
      </div>
    </div>
  );
};

export default VisionDriver;
