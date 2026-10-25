import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type {
  UserProfile,
  SpawnedCar,
  DroppedFileItem,
  OfflinePlayerAvatar,
  BuildingCollisionBox,
  BillboardSlot,
} from '../types/game';
import { FAMOUS_CARS } from '../utils/carCatalog';
import { soundFx } from '../utils/soundEffects';
import {
  getBillboards,
  updateBillboard,
  trackAndGetTotalVisitors,
} from '../utils/billboardStorage';
import {
  getCurrentUser,
  saveCurrentUser,
  getOfflinePlayers,
  recordUserOffline,
  recordUserOnline,
} from '../utils/authStorage';
import {
  loadDroppedFiles,
  saveDroppedFile,
  deleteDroppedFile,
  claimFileDownload,
} from '../utils/fileStorage';
import { GtaHud, type DriveControlAction } from './GtaHud';
import { Minimap } from './Minimap';
import { FileModal } from './FileModal';
import { DropFileModal } from './DropFileModal';
import { AdminCarModal } from './AdminCarModal';
import { ShowroomModal } from './ShowroomModal';
import { ControlsModal } from './ControlsModal';

export const GtaCityMap: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User State
  const [user, setUser] = useState<UserProfile>(getCurrentUser());

  // Game UI State
  const [inVehicle, setInVehicle] = useState<boolean>(false);
  const [vehicleSpeed, setVehicleSpeed] = useState<number>(0);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(
    'WELCOME TO VICE CITY! VISIT THE CAR SHOWROOM OR AIRDROP FILES'
  );
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals
  const [selectedFileForModal, setSelectedFileForModal] = useState<DroppedFileItem | null>(null);
  const [pendingFileForDrop, setPendingFileForDrop] = useState<File | null>(null);
  const [isDropConfigOpen, setIsDropConfigOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isShowroomOpen, setIsShowroomOpen] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);

  // Dynamic Minimap coordinates & entities
  const [playerCoord, setPlayerCoord] = useState<{ x: number; z: number; heading: number }>({
    x: user.x || 0,
    z: user.z || 0,
    heading: user.rotation || 0,
  });
  const [carsList, setCarsList] = useState<SpawnedCar[]>([]);
  const [droppedFilesList, setDroppedFilesList] = useState<DroppedFileItem[]>([]);
  const [offlinePlayersList, setOfflinePlayersList] = useState<OfflinePlayerAvatar[]>(getOfflinePlayers());
  const [billboardsList, setBillboardsList] = useState<BillboardSlot[]>(getBillboards());
  const [totalVisitors] = useState<number>(trackAndGetTotalVisitors());

  // 60 FPS Game Loop Simulation Reference
  const sim = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    playerGroup: THREE.Group | null;
    playerLeftLeg: THREE.Mesh | null;
    playerRightLeg: THREE.Mesh | null;
    playerLeftArm: THREE.Mesh | null;
    playerRightArm: THREE.Mesh | null;
    yaw: number;
    pitch: number;
    playerVelY: number;
    isGrounded: boolean;
    activeVehicle: SpawnedCar | null;
    cars: SpawnedCar[];
    droppedCrates: { item: DroppedFileItem; group: THREE.Group; parachute?: THREE.Group; tagSprite?: THREE.Sprite }[];
    offlineMeshes: { player: OfflinePlayerAvatar; group: THREE.Group }[];
    billboardMeshes: { [id: string]: THREE.Mesh };
    collisionBoxes: BuildingCollisionBox[];
    keys: { [key: string]: boolean };
    mouseDown: boolean;
    worldSize: number;
    showcasePodiumCar?: THREE.Group;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    playerGroup: null,
    playerLeftLeg: null,
    playerRightLeg: null,
    playerLeftArm: null,
    playerRightArm: null,
    yaw: user.rotation || 0,
    pitch: 0.15,
    playerVelY: 0,
    isGrounded: true,
    activeVehicle: null,
    cars: [],
    droppedCrates: [],
    offlineMeshes: [],
    billboardMeshes: {},
    collisionBoxes: [],
    keys: {},
    mouseDown: false,
    worldSize: 400,
  });

  // Interactive Driving State (Keyboard + On-Screen Touch/Mouse Controls)
  const virtualDriveState = useRef<{
    gas: boolean;
    reverse: boolean;
    steerLeft: boolean;
    steerRight: boolean;
    handbrake: boolean;
  }>({
    gas: false,
    reverse: false,
    steerLeft: false,
    steerRight: false,
    handbrake: false,
  });

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  // Save current player progress (coords, cash, owned cars)
  useEffect(() => {
    const interval = setInterval(() => {
      if (sim.current.playerGroup) {
        const p = sim.current.playerGroup.position;
        setUser((prev) => {
          const updated: UserProfile = {
            ...prev,
            x: Math.round(p.x * 10) / 10,
            z: Math.round(p.z * 10) / 10,
            rotation: Math.round(sim.current.yaw * 100) / 100,
            lastSeen: Date.now(),
          };
          saveCurrentUser(updated);
          return updated;
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Record user offline when unloading / closing tab
  useEffect(() => {
    recordUserOnline(user.id);

    const handleBeforeUnload = () => {
      if (sim.current.playerGroup) {
        const p = sim.current.playerGroup.position;
        recordUserOffline({
          ...user,
          x: p.x,
          z: p.z,
          rotation: sim.current.yaw,
          lastSeen: Date.now(),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [user]);

  // Create Detailed 3D Car Mesh based on famous model
  const createDetailedCarMesh = (car: SpawnedCar): THREE.Group => {
    const carGroup = new THREE.Group();
    const catalogItem = FAMOUS_CARS.find((c) => c.id === car.catalogId) || FAMOUS_CARS[0];

    // Main Chassis
    let bodyLength = 5.2;
    let bodyWidth = 2.4;
    let bodyHeight = 0.8;
    let cabinLength = 2.6;
    let cabinHeight = 0.7;

    if (catalogItem.category === 'Hypercar') {
      bodyLength = 5.4;
      bodyHeight = 0.7;
      cabinHeight = 0.6;
    } else if (catalogItem.category === 'SUV') {
      bodyLength = 5.0;
      bodyWidth = 2.5;
      bodyHeight = 1.2;
      cabinLength = 3.2;
      cabinHeight = 1.0;
    } else if (catalogItem.category === 'Electric') {
      // Cybertruck angular body
      bodyLength = 5.6;
      bodyWidth = 2.5;
      bodyHeight = 1.1;
      cabinLength = 3.0;
      cabinHeight = 0.9;
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: car.color,
      metalness: catalogItem.category === 'Electric' ? 0.9 : 0.7,
      roughness: catalogItem.category === 'Electric' ? 0.2 : 0.15,
    });

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMat);
    bodyMesh.position.y = bodyHeight / 2 + 0.25;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carGroup.add(bodyMesh);

    // Cabin / Roof (Glass / Glossy Black)
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.9,
      roughness: 0.1,
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.88, cabinHeight, cabinLength), cabinMat);
    cabin.position.set(0, bodyHeight + cabinHeight / 2 + 0.15, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Front Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    leftLight.position.set(-0.85, bodyHeight * 0.7 + 0.25, -bodyLength / 2 - 0.02);
    const rightLight = leftLight.clone();
    rightLight.position.x = 0.85;
    carGroup.add(leftLight, rightLight);

    // Rear Taillights (Glowing Red strip)
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tailStrip = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.8, 0.12, 0.1), tailMat);
    tailStrip.position.set(0, bodyHeight * 0.7 + 0.25, bodyLength / 2 + 0.02);
    carGroup.add(tailStrip);

    // Rear Aerodynamic Spoiler for Hypercars / Supercars
    if (catalogItem.category === 'Hypercar' || catalogItem.category === 'Supercar') {
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 });
      const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.9, 0.08, 0.45), wingMat);
      wing.position.set(0, bodyHeight + 0.65, bodyLength / 2 - 0.3);
      const leftStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), wingMat);
      leftStand.position.set(-0.7, bodyHeight + 0.45, bodyLength / 2 - 0.3);
      const rightStand = leftStand.clone();
      rightStand.position.x = 0.7;
      carGroup.add(wing, leftStand, rightStand);
    }

    // Spare Tire on Back for G-Wagon
    if (catalogItem.id === 'gwagon_amg') {
      const spareWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 })
      );
      spareWheel.rotation.x = Math.PI / 2;
      spareWheel.position.set(0, 1.1, bodyLength / 2 + 0.2);
      carGroup.add(spareWheel);
    }

    // 4 Wheels
    const wheelRadius = catalogItem.category === 'SUV' ? 0.55 : 0.45;
    const wheelWidth = 0.38;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });

    const wheelZOffset = bodyLength * 0.33;
    const wheelPositions = [
      [-bodyWidth / 2 - wheelWidth / 3, wheelRadius, wheelZOffset],
      [bodyWidth / 2 + wheelWidth / 3, wheelRadius, wheelZOffset],
      [-bodyWidth / 2 - wheelWidth / 3, wheelRadius, -wheelZOffset],
      [bodyWidth / 2 + wheelWidth / 3, wheelRadius, -wheelZOffset],
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.rotation.z = Math.PI / 2;
      wMesh.position.set(wx, wy, wz);
      // Rim cap
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      carGroup.add(wMesh, rim);
    });

    // 3D Floating Name/Price Tag
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 384;
    tagCanvas.height = 96;
    const tCtx = tagCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      tCtx.roundRect(8, 8, 368, 80, 16);
      tCtx.fill();
      tCtx.strokeStyle = car.ownerId ? '#38bdf8' : '#f59e0b';
      tCtx.lineWidth = 4;
      tCtx.stroke();

      tCtx.font = 'bold 26px monospace';
      tCtx.fillStyle = '#ffffff';
      tCtx.textAlign = 'center';
      tCtx.fillText(catalogItem.name.slice(0, 20), 192, 45);

      tCtx.font = 'bold 20px monospace';
      tCtx.fillStyle = car.ownerId ? '#38bdf8' : '#4ade80';
      const statusText = car.ownerId ? 'OWNED' : `$${car.price.toLocaleString()}`;
      tCtx.fillText(statusText, 192, 75);
    }
    const tagTexture = new THREE.CanvasTexture(tagCanvas);
    const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture, depthTest: false }));
    tagSprite.scale.set(3.8, 1, 1);
    tagSprite.position.set(0, bodyHeight + cabinHeight + 1.2, 0);
    carGroup.add(tagSprite);

    return carGroup;
  };

  // Create Offline Player 3D Avatar
  const createOfflineAvatarMesh = (player: OfflinePlayerAvatar): THREE.Group => {
    const group = new THREE.Group();
    group.position.set(player.x, 0, player.z);
    group.rotation.y = player.rotation;

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.7, 0.6), bodyMat);
    body.position.y = 1.75;
    group.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.7), headMat);
    head.position.y = 2.95;
    group.add(head);

    // Legs (Idle standing pose)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.45), legMat);
    leg1.position.set(-0.3, 0.7, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.3;
    group.add(leg1, leg2);

    // Floating 3D Status Badge
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 320;
    badgeCanvas.height = 80;
    const bCtx = badgeCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = 'rgba(30, 41, 59, 0.9)';
      bCtx.roundRect(8, 8, 304, 64, 12);
      bCtx.fill();
      bCtx.strokeStyle = '#94a3b8';
      bCtx.lineWidth = 3;
      bCtx.stroke();

      bCtx.font = 'bold 22px monospace';
      bCtx.fillStyle = '#f1f5f9';
      bCtx.textAlign = 'center';
      bCtx.fillText(player.name, 160, 36);

      bCtx.font = 'bold 16px monospace';
      bCtx.fillStyle = '#ef4444';
      const minsAgo = Math.max(1, Math.floor((Date.now() - player.lastSeen) / 60000));
      bCtx.fillText(`[OFFLINE ${minsAgo}m ago]`, 160, 58);
    }
    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false }));
    badgeSprite.scale.set(3, 0.8, 1);
    badgeSprite.position.set(0, 3.8, 0);
    group.add(badgeSprite);

    return group;
  };

  // Create 3D File Crate Tag with Price & Expiration
  const createFileTagSprite = (file: DroppedFileItem): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.roundRect(8, 8, 368, 112, 16);
      ctx.fill();
      ctx.strokeStyle = file.isPaid ? '#facc15' : '#ec4899';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Title
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = file.isPaid ? '#fde047' : '#f472b6';
      ctx.textAlign = 'center';
      const truncated = file.name.length > 17 ? file.name.slice(0, 15) + '..' : file.name;
      ctx.fillText(truncated, 192, 48);

      // Price & Claim limits
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#38bdf8';
      const priceTag = file.isPaid ? `PAID: $${file.price.toLocaleString()}` : 'FREE DROP';
      const claimsTag = file.maxClaims > 0 ? ` [${Math.max(0, file.maxClaims - (file.claimedCount || 0))} left]` : '';
      ctx.fillText(`${priceTag}${claimsTag}`, 192, 85);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.scale.set(4, 1.35, 1);
    sprite.position.set(0, 2.7, 0);
    return sprite;
  };

  // Spawn a 3D File Airdrop Crate
  const spawnFileCrate = (file: DroppedFileItem, dropFromSky: boolean = true) => {
    const scene = sim.current.scene;
    if (!scene) return;

    const crateGroup = new THREE.Group();
    crateGroup.position.set(file.x, dropFromSky ? 55 : 1, file.z);

    // Container
    const crateGeo = new THREE.BoxGeometry(2, 2, 2);
    const crateMat = new THREE.MeshStandardMaterial({
      color: file.isPaid ? 0x451a03 : 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const crateMesh = new THREE.Mesh(crateGeo, crateMat);
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    crateGroup.add(crateMesh);

    // Glowing Neon Edges
    const neonColor = file.isPaid ? 0xfacc15 : 0xec4899;
    const edgeGeo = new THREE.BoxGeometry(2.05, 0.15, 2.05);
    const neonMat = new THREE.MeshBasicMaterial({ color: neonColor });
    const e1 = new THREE.Mesh(edgeGeo, neonMat);
    e1.position.y = 0.85;
    const e2 = new THREE.Mesh(edgeGeo, neonMat);
    e2.position.y = -0.85;
    crateGroup.add(e1, e2);

    // Beacon Point Light
    const beaconLight = new THREE.PointLight(neonColor, 1.8, 14);
    beaconLight.position.set(0, 1.2, 0);
    crateGroup.add(beaconLight);

    // Floating Tag
    const tag = createFileTagSprite(file);
    crateGroup.add(tag);

    // Parachute
    let parachuteGroup: THREE.Group | undefined;
    if (dropFromSky) {
      parachuteGroup = new THREE.Group();
      parachuteGroup.position.set(0, 4.2, 0);

      const canopyGeo = new THREE.SphereGeometry(3.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const canopyMat = new THREE.MeshStandardMaterial({
        color: file.isPaid ? 0xf59e0b : 0xf43f5e,
        side: THREE.DoubleSide,
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      parachuteGroup.add(canopy);

      const cordMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const cordGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(angle) * 3, 0, Math.sin(angle) * 3),
          new THREE.Vector3(0, -3.8, 0),
        ]);
        parachuteGroup.add(new THREE.Line(cordGeo, cordMat));
      }
      crateGroup.add(parachuteGroup);
    }

    scene.add(crateGroup);
    sim.current.droppedCrates.push({ item: file, group: crateGroup, parachute: parachuteGroup, tagSprite: tag });
  };

  // Main Three.js Scene Setup & Architecture
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    sim.current.renderer = renderer;

    // 2. Scene with Warm Natural Daylight Sky
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7dd3fc); // Sky Blue
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.0028);
    sim.current.scene = scene;

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    sim.current.camera = camera;

    // 4. Sunlight & Environmental Lights
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x334155, 1.3);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    sunLight.position.set(100, 180, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    const d = 160;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 5. City Ground & Natural Asphalt Roads
    const { worldSize } = sim.current;
    const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const collisionBoxes: BuildingCollisionBox[] = [];

    // Helper: Build a Solid Room/Building with Real Door Opening & Collisions
    const buildSolidStructure = (
      x: number,
      z: number,
      w: number,
      d: number,
      h: number,
      wallColor: number,
      _doorX: number,
      _doorZ: number,
      doorWidth: number,
      title: string,
      hasGlassFront: boolean = false
    ) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // Floor
      const floorGeo = new THREE.PlaneGeometry(w, d);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.05;
      floor.receiveShadow = true;
      group.add(floor);

      // Roof
      const roofGeo = new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = h;
      roof.castShadow = true;
      group.add(roof);

      // Back Wall
      const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.6 });
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), wallMat);
      backWall.position.set(0, h / 2, -d / 2);
      backWall.castShadow = true;
      group.add(backWall);

      // Left Wall
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), wallMat);
      leftWall.position.set(-w / 2, h / 2, 0);
      leftWall.castShadow = true;
      group.add(leftWall);

      // Right Wall
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), wallMat);
      rightWall.position.set(w / 2, h / 2, 0);
      rightWall.castShadow = true;
      group.add(rightWall);

      // Front Wall with Doorway
      const frontMat = hasGlassFront
        ? new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.1 })
        : wallMat;

      const sideSegWidth = (w - doorWidth) / 2;
      const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(sideSegWidth, h, 0.4), frontMat);
      frontLeft.position.set(-w / 2 + sideSegWidth / 2, h / 2, d / 2);
      frontLeft.castShadow = true;

      const frontRight = new THREE.Mesh(new THREE.BoxGeometry(sideSegWidth, h, 0.4), frontMat);
      frontRight.position.set(w / 2 - sideSegWidth / 2, h / 2, d / 2);
      frontRight.castShadow = true;

      // Lintel over door
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, h - 3.2, 0.4), frontMat);
      lintel.position.set(0, 3.2 + (h - 3.2) / 2, d / 2);
      group.add(frontLeft, frontRight, lintel);

      // Illuminated Signboard over entrance
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 384;
      signCanvas.height = 80;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#0f172a';
        sCtx.fillRect(0, 0, 384, 80);
        sCtx.strokeStyle = '#facc15';
        sCtx.lineWidth = 4;
        sCtx.strokeRect(4, 4, 376, 72);

        sCtx.font = 'bold 28px monospace';
        sCtx.fillStyle = '#f8fafc';
        sCtx.textAlign = 'center';
        sCtx.fillText(title, 192, 48);
      }
      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.8), new THREE.MeshBasicMaterial({ map: signTex }));
      signMesh.position.set(0, h + 1, d / 2 + 0.3);
      group.add(signMesh);

      // Staircase leading to rooftop!
      const stairSteps = 12;
      const stepRise = h / stairSteps;
      const stepRun = 0.5;
      const stairMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
      for (let s = 0; s < stairSteps; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, stepRise, stepRun), stairMat);
        step.position.set(w / 2 + 1.0, s * stepRise + stepRise / 2, -d / 2 + s * stepRun);
        step.castShadow = true;
        group.add(step);
      }

      scene.add(group);

      // Perimeter wall collisions (leaving door opening and inside free)
      const wallThick = 0.6;
      // 1. Back wall
      collisionBoxes.push({
        minX: x - w / 2 - 0.2,
        maxX: x + w / 2 + 0.2,
        minZ: z - d / 2 - wallThick,
        maxZ: z - d / 2 + wallThick,
      });
      // 2. Left wall
      collisionBoxes.push({
        minX: x - w / 2 - wallThick,
        maxX: x - w / 2 + wallThick,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
      // 3. Right wall
      collisionBoxes.push({
        minX: x + w / 2 - wallThick,
        maxX: x + w / 2 + wallThick,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
      // 4. Front wall (left segment)
      const halfDoor = doorWidth / 2;
      collisionBoxes.push({
        minX: x - w / 2,
        maxX: x - halfDoor,
        minZ: z + d / 2 - wallThick,
        maxZ: z + d / 2 + wallThick,
      });
      // 5. Front wall (right segment)
      collisionBoxes.push({
        minX: x + halfDoor,
        maxX: x + w / 2,
        minZ: z + d / 2 - wallThick,
        maxZ: z + d / 2 + wallThick,
      });
    };

    // 1. Apex Motors Luxury Car Showroom (Coordinates X: 35, Z: -15)
    buildSolidStructure(35, -15, 28, 22, 6.5, 0x1e293b, 35, -4, 6.0, 'APEX MOTORS SHOWROOM', true);

    // Showroom Interior revolving podium car
    const podiumGeo = new THREE.CylinderGeometry(4.5, 4.8, 0.4, 24);
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(35, 0.2, -15);
    scene.add(podium);

    const showcaseCar = createDetailedCarMesh({
      id: 'showcase_chiron',
      catalogId: 'bugatti_chiron',
      name: 'Bugatti Chiron Showpiece',
      price: 2500000,
      x: 35,
      y: 0.4,
      z: -15,
      rotation: 0,
      speed: 0,
      color: 0x0284c7,
      isPlayerInside: false,
      ownerId: null,
    });
    showcaseCar.position.set(35, 0.4, -15);
    scene.add(showcaseCar);
    sim.current.showcasePodiumCar = showcaseCar;

    // 2. Vice State Reserve Bank & ATM (Coordinates X: 0, Z: -40)
    buildSolidStructure(0, -40, 24, 20, 8.0, 0x1e3a8a, 0, -30, 4.5, 'VICE RESERVE BANK');

    // Exterior ATM Machine
    const atmGroup = new THREE.Group();
    const atmBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8 })
    );
    atmBody.position.set(0, 1.1, -29.2);
    atmGroup.add(atmBody);

    const atmScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    atmScreen.position.set(0, 1.4, -28.78);
    atmGroup.add(atmScreen);
    scene.add(atmGroup);

    // 3. Thattukada ("നാടൻ തട്ടുകട" - Kerala Street Food Stall) (Coordinates X: -30, Z: 20)
    const thattukadaGroup = new THREE.Group();
    thattukadaGroup.position.set(-30, 0, 20);

    // Wooden stall counter
    const counterGeo = new THREE.BoxGeometry(5.0, 1.2, 2.2);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, 0.6, 0);
    thattukadaGroup.add(counter);

    // Striped Canopy Awning (Red & White)
    const canopyGeo = new THREE.ConeGeometry(3.6, 1.2, 4);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 3.2, 0);
    canopy.rotation.y = Math.PI / 4;
    thattukadaGroup.add(canopy);

    // Awning support poles
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    for (let px of [-2.2, 2.2]) {
      for (let pz of [-0.9, 0.9]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat);
        pole.position.set(px, 1.4, pz);
        thattukadaGroup.add(pole);
      }
    }

    // Steaming Samovar / Chai Kettle
    const samovarGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12);
    const samovarMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 });
    const samovar = new THREE.Mesh(samovarGeo, samovarMat);
    samovar.position.set(-1.2, 1.6, 0);
    thattukadaGroup.add(samovar);

    // Wooden Benches for customers
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.45, 0.8), benchMat);
    bench1.position.set(0, 0.25, 2.5);
    thattukadaGroup.add(bench1);

    // Nameboard: "നാടൻ തട്ടുകട"
    const thattukadaCanvas = document.createElement('canvas');
    thattukadaCanvas.width = 384;
    thattukadaCanvas.height = 80;
    const tCtx = thattukadaCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = '#b91c1c';
      tCtx.fillRect(0, 0, 384, 80);
      tCtx.font = 'bold 26px monospace';
      tCtx.fillStyle = '#fef08a';
      tCtx.textAlign = 'center';
      tCtx.fillText('നാടൻ തട്ടുകട // CHAI STALL', 192, 48);
    }
    const tSign = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 1.1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(thattukadaCanvas) })
    );
    tSign.position.set(0, 2.6, 1.15);
    thattukadaGroup.add(tSign);
    scene.add(thattukadaGroup);

    // 4. Colorful Villas, Houses & City Buildings
    const houseColors = [0xd97706, 0x059669, 0x2563eb, 0x7c3aed, 0xdb2777, 0x475569];
    const shopNames = ['CYBER BAZAAR', 'MALABAR GOLD', '24/7 FRESH MART', 'CAFE ROYALE', 'CLOUD LOUNGE'];

    const step = 48;
    for (let x = -worldSize / 2 + 30; x < worldSize / 2 - 30; x += step) {
      for (let z = -worldSize / 2 + 30; z < worldSize / 2 - 30; z += step) {
        // Skip special district slots
        if (Math.hypot(x - 35, z - (-15)) < 30) continue;
        if (Math.hypot(x - 0, z - (-40)) < 30) continue;
        if (Math.hypot(x - (-30), z - 20) < 30) continue;
        if (Math.hypot(x, z) < 25) continue; // Plaza

        const h = 14 + Math.random() * 22;
        const color = houseColors[Math.floor(Math.random() * houseColors.length)];
        const title = shopNames[Math.floor(Math.random() * shopNames.length)];
        buildSolidStructure(x, z, 26, 22, h, color, x, z + 11, 4.5, title);
      }
    }
    sim.current.collisionBoxes = collisionBoxes;

    // Green Trees along streets
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
    for (let i = 0; i < 40; i++) {
      const tx = (Math.random() - 0.5) * (worldSize - 60);
      const tz = (Math.random() - 0.5) * (worldSize - 60);
      if (Math.hypot(tx, tz) < 20) continue;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 6, 8), treeTrunkMat);
      trunk.position.y = 3;
      trunk.castShadow = true;
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), treeLeavesMat);
      foliage.position.y = 7;
      foliage.castShadow = true;
      tree.add(trunk, foliage);
      tree.position.set(tx, 0, tz);
      scene.add(tree);
    }

    // Streetlamps with warm light
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let x = -worldSize / 2 + 25; x < worldSize / 2; x += 50) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 8), lampMat);
      pole.position.y = 4;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.4), lampMat);
      head.position.set(0, 8.1, 0.5);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bulbMat);
      bulb.position.set(0, 7.9, 0.8);
      lamp.add(pole, head, bulb);
      lamp.position.set(x, 0, 8);
      scene.add(lamp);
    }

    // 6. In-Game 3D Billboard Structures
    const billboardMeshesMap: { [id: string]: THREE.Mesh } = {};
    const textureLoader = new THREE.TextureLoader();

    billboardsList.forEach((b) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, b.y, b.z);
      bGroup.rotation.y = b.rotationY;

      // Heavy Outer Metal Frame
      const frameGeo = new THREE.BoxGeometry(b.width + 0.8, b.height + 0.8, 0.4);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.85, roughness: 0.2 });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      bGroup.add(frameMesh);

      // Ad Canvas Screen
      const screenGeo = new THREE.PlaneGeometry(b.width, b.height);
      const texture = textureLoader.load(b.imageUrl);
      const screenMat = new THREE.MeshBasicMaterial({ map: texture });
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.z = 0.22;
      bGroup.add(screenMesh);
      billboardMeshesMap[b.id] = screenMesh;

      // Reverse Back Face
      const backMesh = new THREE.Mesh(screenGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      backMesh.position.z = -0.22;
      backMesh.rotation.y = Math.PI;
      bGroup.add(backMesh);

      // Back Scaffolding Truss Structure
      const trussGeo = new THREE.BoxGeometry(b.width * 0.92, b.height * 0.85, 0.3);
      const trussMat = new THREE.MeshStandardMaterial({ color: 0x475569, wireframe: true });
      const truss = new THREE.Mesh(trussGeo, trussMat);
      truss.position.z = -0.35;
      bGroup.add(truss);

      // Supporting Steel Pylon Columns if roadside / field / junction
      if (b.zone === 'Roadside' || b.zone === 'Field' || b.zone === 'Junction') {
        const poleHeight = b.y;
        const poleGeo = new THREE.CylinderGeometry(0.35, 0.45, poleHeight, 12);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });

        const p1 = new THREE.Mesh(poleGeo, poleMat);
        p1.position.set(-b.width * 0.35, -poleHeight / 2, 0);
        p1.castShadow = true;

        const p2 = p1.clone();
        p2.position.x = b.width * 0.35;
        bGroup.add(p1, p2);
      }

      scene.add(bGroup);
    });
    sim.current.billboardMeshes = billboardMeshesMap;

    // 7. Active Player Group
    const playerGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 1.8, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 1.9;
    bodyMesh.castShadow = true;
    playerGroup.add(bodyMesh);

    // Head
    const headGeo = new THREE.BoxGeometry(0.7, 0.75, 0.7);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.9 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 3.1;
    headMesh.castShadow = true;
    playerGroup.add(headMesh);

    // Sunglasses
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    glasses.position.set(0, 3.15, -0.32);
    playerGroup.add(glasses);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.45, 1.4, 0.5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.35, 0.7, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.35, 0.7, 0);
    rightLeg.castShadow = true;
    playerGroup.add(leftLeg, rightLeg);
    sim.current.playerLeftLeg = leftLeg;
    sim.current.playerRightLeg = rightLeg;

    // Arms
    const armGeo = new THREE.BoxGeometry(0.35, 1.4, 0.4);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffedd5 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.85, 1.8, 0);
    leftArm.castShadow = true;
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.85, 1.8, 0);
    rightArm.castShadow = true;
    playerGroup.add(leftArm, rightArm);
    sim.current.playerLeftArm = leftArm;
    sim.current.playerRightArm = rightArm;

    // Resume player position
    playerGroup.position.set(user.x || 0, 0, user.z || 0);
    scene.add(playerGroup);
    sim.current.playerGroup = playerGroup;

    // 7. Spawn Offline Player Avatars
    const offlineList = getOfflinePlayers().filter((p) => p.id !== user.id);
    offlineList.forEach((offlineP) => {
      const mesh = createOfflineAvatarMesh(offlineP);
      scene.add(mesh);
      sim.current.offlineMeshes.push({ player: offlineP, group: mesh });
    });
    setOfflinePlayersList(offlineList);

    // 8. Spawn Initial Showcase & Dealership Cars
    const initialCars: SpawnedCar[] = [
      {
        id: 'starter_car_player',
        catalogId: 'ford_mustang',
        name: 'Ford Mustang GT (Player Starter)',
        price: 0,
        x: 6,
        y: 0,
        z: 4,
        rotation: 0.2,
        speed: 0,
        color: 0xdc2626,
        isPlayerInside: false,
        ownerId: user.id,
        ownerName: user.name,
      },
      {
        id: 'car_initial_porsche',
        catalogId: 'porsche_911_gt3',
        name: 'Porsche 911 GT3 RS',
        price: 950000,
        x: 48,
        y: 0,
        z: -15,
        rotation: 0,
        speed: 0,
        color: 0xd97706,
        isPlayerInside: false,
        ownerId: null,
      },
      {
        id: 'car_initial_lambo',
        catalogId: 'lambo_aventador',
        name: 'Lamborghini Aventador SVJ',
        price: 1800000,
        x: 48,
        y: 0,
        z: -22,
        rotation: 0,
        speed: 0,
        color: 0xf59e0b,
        isPlayerInside: false,
        ownerId: null,
      },
      {
        id: 'car_initial_gwagon',
        catalogId: 'gwagon_amg',
        name: 'Mercedes-AMG G63 G-Wagon',
        price: 650000,
        x: 12,
        y: 0,
        z: -38,
        rotation: Math.PI / 2,
        speed: 0,
        color: 0x27272a,
        isPlayerInside: false,
        ownerId: null,
      },
    ];

    initialCars.forEach((c) => {
      const mesh = createDetailedCarMesh(c);
      mesh.position.set(c.x, 0, c.z);
      scene.add(mesh);
      c.mesh = mesh;
    });
    sim.current.cars = initialCars;
    setCarsList(initialCars);

    // 9. Load Dropped Files
    loadDroppedFiles().then((saved) => {
      if (saved && saved.length > 0) {
        setDroppedFilesList(saved);
        saved.forEach((f) => spawnFileCrate(f, false));
      } else {
        // Initial Sample Intel Drop
        const sampleFile: DroppedFileItem = {
          id: 'starter_city_guide',
          name: 'vice_city_protocol.txt',
          size: 3840,
          type: 'text/plain',
          textContent:
            'VICE CITY CITIZEN HANDBOOK:\n\n1. Visit Apex Motors (X:35, Z:-15) to purchase or sell luxury cars.\n2. Collect $5,000 allowance at the Vice Bank ATM (X:0, Z:-40).\n3. Stop by the Thattukada (X:-30, Z:20) for tea.\n4. Drop any file from your PC as Free or Paid airdrops with timers & limits!\n5. When citizens go offline, their avatar stays at that spot.',
          x: 4,
          y: 1,
          z: 8,
          timestamp: Date.now(),
          isPaid: false,
          price: 0,
          creatorId: 'system',
          creatorName: 'City Mayor',
          maxClaims: 20,
          claimedCount: 2,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
        };
        saveDroppedFile(sampleFile);
        setDroppedFilesList([sampleFile]);
        spawnFileCrate(sampleFile, false);
      }
    });

    // 10. Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      sim.current.keys[k] = true;
      if (e.code) {
        sim.current.keys[e.code.toLowerCase()] = true;
      }

      // Enter / Exit Vehicle [F]
      if (k === 'f' || e.code === 'KeyF') {
        toggleVehicleEntry();
      }

      // Interact [E] (File Crate, ATM, Showroom)
      if (k === 'e' || e.code === 'KeyE') {
        handleContextInteract();
      }

      // Car Horn [H]
      if ((k === 'h' || e.code === 'KeyH') && sim.current.activeVehicle) {
        soundFx.playCarHorn();
      }

      // Secret Admin Hotkey [Ctrl + Shift + A]
      if (e.ctrlKey && e.shiftKey && (k === 'a' || e.code === 'KeyA')) {
        e.preventDefault();
        soundFx.playClick();
        setIsAdminModalOpen(true);
      }
    };

    // Check if loaded via secret admin URL parameter (?admin=true or #admin)
    const checkAdminUrl = () => {
      if (
        window.location.search.includes('admin=true') ||
        window.location.hash.toLowerCase().includes('admin')
      ) {
        setIsAdminModalOpen(true);
      }
    };
    checkAdminUrl();
    window.addEventListener('hashchange', checkAdminUrl);
    window.addEventListener('popstate', checkAdminUrl);

    const onKeyUp = (e: KeyboardEvent) => {
      sim.current.keys[e.key.toLowerCase()] = false;
      if (e.code) {
        sim.current.keys[e.code.toLowerCase()] = false;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) sim.current.mouseDown = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) sim.current.mouseDown = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === container || e.buttons > 0) {
        const sensitivity = 0.003;
        sim.current.yaw -= e.movementX * sensitivity;
        sim.current.pitch -= e.movementY * sensitivity;
        sim.current.pitch = Math.max(-0.4, Math.min(1.2, sim.current.pitch));
      }
    };

    const onCanvasClick = () => {
      if (!document.pointerLockElement) {
        container.requestPointerLock?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onCanvasClick);

    // Resize
    const onResize = () => {
      if (!mountRef.current || !sim.current.renderer || !sim.current.camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      sim.current.camera.aspect = w / h;
      sim.current.camera.updateProjectionMatrix();
      sim.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 11. 60 FPS Game Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);

      // Rotate podium showcase car slowly
      if (sim.current.showcasePodiumCar) {
        sim.current.showcasePodiumCar.rotation.y += 0.008;
      }

      // Update Player or Vehicle
      updatePlayerAndVehicle(delta);

      // Update Parachuting Crates
      updateCrates(delta);

      // Camera Follow
      updateCamera();

      // Render
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onCanvasClick);
      window.removeEventListener('resize', onResize);
      soundFx.stopCarEngine();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Context Interaction [E]
  const handleContextInteract = () => {
    const s = sim.current;
    if (!s.playerGroup) return;
    const pPos = s.playerGroup.position;

    // Check ATM near bank (X: 0, Z: -29)
    if (Math.hypot(pPos.x - 0, pPos.z - (-29)) < 4.0) {
      soundFx.playAtmChime();
      setUser((prev) => {
        const nextCash = prev.cash + 5000;
        showNotification('COLLECTED $5,000 FROM STATE BANK ATM!');
        return { ...prev, cash: nextCash };
      });
      return;
    }

    // Check Showroom interior (X: 35, Z: -15)
    if (Math.hypot(pPos.x - 35, pPos.z - (-15)) < 12.0) {
      soundFx.playClick();
      setIsShowroomOpen(true);
      return;
    }

    // Check Thattukada (X: -30, Z: 20)
    if (Math.hypot(pPos.x - (-30), pPos.z - 20) < 5.0) {
      soundFx.playClick();
      showNotification('ENJOYING HOT MALABAR TEA & SNACKS! VIBES +100 ☕');
      return;
    }

    // Check File Crate
    const nearCrate = s.droppedCrates.find(
      (c) => Math.hypot(c.group.position.x - pPos.x, c.group.position.z - pPos.z) < 4.0
    );
    if (nearCrate) {
      soundFx.playClick();
      setSelectedFileForModal(nearCrate.item);
    }
  };

  // Enter / Test Drive / Buy / Exit Vehicle [F]
  const toggleVehicleEntry = () => {
    const s = sim.current;
    if (s.activeVehicle) {
      // Exit Car
      const car = s.activeVehicle;
      car.isPlayerInside = false;
      car.speed = 0;
      soundFx.playCarDoor();
      soundFx.stopCarEngine();
      s.activeVehicle = null;
      setInVehicle(false);
      setVehicleSpeed(0);

      if (s.playerGroup) {
        s.playerGroup.visible = true;
        // Position player next to car door
        const sideOffset = new THREE.Vector3(2.5, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation);
        s.playerGroup.position.set(car.x + sideOffset.x, 0, car.z + sideOffset.z);
      }
      showNotification('EXITED VEHICLE');
    } else {
      if (!s.playerGroup) return;
      const pPos = s.playerGroup.position;

      // Find nearest car within generous 7.5 units
      let nearest: SpawnedCar | null = null;
      let minDist = 7.5;
      for (const c of s.cars) {
        const dist = Math.hypot(c.x - pPos.x, c.z - pPos.z);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }

      if (nearest) {
        const isOwned = nearest.ownerId === user.id;
        if (!isOwned && nearest.ownerId === null) {
          showNotification(`TEST DRIVING ${nearest.name}! (Visit Showroom to permanently purchase)`);
        } else if (nearest.ownerId !== null && !isOwned) {
          showNotification(`BORROWED ${nearest.name} (Citizen Car)`);
        } else {
          showNotification(`DRIVING YOUR ${nearest.name}!`);
        }

        nearest.isPlayerInside = true;
        s.activeVehicle = nearest;
        s.playerGroup.visible = false;
        soundFx.playCarDoor();
        soundFx.startCarEngine();
        setInVehicle(true);
      } else {
        showNotification('WALK CLOSER TO A CAR AND PRESS [F] OR TAP DRIVE BUTTON');
      }
    }
  };

  // Update Player & Vehicle Movement with Wall Collisions
  const updatePlayerAndVehicle = (delta: number) => {
    const s = sim.current;
    if (!s.playerGroup) return;

    if (s.activeVehicle) {
      // Driving Physics
      const car = s.activeVehicle;
      const catalogItem = FAMOUS_CARS.find((c) => c.id === car.catalogId) || FAMOUS_CARS[0];
      const maxSpeed = catalogItem.topSpeed || 85;
      const accelRate = (catalogItem.acceleration || 35) * 1.6 * delta;
      const turnSpeed = 2.6 * delta;

      const isGas = s.keys['w'] || s.keys['keyw'] || s.keys['arrowup'] || virtualDriveState.current.gas;
      const isReverse = s.keys['s'] || s.keys['keys'] || s.keys['arrowdown'] || virtualDriveState.current.reverse;
      const isLeft = s.keys['a'] || s.keys['keya'] || s.keys['arrowleft'] || virtualDriveState.current.steerLeft;
      const isRight = s.keys['d'] || s.keys['keyd'] || s.keys['arrowright'] || virtualDriveState.current.steerRight;
      const isHandbrake = s.keys[' '] || s.keys['space'] || virtualDriveState.current.handbrake;

      if (isGas) {
        const initialBoost = Math.abs(car.speed) < 2 ? 15 * delta : 0;
        car.speed = Math.min(maxSpeed, car.speed + accelRate + initialBoost);
      } else if (isReverse) {
        if (car.speed > 2) {
          car.speed = Math.max(0, car.speed - accelRate * 2.2);
        } else {
          car.speed = Math.max(-28, car.speed - accelRate * 1.3);
        }
      } else {
        car.speed *= 0.982;
        if (Math.abs(car.speed) < 0.1) car.speed = 0;
      }

      let driftFactor = 1.0;
      if (isHandbrake) {
        car.speed *= 0.91;
        driftFactor = 1.8;
      }

      // Steering
      if (Math.abs(car.speed) > 0.2) {
        const dir = car.speed >= 0 ? 1 : -1;
        if (isLeft) car.rotation += turnSpeed * driftFactor * dir;
        if (isRight) car.rotation -= turnSpeed * driftFactor * dir;
      }

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation);
      let nextCarX = car.x + forward.x * car.speed * delta;
      let nextCarZ = car.z + forward.z * car.speed * delta;

      // Solid Wall Collision Detection for vehicle
      let hitWall = false;
      for (const box of s.collisionBoxes) {
        if (nextCarX >= box.minX && nextCarX <= box.maxX && nextCarZ >= box.minZ && nextCarZ <= box.maxZ) {
          hitWall = true;
          break;
        }
      }

      if (hitWall) {
        car.speed = -car.speed * 0.3;
      } else {
        car.x = nextCarX;
        car.z = nextCarZ;
      }

      // Map bounds clamping
      car.x = THREE.MathUtils.clamp(car.x, -s.worldSize / 2 + 10, s.worldSize / 2 - 10);
      car.z = THREE.MathUtils.clamp(car.z, -s.worldSize / 2 + 10, s.worldSize / 2 - 10);

      if (car.mesh) {
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.rotation;
      }
      s.playerGroup.position.set(car.x, 0, car.z);

      soundFx.updateCarEngine(car.speed / maxSpeed);
      setVehicleSpeed(Math.abs(car.speed / maxSpeed));
      setPlayerCoord({ x: car.x, z: car.z, heading: car.rotation });
      setInteractPrompt('[F] EXIT VEHICLE | [W/S] DRIVE | [A/D] STEER | [SPACE] DRIFT | [H] HORN');
    } else {
      // Walking / Sprinting
      const speed = (s.keys['shift'] ? 22 : 12) * delta;
      const moveVec = new THREE.Vector3();

      if (s.keys['w'] || s.keys['keyw'] || s.keys['arrowup']) moveVec.z -= 1;
      if (s.keys['s'] || s.keys['keys'] || s.keys['arrowdown']) moveVec.z += 1;
      if (s.keys['a'] || s.keys['keya'] || s.keys['arrowleft']) moveVec.x -= 1;
      if (s.keys['d'] || s.keys['keyd'] || s.keys['arrowright']) moveVec.x += 1;

      const isMoving = moveVec.lengthSq() > 0;
      if (isMoving) {
        moveVec.normalize();
        moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw);

        let nextX = s.playerGroup.position.x + moveVec.x * speed;
        let nextZ = s.playerGroup.position.z + moveVec.z * speed;

        // Solid Wall Collision Detection
        for (const box of s.collisionBoxes) {
          if (nextX >= box.minX && nextX <= box.maxX && nextZ >= box.minZ && nextZ <= box.maxZ) {
            // Check if player is approaching door corridor (allow entry through doorways)
            const isNearDoor =
              Math.hypot(nextX - 35, nextZ - (-4)) < 3.2 || // Showroom door
              Math.hypot(nextX - 0, nextZ - (-30)) < 2.5; // Bank door

            if (!isNearDoor) {
              // Revert position to prevent walking through solid wall
              nextX = s.playerGroup.position.x;
              nextZ = s.playerGroup.position.z;
              break;
            }
          }
        }

        s.playerGroup.position.x = nextX;
        s.playerGroup.position.z = nextZ;

        // Limb animation
        const walkCycle = performance.now() * 0.012;
        if (s.playerLeftLeg && s.playerRightLeg && s.playerLeftArm && s.playerRightArm) {
          s.playerLeftLeg.rotation.x = Math.sin(walkCycle) * 0.6;
          s.playerRightLeg.rotation.x = -Math.sin(walkCycle) * 0.6;
          s.playerLeftArm.rotation.x = -Math.sin(walkCycle) * 0.5;
          s.playerRightArm.rotation.x = Math.sin(walkCycle) * 0.5;
        }

        if (Math.sin(walkCycle) > 0.95) {
          soundFx.playFootstep(!!s.keys['shift']);
        }
      } else {
        if (s.playerLeftLeg && s.playerRightLeg && s.playerLeftArm && s.playerRightArm) {
          s.playerLeftLeg.rotation.x = 0;
          s.playerRightLeg.rotation.x = 0;
          s.playerLeftArm.rotation.x = 0;
          s.playerRightArm.rotation.x = 0;
        }
      }

      // Jump
      if ((s.keys[' '] || s.keys['space']) && s.isGrounded) {
        s.playerVelY = 12;
        s.isGrounded = false;
        soundFx.playJump();
      }

      if (!s.isGrounded) {
        s.playerVelY -= 32 * delta;
        s.playerGroup.position.y += s.playerVelY * delta;
        if (s.playerGroup.position.y <= 0) {
          s.playerGroup.position.y = 0;
          s.playerVelY = 0;
          s.isGrounded = true;
        }
      }

      s.playerGroup.rotation.y = s.yaw;

      // Check context prompts within generous range
      const pPos = s.playerGroup.position;
      const nearCar = s.cars.find((c) => Math.hypot(c.x - pPos.x, c.z - pPos.z) < 7.5);
      const nearCrate = s.droppedCrates.find(
        (c) => Math.hypot(c.group.position.x - pPos.x, c.group.position.z - pPos.z) < 4.0
      );
      const nearAtm = Math.hypot(pPos.x - 0, pPos.z - (-29)) < 3.8;
      const nearShowroom = Math.hypot(pPos.x - 35, pPos.z - (-15)) < 10.0;
      const nearThattukada = Math.hypot(pPos.x - (-30), pPos.z - 20) < 4.5;

      if (nearCar) {
        const isOwned = nearCar.ownerId === user.id;
        if (isOwned) {
          setInteractPrompt(`[F] DRIVE YOUR ${nearCar.name} 🚗`);
        } else if (nearCar.ownerId === null) {
          setInteractPrompt(`[F] DRIVE / TEST DRIVE: ${nearCar.name} ($${nearCar.price.toLocaleString()})`);
        } else {
          setInteractPrompt(`[F] DRIVE ${nearCar.name} (Citizen Car)`);
        }
      } else if (nearCrate) {
        const label = nearCrate.item.isPaid
          ? `[E] BUY INTEL: ${nearCrate.item.name} ($${nearCrate.item.price})`
          : `[E] OPEN FREE AIRDROP: ${nearCrate.item.name}`;
        setInteractPrompt(label);
      } else if (nearAtm) {
        setInteractPrompt('[E] WITHDRAW $5,000 BANK ALLOWANCE');
      } else if (nearShowroom) {
        setInteractPrompt('[E] APEX MOTORS SHOWROOM & DEALERSHIP');
      } else if (nearThattukada) {
        setInteractPrompt('[E] ORDER TEA & SNACKS (തട്ടുകട)');
      } else {
        setInteractPrompt(null);
      }

      setPlayerCoord({ x: pPos.x, z: pPos.z, heading: s.yaw });
    }
  };

  // Update Crates & Parachutes
  const updateCrates = (delta: number) => {
    const s = sim.current;
    const now = Date.now();

    for (let i = s.droppedCrates.length - 1; i >= 0; i--) {
      const crate = s.droppedCrates[i];

      // Check Expiration
      if (crate.item.expiresAt && now > crate.item.expiresAt) {
        s.scene?.remove(crate.group);
        s.droppedCrates.splice(i, 1);
        deleteDroppedFile(crate.item.id);
        setDroppedFilesList((prev) => prev.filter((f) => f.id !== crate.item.id));
        continue;
      }

      // Parachute descent
      if (crate.group.position.y > 1) {
        crate.group.position.y -= (crate.item.fallSpeed || 0.4) * 45 * delta;
        if (crate.parachute) {
          crate.parachute.rotation.z = Math.sin(performance.now() * 0.003) * 0.15;
        }

        if (crate.group.position.y <= 1) {
          crate.group.position.y = 1;
          soundFx.playAirdropTouchdown();
          if (crate.parachute) {
            crate.group.remove(crate.parachute);
            crate.parachute = undefined;
          }
        }
      }
    }
  };

  // Camera Follow (with smooth GTA Chase Cam for vehicles)
  const updateCamera = () => {
    const s = sim.current;
    if (!s.camera || !s.playerGroup) return;

    const pPos = s.playerGroup.position;
    const isDrive = !!s.activeVehicle;

    if (isDrive && s.activeVehicle) {
      // Smoothly align camera yaw behind vehicle orientation when driving
      if (Math.abs(s.activeVehicle.speed) > 1.0) {
        let angleDiff = THREE.MathUtils.euclideanModulo(s.activeVehicle.rotation - s.yaw + Math.PI, Math.PI * 2) - Math.PI;
        s.yaw += angleDiff * 0.06;
      }
    }

    const camDist = isDrive ? 10.5 : 5.8;
    const camHeight = isDrive ? 4.2 : 2.6;

    const cosPitch = Math.cos(s.pitch);
    const sinPitch = Math.sin(s.pitch);
    const sinYaw = Math.sin(s.yaw);
    const cosYaw = Math.cos(s.yaw);

    const targetPos = new THREE.Vector3(
      pPos.x + sinYaw * cosPitch * camDist,
      pPos.y + camHeight + sinPitch * camDist,
      pPos.z + cosYaw * cosPitch * camDist
    );

    s.camera.position.lerp(targetPos, isDrive ? 0.12 : 0.18);
    s.camera.lookAt(new THREE.Vector3(pPos.x, pPos.y + (isDrive ? 1.6 : 1.7), pPos.z));
  };

  // Drag and Drop Incoming File Handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPendingFileForDrop(e.dataTransfer.files[0]);
      setIsDropConfigOpen(true);
    }
  };

  // Confirm Airdrop Deploy
  const handleConfirmAirdrop = async (config: {
    isPaid: boolean;
    price: number;
    maxClaims: number;
    expiresInMinutes: number | null;
  }) => {
    if (!pendingFileForDrop) return;
    const rawFile = pendingFileForDrop;

    let dataUrl: string | undefined;
    let textContent: string | undefined;

    if (rawFile.type.startsWith('image/') || rawFile.type.startsWith('audio/')) {
      dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(rawFile);
      });
    } else if (rawFile.type.startsWith('text/') || rawFile.size < 200000) {
      textContent = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(rawFile);
      });
    }

    const pGroup = sim.current.playerGroup;
    let dropX = 0;
    let dropZ = 0;
    if (pGroup) {
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), sim.current.yaw);
      dropX = pGroup.position.x + forward.x * 8;
      dropZ = pGroup.position.z + forward.z * 8;
    }

    const newItem: DroppedFileItem = {
      id: 'drop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: rawFile.name,
      size: rawFile.size,
      type: rawFile.type || 'application/octet-stream',
      dataUrl,
      textContent,
      x: dropX,
      y: 1,
      z: dropZ,
      timestamp: Date.now(),
      isPaid: config.isPaid,
      price: config.price,
      creatorId: user.id,
      creatorName: user.name,
      maxClaims: config.maxClaims,
      claimedCount: 0,
      expiresAt: config.expiresInMinutes ? Date.now() + config.expiresInMinutes * 60000 : null,
      isDescending: true,
      fallSpeed: 0.35,
    };

    await saveDroppedFile(newItem);
    setDroppedFilesList((prev) => [...prev, newItem]);
    spawnFileCrate(newItem, true);
    setPendingFileForDrop(null);
    showNotification(`PARACHUTE AIRDROP DEPLOYED: ${newItem.name}`);
  };

  // Claim Download Action (Payment deduction if Paid drop)
  const handleClaimFileDownload = (file: DroppedFileItem): boolean => {
    const isCreator = file.creatorId === user.id;

    if (file.isPaid && !isCreator) {
      if (user.cash < file.price) {
        showNotification(`INSUFFICIENT FUNDS! REQUIRES $${file.price.toLocaleString()}`);
        return false;
      }

      // Deduct cash from downloader
      setUser((prev) => ({
        ...prev,
        cash: prev.cash - file.price,
      }));
      showNotification(`PAID $${file.price.toLocaleString()} TO ACCESS INTEL`);
    }

    // Process claim count limit in IndexedDB
    claimFileDownload(file.id).then((res) => {
      if (res.isExpired) {
        // Remove crate from 3D world as claim limit is exhausted
        const cObj = sim.current.droppedCrates.find((c) => c.item.id === file.id);
        if (cObj && sim.current.scene) {
          sim.current.scene.remove(cObj.group);
          sim.current.droppedCrates = sim.current.droppedCrates.filter((c) => c.item.id !== file.id);
        }
        setDroppedFilesList((prev) => prev.filter((f) => f.id !== file.id));
        showNotification('AIRDROP CLAIM LIMIT REACHED: CRATE RETIRED');
      }
    });

    return true;
  };

  // Delete File Crate
  const handleDeleteDroppedFile = async (id: string) => {
    await deleteDroppedFile(id);
    const cObj = sim.current.droppedCrates.find((c) => c.item.id === id);
    if (cObj && sim.current.scene) {
      sim.current.scene.remove(cObj.group);
      sim.current.droppedCrates = sim.current.droppedCrates.filter((c) => c.item.id !== id);
    }
    setDroppedFilesList((prev) => prev.filter((f) => f.id !== id));
    showNotification('AIRDROP CRATE REMOVED');
  };

  // Admin Import Car Action
  const handleImportCar = (newCar: SpawnedCar) => {
    const mesh = createDetailedCarMesh(newCar);
    mesh.position.set(newCar.x, 0, newCar.z);
    sim.current.scene?.add(mesh);
    newCar.mesh = mesh;

    sim.current.cars.push(newCar);
    setCarsList([...sim.current.cars]);
    showNotification(`ADMIN IMPORTED ${newCar.name} TO MAP!`);
  };

  // Showroom Buy Car Action
  const handleBuyShowroomCar = (carId: string) => {
    const car = sim.current.cars.find((c) => c.id === carId);
    if (!car) return;

    if (user.cash < car.price) {
      showNotification('INSUFFICIENT FUNDS TO BUY THIS CAR!');
      return;
    }

    car.ownerId = user.id;
    car.ownerName = user.name;
    setUser((prev) => ({
      ...prev,
      cash: prev.cash - car.price,
      ownedCarIds: [...prev.ownedCarIds, car.id],
    }));

    setCarsList([...sim.current.cars]);
    showNotification(`PURCHASED ${car.name}! YOU NOW OWN THIS VEHICLE`);
  };

  // Showroom Sell Car Action (70% buyback)
  const handleSellShowroomCar = (carId: string) => {
    const car = sim.current.cars.find((c) => c.id === carId);
    if (!car || car.ownerId !== user.id) return;

    const refund = Math.round(car.price * 0.7);
    car.ownerId = null;
    car.ownerName = undefined;

    setUser((prev) => ({
      ...prev,
      cash: prev.cash + refund,
      ownedCarIds: prev.ownedCarIds.filter((id) => id !== carId),
    }));

    setCarsList([...sim.current.cars]);
    showNotification(`SOLD ${car.name} BACK TO SHOWROOM FOR +$${refund.toLocaleString()}`);
  };

  // Update Billboard Ad in 3D Scene & Storage
  const handleUpdateBillboard = (id: string, update: { imageUrl: string; sponsorName: string; headline: string }) => {
    const updated = updateBillboard(id, update);
    setBillboardsList(updated);

    const screenMesh = sim.current.billboardMeshes[id];
    if (screenMesh) {
      const loader = new THREE.TextureLoader();
      loader.load(update.imageUrl, (tex) => {
        screenMesh.material = new THREE.MeshBasicMaterial({ map: tex });
      });
    }
    showNotification('BILLBOARD AD DEPLOYED TO CITY!');
  };

  // Virtual Driving Control Handler (Screen Buttons)
  const handleDriveControl = (action: DriveControlAction, isPressed: boolean) => {
    if (action === 'exit' && isPressed) {
      toggleVehicleEntry();
      return;
    }
    if (action === 'horn' && isPressed) {
      soundFx.playCarHorn();
      return;
    }
    if (action in virtualDriveState.current) {
      (virtualDriveState.current as any)[action] = isPressed;
    }
  };

  return (
    <div
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none cursor-default"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setPendingFileForDrop(e.target.files[0]);
            setIsDropConfigOpen(true);
          }
        }}
      />

      {/* HUD Overlay */}
      <GtaHud
        user={user}
        inVehicle={inVehicle}
        vehicleSpeed={vehicleSpeed}
        interactPrompt={interactPrompt}
        notification={notification}
        isDraggingFile={isDraggingFile}
        onOpenControls={() => setIsControlsOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenShowroomModal={() => setIsShowroomOpen(true)}
        onDropFileTrigger={() => fileInputRef.current?.click()}
        onCollectAtmBonus={() => {
          setUser((prev) => ({ ...prev, cash: prev.cash + 5000 }));
          showNotification('COLLECTED $5,000 BANK ALLOWANCE!');
        }}
        isMuted={isMuted}
        onToggleMute={() => {
          const m = soundFx.toggleMute();
          setIsMuted(m);
          showNotification(m ? 'AUDIO MUTED' : 'AUDIO UNMUTED');
        }}
        onDriveControl={handleDriveControl}
        onTriggerContextInteract={handleContextInteract}
      />

      {/* Minimap Radar */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-auto">
        <Minimap
          playerX={playerCoord.x}
          playerZ={playerCoord.z}
          playerHeading={playerCoord.heading}
          files={droppedFilesList}
          cars={carsList}
          offlinePlayers={offlinePlayersList}
          worldSize={sim.current.worldSize}
        />
      </div>

      {/* Modals */}
      <FileModal
        file={selectedFileForModal}
        currentUser={user}
        onClose={() => setSelectedFileForModal(null)}
        onDelete={handleDeleteDroppedFile}
        onClaimDownload={handleClaimFileDownload}
      />

      <DropFileModal
        isOpen={isDropConfigOpen}
        pendingFile={pendingFileForDrop}
        onClose={() => {
          setIsDropConfigOpen(false);
          setPendingFileForDrop(null);
        }}
        onConfirmDrop={handleConfirmAirdrop}
      />

      <AdminCarModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        playerPos={{ x: playerCoord.x, z: playerCoord.z }}
        onImportCar={handleImportCar}
        billboards={billboardsList}
        onUpdateBillboard={handleUpdateBillboard}
        totalVisitors={totalVisitors}
        totalCarsCount={carsList.length}
        totalAirdropsCount={droppedFilesList.length}
        offlinePlayers={offlinePlayersList}
      />

      <ShowroomModal
        isOpen={isShowroomOpen}
        onClose={() => setIsShowroomOpen(false)}
        cars={carsList}
        user={user}
        onBuyCar={handleBuyShowroomCar}
        onSellCar={handleSellShowroomCar}
      />

      <ControlsModal isOpen={isControlsOpen} onClose={() => setIsControlsOpen(false)} />
    </div>
  );
};
