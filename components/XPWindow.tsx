
import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { PoetryNode } from '../types';

interface Props {
  node: PoetryNode;
  vCursorActive?: boolean;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onSpawn: (word: string, node: PoetryNode) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, w: number, h: number) => void;
  onAttemptMerge: (id: string) => void;
}

const XPWindow: React.FC<Props> = memo(({ 
  node, vCursorActive, onClose, onFocus, onSpawn, onUpdatePosition, onUpdateSize, onAttemptMerge 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [trail, setTrail] = useState<{x: number, y: number}[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ w: 0, h: 0, mouseX: 0, mouseY: 0 });
  
  // Use 'number' for browser environments, effectively compatible with window.setTimeout
  const timerRef = useRef<number | null>(null);
  const maxTrail = 6;

  // 有節奏的打字機動畫邏輯
  useEffect(() => {
    setVisibleCount(0);
    const textLength = node.fullText.length;
    
    const tick = (current: number) => {
      if (current >= textLength) return;

      const nextCount = current + 1;
      setVisibleCount(nextCount);

      // 計算下一次出現的延遲
      // 基礎速度 100ms，每四個字 (nextCount % 4 === 0) 額外停頓 500ms
      const isPausePoint = nextCount > 0 && nextCount % 4 === 0 && nextCount < textLength;
      const delay = isPausePoint ? 600 : 100;

      timerRef.current = window.setTimeout(() => {
        tick(nextCount);
      }, delay);
    };

    tick(0);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [node.fullText]);

  // 解析單詞，同時紀錄每個單詞在原始字串中的起始位置
  const wordsWithMeta = useMemo(() => {
    // 這裡使用正則拆分，保留標點符號作為獨立部分
    const rawParts = node.fullText.split(/([，。？?！!\s]+)/).filter(w => w.length > 0);
    let currentPos = 0;
    return rawParts.map(part => {
      const start = currentPos;
      currentPos += part.length;
      return { text: part, start, end: currentPos };
    });
  }, [node.fullText]);

  // 殘影優化
  useEffect(() => {
    if (isDragging || vCursorActive) {
      setTrail(prev => [{ x: node.x, y: node.y }, ...prev].slice(0, maxTrail));
    } else {
      if (trail.length > 0) setTrail([]);
    }
  }, [node.x, node.y, isDragging, vCursorActive]);

  const handleMouseDown = (e: React.MouseEvent) => {
    onFocus(node.id);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - node.x, y: e.clientY - node.y };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus(node.id);
    setIsResizing(true);
    resizeStartRef.current = { 
      w: node.width, 
      h: node.height, 
      mouseX: e.clientX, 
      mouseY: e.clientY 
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onUpdatePosition(node.id, e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
      } else if (isResizing) {
        const dw = e.clientX - resizeStartRef.current.mouseX;
        const dh = e.clientY - resizeStartRef.current.mouseY;
        onUpdateSize(node.id, Math.max(220, resizeStartRef.current.w + dw), Math.max(150, resizeStartRef.current.h + dh));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, node.id, onUpdatePosition, onUpdateSize]);

  const isFinished = visibleCount >= node.fullText.length;

  return (
    <>
      {/* 拖曳殘影 */}
      {(isDragging || vCursorActive) && trail.map((pos, index) => (
        <div
          key={`trail-${index}`}
          className="absolute border-[1px] border-[#0058e3]/40 rounded-t-lg pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: node.width,
            height: node.height,
            zIndex: node.zIndex - (index + 1),
            opacity: (1 - (index / maxTrail)) * 0.2,
          }}
        />
      ))}

      <div 
        className={`absolute bg-[#ece9d8] border-[3px] rounded-t-lg flex flex-col overflow-hidden pointer-events-auto shadow-xl transition-colors duration-200 ${vCursorActive ? 'border-green-500 ring-2 ring-green-400 ring-opacity-50' : 'border-[#0058e3]'}`}
        style={{ 
          left: node.x, 
          top: node.y, 
          width: node.width, 
          height: node.height, 
          zIndex: node.zIndex,
          willChange: 'transform, left, top'
        }}
      >
        {/* Title Bar */}
        <div 
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-2 py-1 h-8 select-none cursor-move transition-all ${vCursorActive ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-[#0058e3] to-[#27c6ff]'}`}
        >
          <div className="flex items-center text-white text-[12px] font-bold drop-shadow-md tracking-tight">
            <img src="https://winxp.vercel.app/icons/notepad.png" alt="icon" className="w-4 h-4 mr-1.5" />
            Poetry.exe {vCursorActive ? ' (Locked)' : ''}
          </div>
          <div className="flex gap-0.5">
            <button className="xp-btn">_</button>
            <button className="xp-btn">□</button>
            <button onClick={(e) => { e.stopPropagation(); onClose(node.id); }} className="xp-btn-close">✕</button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="flex bg-[#ece9d8] border-b border-gray-400 px-1 py-[2px] text-[10px] items-center">
          <span className="menu-item">檔案(F)</span>
          <span className="menu-item">編輯(E)</span>
          <div className="h-4 w-[1px] bg-gray-400 mx-1" />
          <button 
            onClick={() => onAttemptMerge(node.id)} 
            className={`write-btn ${!isFinished ? 'opacity-30 cursor-not-allowed' : ''}`}
            disabled={!isFinished}
          >
            ✍️ 寫作 (W)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 bg-white m-[2px] border border-gray-400 shadow-inner overflow-auto custom-scrollbar">
          <div className="flex flex-wrap gap-x-1 gap-y-2 leading-relaxed font-serif">
            {wordsWithMeta.map((meta, i) => {
              // 標點符號判斷
              const isPunctuation = /^[，。？?！!\s]+$/.test(meta.text);
              
              if (meta.start < visibleCount) {
                const visibleLength = Math.min(meta.text.length, visibleCount - meta.start);
                const visiblePart = meta.text.substring(0, visibleLength);
                
                return (
                  <span 
                    key={i}
                    onClick={() => !isPunctuation && isFinished && onSpawn(meta.text, node)}
                    className={(!isPunctuation && isFinished) ? "poetry-word" : ""}
                    style={{ 
                      fontSize: `${Math.max(14, 24 - node.depth * 1.5)}px`,
                      color: isPunctuation ? '#888' : undefined,
                      transition: 'color 0.3s ease'
                    }}
                  >
                    {visiblePart}
                  </span>
                );
              }
              return null;
            })}
            {/* 閃爍游標 */}
            {!isFinished && (
              <span 
                className="w-[2px] bg-blue-500 animate-[pulse_0.8s_infinite] ml-0.5" 
                style={{ height: `${Math.max(14, 24 - node.depth * 1.5) * 1.2}px` }} 
              />
            )}
          </div>
        </div>
        
        {/* Status Bar / Resizer */}
        <div className="bg-[#ece9d8] border-t border-gray-300 px-2 py-[2px] text-[9px] text-gray-500 flex justify-between relative h-6 items-center select-none">
          <span className="italic">
            {!isFinished ? 'Thinking...' : 'Hyperlink: Active'}
          </span>
          <div onMouseDown={handleResizeMouseDown} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize p-[1px]">
            <div className="w-3 h-3 border-r-2 border-b-2 border-gray-500 opacity-40" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
          </div>
        </div>

        <style>{`
          .xp-btn { @apply w-5 h-5 bg-[#0058e3] border border-white rounded-sm shadow-inner flex items-center justify-center text-white font-bold text-[9px] hover:brightness-110 active:brightness-90; }
          .xp-btn-close { @apply w-[21px] h-[21px] bg-gradient-to-b from-[#e96e5c] to-[#921e1e] border border-white rounded-sm shadow-md flex items-center justify-center text-white text-[11px] font-bold hover:brightness-125 active:brightness-90; }
          .menu-item { @apply px-2 py-0.5 hover:bg-[#316ac5] hover:text-white cursor-default transition-colors rounded-sm; }
          .write-btn { @apply px-2 py-0.5 bg-green-50 hover:bg-green-600 hover:text-white cursor-pointer font-bold border border-green-500 rounded-sm mx-1 transition-all active:scale-95 text-[10px]; }
          .poetry-word { @apply cursor-pointer hover:underline text-[#0000ee] hover:text-green-600 transition-all select-none; }
          .custom-scrollbar::-webkit-scrollbar { width: 15px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-left: 1px solid #ddd; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border: 3px solid #f1f1f1; border-radius: 2px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #bbb; }
        `}</style>
      </div>
    </>
  );
});

export default XPWindow;
