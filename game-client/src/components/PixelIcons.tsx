import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

// 1. 8-Bit Pixel Tank
export const PixelTank: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 24, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Left Track */}
    <rect x="1" y="2" width="3" height="12" fill="#1e293b" />
    <rect x="2" y="3" width="1" height="2" fill="#475569" />
    <rect x="2" y="7" width="1" height="2" fill="#475569" />
    <rect x="2" y="11" width="1" height="2" fill="#475569" />
    {/* Right Track */}
    <rect x="12" y="2" width="3" height="12" fill="#1e293b" />
    <rect x="13" y="3" width="1" height="2" fill="#475569" />
    <rect x="13" y="7" width="1" height="2" fill="#475569" />
    <rect x="13" y="11" width="1" height="2" fill="#475569" />
    {/* Tank Body */}
    <rect x="4" y="4" width="8" height="8" fill={color} />
    <rect x="5" y="5" width="6" height="6" fill="#000000" fillOpacity="0.2" />
    {/* Turret & Cannon */}
    <rect x="6" y="6" width="4" height="4" fill="#000000" fillOpacity="0.4" />
    <rect x="7" y="1" width="2" height="7" fill={color} />
    <rect x="7" y="0" width="2" height="2" fill="#000000" fillOpacity="0.4" />
  </svg>
);

// 2. 8-Bit Pixel Gamepad
export const PixelGamepad: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 24, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Body */}
    <rect x="1" y="4" width="14" height="8" fill={color} />
    <rect x="2" y="3" width="12" height="10" fill={color} />
    <rect x="1" y="4" width="1" height="8" fill="#000000" fillOpacity="0.3" />
    <rect x="14" y="4" width="1" height="8" fill="#000000" fillOpacity="0.3" />
    {/* D-Pad */}
    <rect x="3" y="6" width="4" height="4" fill="#0f172a" />
    <rect x="4" y="5" width="2" height="6" fill="#0f172a" />
    <rect x="4" y="7" width="2" height="2" fill="#334155" />
    {/* Action Buttons */}
    <rect x="11" y="6" width="2" height="2" fill="#ef4444" />
    <rect x="9" y="8" width="2" height="2" fill="#3b82f6" />
    {/* Screen / Center */}
    <rect x="7" y="6" width="2" height="1" fill="#0f172a" />
    <rect x="7" y="8" width="2" height="1" fill="#0f172a" />
  </svg>
);

// 3. 8-Bit Pixel Heart
export const PixelHeart: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Outline */}
    <rect x="2" y="2" width="4" height="2" fill="#000" />
    <rect x="10" y="2" width="4" height="2" fill="#000" />
    <rect x="1" y="4" width="1" height="4" fill="#000" />
    <rect x="14" y="4" width="1" height="4" fill="#000" />
    <rect x="2" y="8" width="1" height="2" fill="#000" />
    <rect x="13" y="8" width="1" height="2" fill="#000" />
    <rect x="3" y="10" width="2" height="2" fill="#000" />
    <rect x="11" y="10" width="2" height="2" fill="#000" />
    <rect x="5" y="12" width="2" height="2" fill="#000" />
    <rect x="9" y="12" width="2" height="2" fill="#000" />
    <rect x="7" y="14" width="2" height="1" fill="#000" />
    {/* Fill */}
    <rect x="2" y="4" width="12" height="4" fill={color} />
    <rect x="3" y="8" width="10" height="2" fill={color} />
    <rect x="5" y="10" width="6" height="2" fill={color} />
    <rect x="7" y="12" width="2" height="2" fill={color} />
    {/* Highlight */}
    <rect x="3" y="4" width="2" height="2" fill="#ffffff" fillOpacity="0.8" />
  </svg>
);

// 4. 8-Bit Pixel Trophy
export const PixelTrophy: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Handles */}
    <rect x="1" y="3" width="2" height="4" fill="#d97706" />
    <rect x="1" y="7" width="3" height="1" fill="#d97706" />
    <rect x="13" y="3" width="2" height="4" fill="#d97706" />
    <rect x="12" y="7" width="3" height="1" fill="#d97706" />
    {/* Cup Body */}
    <rect x="3" y="2" width="10" height="6" fill={color} />
    <rect x="4" y="8" width="8" height="2" fill={color} />
    <rect x="6" y="10" width="4" height="2" fill={color} />
    {/* Cup Highlight */}
    <rect x="4" y="3" width="2" height="4" fill="#fef08a" />
    {/* Stem & Base */}
    <rect x="7" y="11" width="2" height="2" fill="#d97706" />
    <rect x="4" y="13" width="8" height="2" fill="#78350f" />
    <rect x="3" y="14" width="10" height="1" fill="#451a03" />
    {/* Star inside cup */}
    <rect x="7" y="4" width="2" height="2" fill="#ffffff" />
  </svg>
);

