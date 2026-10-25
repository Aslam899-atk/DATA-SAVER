import React, { useEffect, useRef } from 'react';
import type { DroppedFileItem, SpawnedCar, OfflinePlayerAvatar, CashAirdropItem } from '../types/game';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number; // in radians
  files: DroppedFileItem[];
  cars: SpawnedCar[];
  offlinePlayers: OfflinePlayerAvatar[];
  cashDrops?: CashAirdropItem[];
  worldSize: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerHeading,
  files,
  cars,
  offlinePlayers,
  cashDrops = [],
  worldSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2;
    const radarRange = 130; // World units visible in radar radius
    const scale = radius / radarRange;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Save for clipping to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 6, 0, Math.PI * 2);
    ctx.clip();

    // Radar Background
    const bgGrad = ctx.createRadialGradient(radius, radius, 10, radius, radius, radius);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // City Roads Grid
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(-playerHeading);

    // Draw Avenues
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
    ctx.lineWidth = 14 * scale;
    ctx.lineCap = 'round';

    const blockSize = 40;
    const halfWorld = worldSize / 2;

    for (let x = -halfWorld; x <= halfWorld; x += blockSize) {
      const relX = (x - playerX) * scale;
      ctx.beginPath();
      ctx.moveTo(relX, (-halfWorld - playerZ) * scale);
      ctx.lineTo(relX, (halfWorld - playerZ) * scale);
      ctx.stroke();
    }

    for (let z = -halfWorld; z <= halfWorld; z += blockSize) {
      const relZ = (z - playerZ) * scale;
      ctx.beginPath();
      ctx.moveTo((-halfWorld - playerX) * scale, relZ);
      ctx.lineTo((halfWorld - playerX) * scale, relZ);
      ctx.stroke();
    }

    // Road centerlines
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 2 * scale;
    for (let x = -halfWorld; x <= halfWorld; x += blockSize) {
      const relX = (x - playerX) * scale;
      ctx.beginPath();
      ctx.moveTo(relX, (-halfWorld - playerZ) * scale);
      ctx.lineTo(relX, (halfWorld - playerZ) * scale);
      ctx.stroke();
    }

    // Draw Special District Markers: Showroom (cyan box), Bank (gold box), Thattukada (orange box)
    const districts = [
      { x: 35, z: -15, label: 'SHOWROOM', color: '#06b6d4' },
      { x: 0, z: -40, label: 'BANK', color: '#eab308' },
      { x: -30, z: 20, label: 'THATTUKADA', color: '#f97316' },
    ];
    districts.forEach((d) => {
      const dx = (d.x - playerX) * scale;
      const dz = (d.z - playerZ) * scale;
      if (Math.hypot(dx, dz) < radius - 8) {
        ctx.fillStyle = d.color;
        ctx.fillRect(dx - 4, dz - 4, 8, 8);
      }
    });

    // Draw Offline Players (Cyan/white circles)
    offlinePlayers.forEach((p) => {
      const px = (p.x - playerX) * scale;
      const pz = (p.z - playerZ) * scale;
      if (Math.hypot(px, pz) < radius - 8) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.beginPath();
        ctx.arc(px, pz, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Cars (Blue / Gold squares)
    cars.forEach((car) => {
      const cx = (car.x - playerX) * scale;
      const cz = (car.z - playerZ) * scale;
      if (Math.hypot(cx, cz) < radius - 8) {
        ctx.fillStyle = car.isPlayerInside ? '#10b981' : car.ownerId ? '#38bdf8' : '#f59e0b';
        ctx.fillRect(cx - 3, cz - 3, 6, 6);
      }
    });

    // Draw Dropped File Crates (Pink / Gold Diamonds)
    files.forEach((f) => {
      const fx = (f.x - playerX) * scale;
      const fz = (f.z - playerZ) * scale;
      if (Math.hypot(fx, fz) < radius - 8) {
        ctx.fillStyle = f.isPaid ? '#eab308' : '#ec4899';
        ctx.beginPath();
        ctx.moveTo(fx, fz - 5);
        ctx.lineTo(fx + 5, fz);
        ctx.lineTo(fx, fz + 5);
        ctx.lineTo(fx - 5, fz);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw Live Cash Airdrops (Glowing Golden Stars)
    cashDrops.forEach((cd) => {
      if (cd.isClaimed) return;
      const cx = (cd.x - playerX) * scale;
      const cz = (cd.z - playerZ) * scale;
      if (Math.hypot(cx, cz) < radius - 8) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cz, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    ctx.restore();

    // Radar Rings & Grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(radius, radius, (radius - 12) * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(radius, radius, (radius - 12) * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Player Arrow at center
    ctx.save();
    ctx.translate(radius, radius);
    ctx.fillStyle = '#06b6d4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore clip

    // Outer Radar Border Ring
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // North Marker 'N'
    const northX = radius + Math.sin(-playerHeading) * (radius - 16);
    const northY = radius - Math.cos(-playerHeading) * (radius - 16);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', northX, northY);
  }, [playerX, playerZ, playerHeading, files, cars, offlinePlayers, worldSize]);

  return (
    <div className="relative w-44 h-44 rounded-full p-1 bg-black/80 backdrop-blur-md shadow-2xl border border-cyan-500/30">
      <canvas ref={canvasRef} width={168} height={168} className="rounded-full w-full h-full" />
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black/90 border border-zinc-700 rounded-full text-[9px] font-mono text-zinc-300 whitespace-nowrap shadow">
        GPS: X{Math.round(playerX)} Z{Math.round(playerZ)}
      </div>
    </div>
  );
};
