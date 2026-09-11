import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ASSET_URL = `${import.meta.env.BASE_URL}models/tripo/zippy-nova-kart.glb`;
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