// 5. 8-Bit Pixel Crown
export const PixelCrown: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="2" y="11" width="12" height="3" fill="#78350f" />
    <rect x="2" y="10" width="12" height="2" fill={color} />
    {/* Spikes */}
    <rect x="2" y="5" width="2" height="5" fill={color} />
    <rect x="7" y="3" width="2" height="7" fill={color} />
    <rect x="12" y="5" width="2" height="5" fill={color} />
    <rect x="4" y="7" width="3" height="3" fill={color} />
    <rect x="9" y="7" width="3" height="3" fill={color} />
    {/* Jewels */}
    <rect x="2" y="4" width="2" height="1" fill="#ef4444" />
    <rect x="7" y="2" width="2" height="1" fill="#3b82f6" />
    <rect x="12" y="4" width="2" height="1" fill="#ef4444" />
    <rect x="5" y="11" width="2" height="1" fill="#10b981" />
    <rect x="9" y="11" width="2" height="1" fill="#3b82f6" />
  </svg>
);

// 6. 8-Bit Pixel Ammo / Bullet
export const PixelAmmo: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Bullet Tip */}
    <rect x="6" y="2" width="4" height="2" fill="#ef4444" />
    <rect x="5" y="4" width="6" height="2" fill="#ef4444" />
    {/* Shell Body */}
    <rect x="5" y="6" width="6" height="6" fill={color} />
    <rect x="6" y="6" width="1" height="6" fill="#fef08a" />
    {/* Rim Base */}
    <rect x="4" y="12" width="8" height="2" fill="#b45309" />
  </svg>
);

// 7. 8-Bit Pixel Brain (Squad Support Intelligence)
export const PixelBrain: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, color = '#22d3ee' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Left Lobe */}
    <rect x="2" y="4" width="5" height="7" fill={color} />
    <rect x="3" y="3" width="3" height="1" fill={color} />
    <rect x="3" y="11" width="3" height="1" fill={color} />
    {/* Right Lobe */}
    <rect x="9" y="4" width="5" height="7" fill={color} />
    <rect x="10" y="3" width="3" height="1" fill={color} />
    <rect x="10" y="11" width="3" height="1" fill={color} />
    {/* Central Fissure */}
    <rect x="7" y="3" width="2" height="10" fill="#0f172a" />
    {/* Convolutions / Details */}
    <rect x="4" y="5" width="2" height="1" fill="#ffffff" fillOpacity="0.7" />
    <rect x="3" y="8" width="3" height="1" fill="#0891b2" />
    <rect x="10" y="5" width="2" height="1" fill="#ffffff" fillOpacity="0.7" />
    <rect x="10" y="8" width="3" height="1" fill="#0891b2" />
  </svg>
);

// 8. 8-Bit Pixel Swords (FFA / Combat)
export const PixelSwords: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#e2e8f0' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Blade 1 */}
    <rect x="2" y="2" width="2" height="2" fill={color} />
    <rect x="4" y="4" width="2" height="2" fill={color} />
    <rect x="6" y="6" width="2" height="2" fill={color} />
    <rect x="8" y="8" width="2" height="2" fill={color} />
    <rect x="10" y="10" width="2" height="2" fill="#d97706" />
    <rect x="9" y="11" width="3" height="1" fill="#d97706" />
    <rect x="12" y="12" width="2" height="2" fill="#78350f" />
    {/* Blade 2 */}
    <rect x="12" y="2" width="2" height="2" fill={color} />
    <rect x="10" y="4" width="2" height="2" fill={color} />
    <rect x="8" y="6" width="2" height="2" fill={color} />
    <rect x="6" y="8" width="2" height="2" fill={color} />
    <rect x="4" y="10" width="2" height="2" fill="#d97706" />
    <rect x="4" y="11" width="3" height="1" fill="#d97706" />
    <rect x="2" y="12" width="2" height="2" fill="#78350f" />
  </svg>
);

