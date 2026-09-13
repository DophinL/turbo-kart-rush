import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ASSET_URL = `${import.meta.env.BASE_URL}models/tripo/zippy-nova-kart-v2.glb`;
const TARGET_LENGTH = 1.64;

export const TRIPO_KART_READY_EVENT = 'tripo-kart-ready';

let templatePromise: Promise<THREE.Group> | null = null;
let ready = false;

function prepareTemplate(scene: THREE.Group): THREE.Group {
  scene.name = 'tripo-zippy-kart-template';
  scene.rotation.y = Math.PI / 2;
  scene.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(scene);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const scale = TARGET_LENGTH / Math.max(0.001, initialSize.z);
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(scene);
  const centre = box.getCenter(new THREE.Vector3());
  scene.position.set(-centre.x, -box.min.y, -centre.z);
  scene.updateMatrixWorld(true);

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;

    // Tripo exports this asset with a fully metallic PBR material. That reads
    // well in the menu's studio environment, but loses most of its cyan/pink
    // texture under the race tracks' direct-only lighting. Keep the authored
    // maps while using game-safe values that remain colorful in both scenes.
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const sourceMaterial of meshMaterials) {
      if (!(sourceMaterial instanceof THREE.MeshStandardMaterial)) continue;
      sourceMaterial.metalness = Math.min(sourceMaterial.metalness, 0.32);
      sourceMaterial.roughness = Math.max(sourceMaterial.roughness, 0.58);
      sourceMaterial.envMapIntensity = 0.85;
      sourceMaterial.needsUpdate = true;
    }
  });

  return scene;
}

function loadTemplate(): Promise<THREE.Group> {
  if (!templatePromise) {
    templatePromise = new GLTFLoader()
      .loadAsync(ASSET_URL)
      .then((gltf) => {
        const template = prepareTemplate(gltf.scene);
        ready = true;
        window.dispatchEvent(new CustomEvent(TRIPO_KART_READY_EVENT));
        return template;
      })
      .catch((error: unknown) => {
        templatePromise = null;
        console.warn('[TripoKart] asset failed to load; keeping the procedural kart', error);
        throw error;
      });
  }
  return templatePromise;
}

export function preloadTripoKart(): void {
  void loadTemplate().catch(() => undefined);
}

export function isTripoKartReady(): boolean {
  return ready;
}

export async function createTripoKart(): Promise<THREE.Group> {
  const template = await loadTemplate();
  const clone = template.clone(true);
  clone.name = 'tripo-zippy-kart';
  return clone;
}
