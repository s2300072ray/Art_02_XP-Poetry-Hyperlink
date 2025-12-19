
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PoetryNode, BackgroundType, VirtualCursor } from './types';
import { WORD_EXTENSIONS, INITIAL_NODE_TEXT, calculateNodeSize } from './constants';
import XPWindow from './components/XPWindow';
import PoetryCanvas from './components/PoetryCanvas';
import ConnectionLayer from './components/ConnectionLayer';
import VisionDriver from './components/VisionDriver';

const App: React.FC = () => {
  // --- State Management ---
  const [nodes, setNodes] = useState<PoetryNode[]>([]);
  const [bgType, setBgType] = useState<BackgroundType>(BackgroundType.BlissDream);
  const [highestZ, setHighestZ] = useState(10);
  
  // Vision & Cursor State
  const [vCursor, setVCursor] = useState<VirtualCursor>({ 
    x: window.innerWidth / 2, 
    y: window.innerHeight / 2, 
    isDown: false, 
    targetId: null, 
    progress: 0 
  });
  
  // UI Flags
  const [showVision, setShowVision] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(true);
  
  // Refs
  const nodeCounter = useRef(0);
  const bgClickStartRef = useRef<{x: number, y: number} | null>(null);

  // --- Handlers ---

  const changeBackground = useCallback(() => {
    setBgType(prev => {
      // 隨機切換背景，避免重複
      let next = Math.floor(Math.random() * 8);
      while (next === prev) {
        next = Math.floor(Math.random() * 8);
      }
      return next as BackgroundType;
    });
  }, []);

  const createNode = useCallback((text: string, x: number, y: number, depth: number, parentId?: string) => {
    const id = `node-${nodeCounter.current++}`;
    const { width, height } = calculateNodeSize(text, depth);
    
    const newNode: PoetryNode = {
      id, parentId, text, fullText: text,
      x, y, width, height,
      depth, zIndex: highestZ + 1
    };
    setHighestZ(prev => prev + 1);
    setNodes(prev => [...prev, newNode]);
  }, [highestZ]);

  const handleClose = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleFocus = useCallback((id: string) => {
    setHighestZ(prev => {
      const nextZ = prev + 1;
      setNodes(current => current.map(n => n.id === id ? { ...n, zIndex: nextZ } : n));
      return nextZ;
    });
  }, []);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleUpdateSize = useCallback((id: string, width: number, height: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
  }, []);

  const handleSpawn = useCallback((word: string, parentNode: PoetryNode) => {
    changeBackground();
    const options = WORD_EXTENSIONS[word] || WORD_EXTENSIONS.default;
    const nextText = options[Math.floor(Math.random() * options.length)];
    const { width: nextW } = calculateNodeSize(nextText, parentNode.depth + 1);
    
    // 智慧定位：避免超出邊界
    const nextX = Math.max(20, Math.min(window.innerWidth - nextW - 40, parentNode.x + Math.random() * 300 - 150));
    const nextY = Math.max(20, Math.min(window.innerHeight - 300, parentNode.y + Math.random() * 300 - 150));
    
    createNode(nextText, nextX, nextY, parentNode.depth + 1, parentNode.id);
  }, [changeBackground, createNode]);

  const attemptMerge = useCallback((sourceId: string) => {
    setNodes(current => {
      const sourceNode = current.find(n => n.id === sourceId);
      if (!sourceNode) return current;
      
      const candidates = current.filter(n => n.id !== sourceId);
      let closestId: string | null = null;
      let minDist = 400; // 合併距離閾值
      
      candidates.forEach(other => {
        const dx = (sourceNode.x + sourceNode.width / 2) - (other.x + other.width / 2);
        const dy = (sourceNode.y + sourceNode.height / 2) - (other.y + other.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closestId = other.id;
        }
      });

      if (closestId) {
        const targetNode = current.find(n => n.id === closestId)!;
        const mergedText = `${sourceNode.fullText}，${targetNode.fullText}`;
        
        // 使用 setTimeout 確保狀態更新順序
        setTimeout(() => {
          createNode(
            mergedText,
            (sourceNode.x + targetNode.x) / 2,
            (sourceNode.y + targetNode.y) / 2,
            Math.max(sourceNode.depth, targetNode.depth) + 1
          );
          changeBackground();
        }, 0);
        
        return current.filter(n => n.id !== sourceId && n.id !== closestId);
      }
      return current;
    });
  }, [changeBackground, createNode]);

  // --- Effects ---

  // 視覺游標驅動視窗移動
  useEffect(() => {
    if (vCursor.isDown && vCursor.targetId) {
      const target = nodes.find(n => n.id === vCursor.targetId);
      if (target) {
        handleUpdatePosition(target.id, vCursor.x - target.width / 2, vCursor.y - 15);
      }
    }
  }, [vCursor.x, vCursor.y, vCursor.isDown, vCursor.targetId, handleUpdatePosition, nodes]);

  // 初始化第一個節點
  useEffect(() => {
    if (nodes.length === 0 && nodeCounter.current === 0) {
      createNode(INITIAL_NODE_TEXT, window.innerWidth / 2 - 150, window.innerHeight / 2 - 100, 0);
    }
  }, [nodes.length, createNode]);

  // --- Render Helpers ---

  const startWithVision = () => {
    setShowVision(true);
    setShowStartDialog(false);
    changeBackground();
  };

  const startStandard = () => {
    setShowVision(false);
    setShowStartDialog(false);
    changeBackground();
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden select-none cursor-default bg-[#008080]"
      onMouseDown={(e) => {
        // 只有點擊背景本身時紀錄位置
        if (e.target === e.currentTarget) {
          bgClickStartRef.current = { x: e.clientX, y: e.clientY };
        } else {
          bgClickStartRef.current = null;
        }
      }}
      onMouseUp={(e) => {
        // 檢查是否為背景點擊且沒有大幅度拖曳 (防止誤觸)
        if (e.target === e.currentTarget && bgClickStartRef.current) {
          const dist = Math.sqrt(
            Math.pow(e.clientX - bgClickStartRef.current.x, 2) + 
            Math.pow(e.clientY - bgClickStartRef.current.y, 2)
          );
          // 容許 5px 的微小抖動，超過則視為拖曳操作不觸發切換
          if (dist < 5) {
            changeBackground();
          }
        }
        bgClickStartRef.current = null;
      }}
    >
      <PoetryCanvas bgType={bgType} nodes={nodes} />
      <ConnectionLayer nodes={nodes} maxDistance={450} />
      
      {/* Windows Layer */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {nodes.map(node => (
          <XPWindow 
            key={node.id} 
            node={node} 
            vCursorActive={vCursor.targetId === node.id}
            onClose={handleClose}
            onFocus={handleFocus}
            onSpawn={handleSpawn}
            onUpdatePosition={handleUpdatePosition}
            onUpdateSize={handleUpdateSize}
            onAttemptMerge={attemptMerge}
          />
        ))}
      </div>

      {/* Vision System Layer */}
      {showVision && (
        <>
          <VisionDriver 
            nodes={nodes} 
            onCursorUpdate={setVCursor} 
            onNodeFocus={handleFocus}
            onSpawn={handleSpawn}
            onToggleBg={changeBackground}
            onClose={() => setShowVision(false)}
          />
          {/* Virtual Cursor Rendering */}
          <div 
            className="fixed pointer-events-none z-[9999] flex items-center justify-center transition-transform duration-75 ease-out will-change-transform"
            style={{ transform: `translate(${vCursor.x}px, ${vCursor.y}px)` }}
          >
            <img 
              src="https://winxp.vercel.app/cursors/arrow.png" 
              alt="cursor" 
              className="w-6 h-6 absolute top-0 left-0 drop-shadow-md" 
            />
            <div className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${vCursor.progress > 0 ? 'border-green-400 scale-125' : 'border-white/30'} flex items-center justify-center overflow-hidden`}>
              <div 
                className="bg-green-500/40 w-full absolute bottom-0 transition-all duration-100"
                style={{ height: `${vCursor.progress * 100}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Start Dialog */}
      {showStartDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="w-[400px] bg-[#ece9d8] border-[3px] border-[#0058e3] rounded-t-lg shadow-2xl overflow-hidden xp-shadow">
            <div className="bg-gradient-to-r from-[#0058e3] to-[#27c6ff] h-8 flex items-center px-2 justify-between cursor-default">
              <span className="text-white font-bold text-sm flex items-center gap-2 shadow-sm">
                <img src="https://winxp.vercel.app/icons/computer.png" alt="sys" className="w-4 h-4" />
                System Startup
              </span>
            </div>
            <div className="p-6 flex flex-col items-center gap-6">
              <div className="flex gap-4 items-start w-full">
                <img src="https://winxp.vercel.app/icons/msg_info.png" alt="info" className="w-10 h-10" />
                <div className="text-[13px] text-gray-800 leading-relaxed font-sans">
                  歡迎進入超連結詩意空間。
                  <br /><br />
                  本系統支援 <b>Webcam 視覺追蹤系統</b>，可透過攝影機偵測光源來控制游標。
                  <br /><br />
                  是否要啟動視覺驅動程式？
                </div>
              </div>
              <div className="flex gap-3 w-full justify-end mt-2">
                <button 
                  onClick={startWithVision}
                  className="px-6 py-1 bg-[#ece9d8] border border-white outline outline-1 outline-gray-500 rounded-sm shadow-[1px_1px_0px_#000] active:shadow-[inset_1px_1px_2px_#000] active:translate-y-[1px] text-[12px] hover:bg-[#f0f0f0]"
                >
                  啟動視覺 (Y)
                </button>
                <button 
                  onClick={startStandard}
                  className="px-6 py-1 bg-[#ece9d8] border border-white outline outline-1 outline-gray-500 rounded-sm shadow-[1px_1px_0px_#000] active:shadow-[inset_1px_1px_2px_#000] active:translate-y-[1px] text-[12px] hover:bg-[#f0f0f0]"
                >
                  標準模式 (N)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className="fixed bottom-0 left-0 w-full h-10 bg-gradient-to-b from-[#245edb] to-[#0d368b] border-t-2 border-[#1033a2] flex items-center px-1 z-50 shadow-2xl">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowStartDialog(true); }}
          className="h-8 px-4 bg-gradient-to-b from-[#3cc13c] to-[#24a024] text-white font-bold italic rounded-tr-xl rounded-br-xl shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8)] border-r-2 border-green-800 flex items-center gap-2 group hover:brightness-110 active:brightness-95 active:shadow-inner"
        >
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center"><span className="text-green-600 text-[10px]">🏁</span></div>
          <span className="text-[14px] drop-shadow-md">開始</span>
        </button>
        <div className="flex-1 px-4 text-xs text-white font-bold italic opacity-80 flex items-center gap-4">
          <button 
            onClick={() => setShowVision(!showVision)}
            className={`px-3 py-0.5 rounded border transition-all duration-300 font-mono text-[10px] ${showVision ? 'bg-green-600 border-green-300 text-white' : 'bg-gray-700 border-gray-500 text-gray-400'}`}
          >
            {showVision ? '● VISION_ENABLED' : '○ VISION_DISABLED'}
          </button>
          <span className="hidden sm:inline">Active Nodes: {nodes.length}</span>
        </div>
        <div className="px-4 py-1 bg-[#0996f1] border border-[#0877c1] rounded text-white text-xs font-bold mr-1 shadow-inner select-none">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default App;