// 9. 8-Bit Pixel Lightning / Speed
export const PixelZap: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#facc15' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="7" y="1" width="3" height="2" fill={color} />
    <rect x="6" y="3" width="3" height="2" fill={color} />
    <rect x="5" y="5" width="4" height="2" fill={color} />
    <rect x="4" y="7" width="8" height="2" fill={color} />
    <rect x="8" y="9" width="3" height="2" fill={color} />
    <rect x="7" y="11" width="3" height="2" fill={color} />
    <rect x="6" y="13" width="2" height="2" fill={color} />
    <rect x="6" y="5" width="2" height="4" fill="#ffffff" fillOpacity="0.8" />
  </svg>
);

// 10. 8-Bit Pixel Shield
export const PixelShield: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#3b82f6' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="2" y="2" width="12" height="2" fill="#1e293b" />
    <rect x="2" y="4" width="12" height="5" fill={color} />
    <rect x="3" y="9" width="10" height="2" fill={color} />
    <rect x="4" y="11" width="8" height="2" fill={color} />
    <rect x="6" y="13" width="4" height="2" fill={color} />
    {/* Emblem */}
    <rect x="7" y="4" width="2" height="7" fill="#ffffff" />
    <rect x="4" y="6" width="8" height="2" fill="#ffffff" />
  </svg>
);

// 11. 8-Bit Pixel Target / Crosshair
export const PixelCrosshair: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="7" y="1" width="2" height="4" fill={color} />
    <rect x="7" y="11" width="2" height="4" fill={color} />
    <rect x="1" y="7" width="4" height="2" fill={color} />
    <rect x="11" y="7" width="4" height="2" fill={color} />
    {/* Circle Ring */}
    <rect x="4" y="4" width="2" height="2" fill={color} />
    <rect x="10" y="4" width="2" height="2" fill={color} />
    <rect x="4" y="10" width="2" height="2" fill={color} />
    <rect x="10" y="10" width="2" height="2" fill={color} />
    {/* Center Dot */}
    <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
  </svg>
);

// 12. 8-Bit Pixel Skull
export const PixelSkull: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#f87171' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    {/* Cranium */}
    <rect x="4" y="2" width="8" height="2" fill={color} />
    <rect x="3" y="4" width="10" height="6" fill={color} />
    {/* Jaw */}
    <rect x="5" y="10" width="6" height="3" fill={color} />
    {/* Eyes & Nose */}
    <rect x="4" y="6" width="2" height="2" fill="#000000" />
    <rect x="10" y="6" width="2" height="2" fill="#000000" />
    <rect x="7" y="8" width="2" height="1" fill="#000000" />
    {/* Teeth */}
    <rect x="6" y="12" width="1" height="2" fill="#000000" />
    <rect x="8" y="12" width="1" height="2" fill="#000000" />
    <rect x="10" y="12" width="1" height="2" fill="#000000" />
  </svg>
);

// 13. 8-Bit Pixel Flame (Red Squad)
export const PixelFlame: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="7" y="1" width="2" height="3" fill={color} />
    <rect x="6" y="4" width="4" height="4" fill={color} />
    <rect x="4" y="6" width="8" height="6" fill={color} />
    <rect x="5" y="12" width="6" height="2" fill={color} />
    {/* Inner Core */}
    <rect x="6" y="7" width="4" height="5" fill="#f59e0b" />
    <rect x="7" y="9" width="2" height="3" fill="#fef08a" />
  </svg>
);

// 14. 8-Bit Pixel Leaf (Green Squad)
export const PixelLeaf: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#22c55e' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="10" y="2" width="3" height="3" fill={color} />
    <rect x="6" y="4" width="7" height="6" fill={color} />
    <rect x="4" y="8" width="7" height="4" fill={color} />
    <rect x="3" y="12" width="4" height="2" fill={color} />
    <rect x="2" y="14" width="2" height="2" fill="#15803d" />
    {/* Vein */}
    <rect x="6" y="7" width="4" height="1" fill="#bbf7d0" />
    <rect x="4" y="10" width="3" height="1" fill="#bbf7d0" />
  </svg>
);

