import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDGameSceneProps {
  onExit3D: () => void;
}

export const ThreeDGameScene: React.FC<ThreeDGameSceneProps> = ({ onExit3D }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Movement state
  const keys = useRef<{ [key: string]: boolean }>({});


  // Dimensions
  const worldSize = 300; // size of the city grid
  const blockSize = 30;
  const roadWidth = 6;

  useEffect(() => {
    if (!mountRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d0d);
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 30, 50);


    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- City Generation ----
    const buildingBBoxes: THREE.Box3[] = [];
    const movingCars: { mesh: THREE.Mesh; speed: number; axis: 'x' | 'z'; dir: number }[] = [];

    const createBuilding = (bx: number, bz: number, w: number, d: number) => {
      const h = 15 + Math.random() * 30;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
      const building = new THREE.Mesh(geo, mat);
      building.position.set(bx, h / 2, bz);
      building.castShadow = true;
      scene.add(building);

      // Roof – flat with slight overhang
      const roofGeo = new THREE.PlaneGeometry(w, d);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(bx, h + 0.1, bz);
      scene.add(roof);

      // Bounding box for collisions & car avoidance
      const bbox = new THREE.Box3().setFromObject(building);
      buildingBBoxes.push(bbox);
    };

    for (let x = -worldSize / 2; x < worldSize / 2; x += blockSize + roadWidth) {
      for (let z = -worldSize / 2; z < worldSize / 2; z += blockSize + roadWidth) {
        // skip roads centre
        if (Math.abs(x) < roadWidth / 2 || Math.abs(z) < roadWidth / 2) continue;
        createBuilding(x + blockSize / 2, z + blockSize / 2, blockSize, blockSize);
      }
    }

    // Cars – simple moving cubes
    const carGeo = new THREE.BoxGeometry(2, 1, 4);
    const carColors = [0xb91c1c, 0x1d4ed8, 0x047857, 0xeab308];
    for (let i = 0; i < 15; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: carColors[Math.floor(Math.random() * carColors.length)] });
      const car = new THREE.Mesh(carGeo, mat);
      const axis = Math.random() > 0.5 ? 'x' : 'z';
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 0.2 + Math.random() * 0.3;

      const ortho = axis === 'x' ? -worldSize / 2 + Math.random() * worldSize : -worldSize / 2 + Math.random() * worldSize;
      if (axis === 'x') {
        car.position.set(-worldSize / 2, 0.5, ortho);
        car.rotation.y = Math.PI / 2;
      } else {
        car.position.set(ortho, 0.5, -worldSize / 2);
      }
      scene.add(car);
      movingCars.push({ mesh: car, speed, axis, dir });
    }

    // ---- Player Avatar ----
    const playerGroup = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.4, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00aaff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    playerGroup.add(body);
    const headGeo = new THREE.SphereGeometry(0.5, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffddaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.5;
    playerGroup.add(head);
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    // ---- Animation Loop ----
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      // Move player based on keys
      const moveSpeed = 30 * delta;
      if (keys.current['w']) {
        playerGroup.position.z -= moveSpeed;
      }
      if (keys.current['s']) {
        playerGroup.position.z += moveSpeed;
      }
      if (keys.current['a']) {
        playerGroup.position.x -= moveSpeed;
      }
      if (keys.current['d']) {
        playerGroup.position.x += moveSpeed;
      }
      // Keep player within world bounds
      playerGroup.position.x = THREE.MathUtils.clamp(playerGroup.position.x, -worldSize / 2 + 5, worldSize / 2 - 5);
      playerGroup.position.z = THREE.MathUtils.clamp(playerGroup.position.z, -worldSize / 2 + 5, worldSize / 2 - 5);

      // Update camera to follow player (simple top‑down view)
      camera.position.lerp(new THREE.Vector3(playerGroup.position.x, 30, playerGroup.position.z + 40), 0.1);
      camera.lookAt(playerGroup.position);

      // Animate cars
      movingCars.forEach((c) => {
        if (c.axis === 'x') {
          c.mesh.position.x += c.speed * c.dir;
          if (c.mesh.position.x > worldSize / 2 || c.mesh.position.x < -worldSize / 2) c.dir *= -1;
        } else {
          c.mesh.position.z += c.speed * c.dir;
          if (c.mesh.position.z > worldSize / 2 || c.mesh.position.z < -worldSize / 2) c.dir *= -1;
        }
      });

  
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Keyboard handling
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full" ref={mountRef}>
      {/* HUD */}
      <button
        onClick={onExit3D}
        className="absolute top-4 left-4 px-3 py-1 bg-slate-800 text-cyan-300 rounded hover:bg-slate-700"
      >
        ⬅️ Back to Map
      </button>
    </div>
  );
};
