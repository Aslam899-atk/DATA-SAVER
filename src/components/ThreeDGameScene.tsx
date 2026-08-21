import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Chest } from './IndiaGameMap';

interface ThreeDGameSceneProps {
  playerPos: { lat: number; lng: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  chests: Chest[];
  onOpenBox: (chest: Chest) => void;
  onlinePlayers: any[];
  characterSkin: string;
  onExit3D: () => void;
}

export const ThreeDGameScene: React.FC<ThreeDGameSceneProps> = ({
  playerPos,
  setPlayerPos,
  chests,
  onOpenBox,
  onlinePlayers,
  characterSkin,
  onExit3D
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [nearbyChest, setNearbyChest] = useState<Chest | null>(null);
  const posRef = useRef(playerPos);
  
  // Keep position ref updated
  useEffect(() => {
    posRef.current = playerPos;
  }, [playerPos]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene & Render Engine Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050410); // Vice City dark indigo/magenta night sky
    scene.fog = new THREE.FogExp2(0x050410, 0.015); // Neon fog effect

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Coordinate conversion factor (scale lat/lng to 3D grid coordinate system)
    const scale = 80000;
    const initialLat = posRef.current.lat;
    const initialLng = posRef.current.lng;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x2d1b4e, 1.2); // Warm purple sky light
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff007f, 1.5); // Neon pink moon directional light
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // 3. Grid-based City Environment
    const roadWidth = 14;
    const blockSize = 36;
    const worldSize = 400;

    // Asphalt Ground
    const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x11111a, 
      roughness: 0.8 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Generate City Blocks & Roads
    const buildings: THREE.Box3[] = [];
    const buildingMeshes: THREE.Mesh[] = [];