// 15. 8-Bit Pixel Radar
export const PixelRadar: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, color = '#06b6d4' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="1" y="1" width="14" height="14" fill="#082f49" />
    <rect x="2" y="2" width="12" height="12" stroke={color} strokeWidth="1" />
    <rect x="5" y="5" width="6" height="6" stroke={color} strokeWidth="1" />
    <rect x="8" y="2" width="1" height="12" fill={color} />
    <rect x="2" y="8" width="12" height="1" fill={color} />
    {/* Blip */}
    <rect x="10" y="4" width="2" height="2" fill="#facc15" />
  </svg>
);

// 16. 8-Bit Pixel Clock / Timer
export const PixelClock: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="5" y="1" width="6" height="1" fill={color} />
    <rect x="4" y="2" width="8" height="1" fill={color} />
    <rect x="2" y="4" width="12" height="8" fill={color} />
    <rect x="4" y="12" width="8" height="1" fill={color} />
    <rect x="5" y="13" width="6" height="1" fill={color} />
    {/* Dial Face */}
    <rect x="4" y="4" width="8" height="7" fill="#0f172a" />
    {/* Hands */}
    <rect x="7" y="5" width="2" height="3" fill="#ffffff" />
    <rect x="8" y="7" width="3" height="1" fill="#ffffff" />
  </svg>
);

// 17. 8-Bit Pixel Medal (Gold, Silver, Bronze)
export const PixelMedal: React.FC<IconProps & { rank?: 1 | 2 | 3 }> = ({ 
  className = 'w-5 h-5', 
  size = 20, 
  rank = 1 
}) => {
  const medalColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#cbd5e1' : '#d97706';
  const ribbonColor = rank === 1 ? '#ef4444' : rank === 2 ? '#3b82f6' : '#10b981';

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
      {/* Ribbon */}
      <rect x="4" y="1" width="3" height="6" fill={ribbonColor} />
      <rect x="9" y="1" width="3" height="6" fill={ribbonColor} />
      {/* Medal Body */}
      <rect x="4" y="6" width="8" height="8" fill={medalColor} />
      <rect x="5" y="5" width="6" height="10" fill={medalColor} />
      {/* Rank Number */}
      <rect x="7" y="8" width="2" height="4" fill="#000000" />
      {rank === 1 && <rect x="6" y="8" width="1" height="1" fill="#000000" />}
      {rank === 2 && (
        <>
          <rect x="6" y="8" width="3" height="1" fill="#000000" />
          <rect x="6" y="11" width="4" height="1" fill="#000000" />
        </>
      )}
      {rank === 3 && (
        <>
          <rect x="6" y="8" width="3" height="1" fill="#000000" />
          <rect x="6" y="11" width="3" height="1" fill="#000000" />
        </>
      )}
    </svg>
  );
};

// 18. 8-Bit Pixel Checkmark
export const PixelCheck: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#10b981' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="11" y="3" width="2" height="2" fill={color} />
    <rect x="9" y="5" width="2" height="2" fill={color} />
    <rect x="7" y="7" width="2" height="2" fill={color} />
    <rect x="5" y="9" width="2" height="2" fill={color} />
    <rect x="3" y="7" width="2" height="2" fill={color} />
    <rect x="2" y="6" width="2" height="2" fill={color} />
  </svg>
);

// 19. 8-Bit Pixel Cross / Wrong
export const PixelCross: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="3" y="3" width="2" height="2" fill={color} />
    <rect x="11" y="3" width="2" height="2" fill={color} />
    <rect x="5" y="5" width="2" height="2" fill={color} />
    <rect x="9" y="5" width="2" height="2" fill={color} />
    <rect x="7" y="7" width="2" height="2" fill={color} />
    <rect x="5" y="9" width="2" height="2" fill={color} />
    <rect x="9" y="9" width="2" height="2" fill={color} />
    <rect x="3" y="11" width="2" height="2" fill={color} />
    <rect x="11" y="11" width="2" height="2" fill={color} />
  </svg>
);

