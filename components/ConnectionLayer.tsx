
import React, { memo } from 'react';
import { PoetryNode } from '../types';

interface Props {
  nodes: PoetryNode[];
  maxDistance?: number;
}

const ConnectionLayer: React.FC<Props> = memo(({ nodes, maxDistance = 400 }) => {
  // Performance optimization: skip SVG rendering if nodes are too many to avoid heavy DOM updates
  // or if there aren't enough nodes to connect.
  if (nodes.length < 2 || nodes.length > 50) return null;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-[5] opacity-50">
      <defs>
        <filter id="neonGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      {nodes.map((node, i) => {
        const x1 = node.x + node.width / 2;
        const y1 = node.y + node.height / 2;

        return nodes.slice(i + 1).map(other => {
          const x2 = other.x + other.width / 2;
          const y2 = other.y + other.height / 2;
          
          // Use a simple distance check before rendering
          const dx = x1 - x2;
          const dy = y1 - y2;
          const distSq = dx * dx + dy * dy;
          const maxDistSq = maxDistance * maxDistance;
          
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const opacity = 1 - (dist / maxDistance);
            const strokeW = 1.5 * opacity;
            
            return (
              <line 
                key={`link-${node.id}-${other.id}`}
                x1={x1} y1={y1} x2={x2} y2={y2} 
                stroke="#39FF14" 
                strokeWidth={strokeW}
                strokeOpacity={opacity * 0.6}
                strokeDasharray="4,8"
                filter="url(#neonGlow)"
              />
            );
          }
          return null;
        });
      })}
    </svg>
  );
});

export default ConnectionLayer;