    const createCityBuilding = (bx: number, bz: number, sizeX: number, sizeZ: number) => {
      const bHeight = 15 + Math.random() * 35;
      const bGeo = new THREE.BoxGeometry(sizeX, bHeight, sizeZ);
      
      // Neon styled building faces
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00f0ff : 0xff007f, // Neon cyan or pink
        wireframe: true
      });
      const solidMat = new THREE.MeshStandardMaterial({
        color: 0x0c0b1e,
        roughness: 0.5,
        metalness: 0.1
      });

      const building = new THREE.Mesh(bGeo, solidMat);
      building.position.set(bx, bHeight / 2, bz);
      scene.add(building);

      const wireframe = new THREE.Mesh(bGeo, wireframeMat);
      wireframe.position.copy(building.position);
      scene.add(wireframe);

      // Save bounding box for physics collision
      const bbox = new THREE.Box3().setFromObject(building);
      buildings.push(bbox);
      buildingMeshes.push(building);
    };

    // Spawn Buildings in grid layout
    for (let x = -worldSize / 2; x < worldSize / 2; x += blockSize + roadWidth) {
      for (let z = -worldSize / 2; z < worldSize / 2; z += blockSize + roadWidth) {
        // Skip central roads
        if (Math.abs(x) < roadWidth / 2 || Math.abs(z) < roadWidth / 2) continue;
        createCityBuilding(x + blockSize / 2, z + blockSize / 2, blockSize, blockSize);
      }
    }

    // Streetlights (neon glowing point lights)
    const streetlightGeo = new THREE.CylinderGeometry(0.1, 0.15, 6);
    const streetlightMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    for (let x = -150; x <= 150; x += 60) {
      for (let z = -150; z <= 150; z += 60) {
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
        const pole = new THREE.Mesh(streetlightGeo, streetlightMat);
        pole.position.set(x, 3, z);
        scene.add(pole);

        const bulb = new THREE.PointLight(x % 120 === 0 ? 0x00f0ff : 0xff007f, 3, 25);
        bulb.position.set(x, 6, z);
        scene.add(bulb);
      }
    }

    // 4. Player Avatar Model (3D Capsule)
    const playerGroup = new THREE.Group();
    
    // Choose colors based on character skin
    let skinBodyColor = 0x0ea5e9; // Cyan
    let skinHeadColor = 0xf43f5e; // Pink
    if (characterSkin === 'gta') {
      skinBodyColor = 0x1e293b; // Black Suit
      skinHeadColor = 0xe2e8f0; // White mask
    } else if (characterSkin === 'ninja') {
      skinBodyColor = 0x10b981; // Green ninja
      skinHeadColor = 0x059669;
    } else if (characterSkin === 'pubg') {
      skinBodyColor = 0xd97706; // Khaki
      skinHeadColor = 0x78350f;
    }

    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: skinBodyColor, roughness: 0.3 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 1.2;
    playerGroup.add(bodyMesh);

    const headGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: skinHeadColor });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 2.7;
    playerGroup.add(headMesh);

    // Simple glasses / visor for GTA heister / Ninja
    const visorGeo = new THREE.BoxGeometry(0.9, 0.25, 0.6);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 2.8, 0.4);
    playerGroup.add(visorMesh);

    // Initial position inside 3D space is center (0,0)
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    // 5. Render Cardboard Boxes (Chests) in 3D
    const chestGroupMap = new Map<string, { mesh: THREE.Group; chest: Chest }>();

    const boxGeo = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    const boxMat = new THREE.MeshStandardMaterial({ 
      color: 0xd97706, // Cardboard brown
      roughness: 0.9 
    });
    
    chests.forEach((chest) => {
      const cGroup = new THREE.Group();
      const cMesh = new THREE.Mesh(boxGeo, boxMat);
      cMesh.position.y = 0.7;
      cMesh.castShadow = true;
      cGroup.add(cMesh);

      // Add tape geometry to cardboard box
      const tapeGeo = new THREE.BoxGeometry(0.3, 1.42, 1.62);
      const tapeMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
      const tape = new THREE.Mesh(tapeGeo, tapeMat);
      tape.position.y = 0.7;
      cGroup.add(tape);

      // Yellow neon halo ring under cardboard box
      const ringGeo = new THREE.RingGeometry(1.2, 1.5, 16);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: chest.coinCost && chest.coinCost > 0 ? 0xff007f : 0xeab308, 
        side: THREE.DoubleSide 
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      cGroup.add(ring);

      // Scale coordinates relative to player spawn
      const cx = (chest.lng - initialLng) * scale;
      const cz = -(chest.lat - initialLat) * scale;
      
      // Boundaries check
      if (Math.abs(cx) < worldSize / 2 && Math.abs(cz) < worldSize / 2) {
        cGroup.position.set(cx, 0, cz);
        scene.add(cGroup);
        chestGroupMap.set(chest.id || chest._id || `${chest.lat}-${chest.lng}`, { mesh: cGroup, chest });
      }
    });

    // 6. Render Online Players in 3D
    const otherPlayersMap = new Map<string, THREE.Group>();

    const updateOtherPlayers = () => {
      // Remove disconnected players
      otherPlayersMap.forEach((mesh, socketId) => {
        if (!onlinePlayers.some(p => p.socketId === socketId)) {
          scene.remove(mesh);
          otherPlayersMap.delete(socketId);
        }
      });

      // Render/update active players
      onlinePlayers.forEach((player) => {
        const px = (player.lng - initialLng) * scale;
        const pz = -(player.lat - initialLat) * scale;

        if (Math.abs(px) < worldSize / 2 && Math.abs(pz) < worldSize / 2) {
          let mesh = otherPlayersMap.get(player.socketId);
          if (!mesh) {
            mesh = new THREE.Group();
            
            // Other players rendered in neon pink capsule
            const pGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.2, 12);
            const pMat = new THREE.MeshStandardMaterial({ color: 0xff007f, roughness: 0.5 });
            const pBody = new THREE.Mesh(pGeo, pMat);
            pBody.position.y = 1.1;
            mesh.add(pBody);

            const pHeadGeo = new THREE.SphereGeometry(0.5, 12, 12);
            const pHeadMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff });
            const pHead = new THREE.Mesh(pHeadGeo, pHeadMat);
            pHead.position.y = 2.4;
            mesh.add(pHead);

            scene.add(mesh);
            otherPlayersMap.set(player.socketId, mesh);
          }
          mesh.position.set(px, 0, pz);
        }
      });
    };

    // 7. Physics Collision Detection
    const checkCollision = (targetPos: THREE.Vector3) => {
      // Create small bounding box around candidate position
      const pBox = new THREE.Box3(
        new THREE.Vector3(targetPos.x - 1, 0, targetPos.z - 1),
        new THREE.Vector3(targetPos.x + 1, 3, targetPos.z + 1)
      );

      // Check collision with buildings
      for (const bbox of buildings) {
        if (pBox.intersectsBox(bbox)) {
          return true;
        }
      }

      // Check world outer boundaries
      if (Math.abs(targetPos.x) > worldSize / 2 - 10 || Math.abs(targetPos.z) > worldSize / 2 - 10) {
        return true;
      }

      return false;
    };

    // 8. Keyboard inputs
    const keys = { w: false, a: false, s: false, d: false, Shift: false };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
      if (e.key === 'Shift') keys.Shift = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
      if (e.key === 'Shift') keys.Shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 9. Animation Game Loop
    let clock = new THREE.Clock();
    let animId: number;
    let locationUpdateTimer = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Keyboard movement calculations
      let moveX = 0;
      let moveZ = 0;

      if (keys.w) moveZ -= 1;
      if (keys.s) moveZ += 1;
      if (keys.a) moveX -= 1;
      if (keys.d) moveX += 1;

      // Apply vector normalization
      if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const speed = keys.Shift ? 24 : 12; // Speed multiplier (Sprint vs Walk)
        const dx = (moveX / length) * speed * delta;
        const dz = (moveZ / length) * speed * delta;

        const candidatePos = playerGroup.position.clone().add(new THREE.Vector3(dx, 0, dz));
        
        // Physics bounding check
        if (!checkCollision(candidatePos)) {
          playerGroup.position.copy(candidatePos);
          
          // Rotate player model to face travel direction
          const angle = Math.atan2(dx, dz);
          playerGroup.rotation.y = angle;
        }

        // Update player coordinates state
        locationUpdateTimer += delta;
        if (locationUpdateTimer > 0.3) { // Throttle updates
          const newLat = initialLat - (playerGroup.position.z / scale);
          const newLng = initialLng + (playerGroup.position.x / scale);
          setPlayerPos({ lat: newLat, lng: newLng });
          locationUpdateTimer = 0;
        }
      }

      // Rotate cardboard boxes slowly for visuals
      chestGroupMap.forEach(({ mesh }) => {
        mesh.rotation.y += 0.015;
      });

      // Synchronize online players locations
      updateOtherPlayers();

      // Proximity chest unlock checks
      let closestChest: Chest | null = null;
      let minDist = 5.0; // 5 units bounding limit
      
      chestGroupMap.forEach(({ mesh, chest }) => {
        const dist = playerGroup.position.distanceTo(mesh.position);
        if (dist < minDist) {
          minDist = dist;
          closestChest = chest;
        }
      });
      setNearbyChest(closestChest);

      // Camera follow logic (3rd person)
      camera.position.set(
        playerGroup.position.x,
        playerGroup.position.y + 11,
        playerGroup.position.z + 16
      );
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z);

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanups
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [onlinePlayers, chests, characterSkin]);

  return (
    <div className="relative w-full h-full">
      {/* ThreeD Canvas Mounting Div */}
      <div ref={mountRef} className="w-full h-full absolute inset-0 z-0" />

      {/* 3D Hud Overlay Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button
          onClick={onExit3D}
          className="px-4 py-2 rounded-xl bg-slate-900/90 border border-pink-500/30 text-pink-400 font-bold font-mono text-xs hover:bg-pink-500/20 shadow-lg"
        >
          ⬅️ RETURN TO 2D MAP
        </button>
        <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-300 font-bold font-mono text-[10px] shadow-lg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>GTA VICE CITY 3D CITY MAP MODE</span>
        </div>
      </div>

      {/* Movement Guides */}
      <div className="absolute top-4 right-4 z-10 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400 max-w-xs text-right shadow-lg">
        <p className="font-bold text-slate-200">KEYBOARD CONTROLS:</p>
        <p>WASD / Arrow Keys - Walk</p>
        <p>SHIFT Key - Sprint/Run</p>
      </div>

      {/* 3D Proximity Chest Unlocking Button Trigger */}
      {nearbyChest && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            onClick={() => onOpenBox(nearbyChest)}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-slate-950 font-extrabold text-sm shadow-[0_0_35px_rgba(245,158,11,0.7)] animate-bounce border-2 border-white flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all"
          >
            🪙 <span>APPROACHED BOX! CLICK TO OPEN ({nearbyChest.coinCost ? `${nearbyChest.coinCost} Coins` : 'Free'})</span>
          </button>
        </div>
      )}
    </div>
  );
};