// 20. 8-Bit Pixel Star
export const PixelStar: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5', size = 14, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="7" y="1" width="2" height="2" fill={color} />
    <rect x="6" y="3" width="4" height="2" fill={color} />
    <rect x="1" y="5" width="14" height="2" fill={color} />
    <rect x="3" y="7" width="10" height="2" fill={color} />
    <rect x="5" y="9" width="6" height="2" fill={color} />
    <rect x="4" y="11" width="3" height="3" fill={color} />
    <rect x="9" y="11" width="3" height="3" fill={color} />
    <rect x="7" y="5" width="2" height="2" fill="#ffffff" />
  </svg>
);

// 21. 8-Bit Pixel Crate [?]
export const PixelCrate: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="1" y="1" width="14" height="14" fill="#78350f" />
    <rect x="2" y="2" width="12" height="12" fill={color} />
    <rect x="3" y="3" width="10" height="10" fill="#b45309" />
    {/* Question Mark */}
    <rect x="6" y="4" width="4" height="2" fill="#ffffff" />
    <rect x="8" y="6" width="2" height="2" fill="#ffffff" />
    <rect x="6" y="8" width="3" height="2" fill="#ffffff" />
    <rect x="6" y="11" width="2" height="2" fill="#ffffff" />
  </svg>
);

// 22. 8-Bit Pixel Scales (Auto Balance)
export const PixelScale: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#38bdf8' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="7" y="2" width="2" height="11" fill="#64748b" />
    <rect x="4" y="13" width="8" height="2" fill="#475569" />
    <rect x="2" y="4" width="12" height="2" fill={color} />
    {/* Left Pan */}
    <rect x="2" y="6" width="1" height="3" fill="#cbd5e1" />
    <rect x="5" y="6" width="1" height="3" fill="#cbd5e1" />
    <rect x="1" y="9" width="6" height="2" fill={color} />
    {/* Right Pan */}
    <rect x="10" y="6" width="1" height="3" fill="#cbd5e1" />
    <rect x="13" y="6" width="1" height="3" fill="#cbd5e1" />
    <rect x="9" y="9" width="6" height="2" fill={color} />
  </svg>
);

// 23. 8-Bit Pixel Explosion
export const PixelExplosion: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#f97316' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="7" y="1" width="2" height="2" fill={color} />
    <rect x="1" y="7" width="2" height="2" fill={color} />
    <rect x="13" y="7" width="2" height="2" fill={color} />
    <rect x="7" y="13" width="2" height="2" fill={color} />
    <rect x="4" y="4" width="8" height="8" fill="#ef4444" />
    <rect x="6" y="6" width="4" height="4" fill="#fde047" />
  </svg>
);

// 24. 8-Bit Pixel Handshake / Team
export const PixelTeam: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#38bdf8' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="3" y="3" width="4" height="4" fill={color} />
    <rect x="9" y="3" width="4" height="4" fill="#f59e0b" />
    <rect x="2" y="8" width="6" height="6" fill={color} />
    <rect x="8" y="8" width="6" height="6" fill="#f59e0b" />
    <rect x="6" y="10" width="4" height="3" fill="#ffffff" />
  </svg>
);

// 25. 8-Bit Pixel Speaker
export const PixelSpeaker: React.FC<IconProps & { isMuted?: boolean }> = ({ className = 'w-4 h-4', size = 16, color = '#10b981', isMuted = false }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="2" y="6" width="3" height="4" fill={color} />
    <rect x="5" y="4" width="3" height="8" fill={color} />
    <rect x="8" y="2" width="2" height="12" fill={color} />
    {isMuted ? (
      <>
        <rect x="11" y="5" width="2" height="2" fill="#ef4444" />
        <rect x="13" y="7" width="2" height="2" fill="#ef4444" />
        <rect x="11" y="9" width="2" height="2" fill="#ef4444" />
      </>
    ) : (
      <>
        <rect x="11" y="4" width="1" height="8" fill={color} />
        <rect x="13" y="2" width="1" height="12" fill={color} />
      </>
    )}
  </svg>
);

// 26. 8-Bit Pixel Music
export const PixelMusic: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16, color = '#22d3ee' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`inline-block shrink-0 ${className}`} shapeRendering="crispEdges">
    <rect x="4" y="9" width="3" height="3" fill={color} />
    <rect x="11" y="7" width="3" height="3" fill={color} />
    <rect x="6" y="3" width="1" height="8" fill={color} />
    <rect x="13" y="2" width="1" height="7" fill={color} />
    <rect x="6" y="2" width="8" height="2" fill={color} />
  </svg>
);
