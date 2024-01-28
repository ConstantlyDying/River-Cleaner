import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const clock = new THREE.Clock();
let camera, scene, renderer, controls, water, sun, boat;

const loader = new GLTFLoader();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Boat {
  constructor(scene) {
    loader.load("assets/boat/scene.gltf", (gltf) => {
      gltf.scene.position.set(5, 13, 50);
      gltf.scene.scale.set(3, 3, 3);
      gltf.scene.rotation.y = 1.5;

      this.boat = gltf.scene;
      this.speed = {
        vel: 0,
        rot: 0
      };
      scene.add(this.boat);
    });
  }

  changeVelUp() {
    this.speed.vel += 0.1;
  }

  changeVelDown() {
    this.speed.vel -= 0.1;
  }

  stop() {
    this.speed.vel = 0;
    this.speed.rot = 0;
  }

  update(delta) {
    if (this.boat) {
      this.boat.rotation.y += this.speed.rot * delta;
      this.boat.translateZ(this.speed.vel * delta);
    }
  }
}

class Trash {
  constructor(scene) {
    loader.load("assets/trash/scene.gltf", (gltf) => {
      this.trash = gltf.scene;
      this.trash.scale.set(1.5, 1.5, 1.5);
      this.trash.position.set(random(-200, 200), -0.5, random(-200, 200));
      scene.add(this.trash);
    });
  }
}

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene);
    });
  });
}

let boatModel = null;

async function createTrash() {
  if (!boatModel) {
    boatModel = await loadModel("assets/trash/scene.gltf");
  }
  return new Trash(scene);
}

async function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(30, 30, 100);

  sun = new THREE.Vector3();

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = -Math.PI / 2;

  scene.add(water);

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const sceneEnv = new THREE.Scene();

  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);

    scene.environment = renderTarget.texture;
  }

  updateSun();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 10; // Replace with the desired minimum distance

  boat = new Boat(scene);

  for (let i = 0; i < 10; i++) {
    await createTrash();
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update objects
  boat.update(delta);

  // Render the scene
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

init();
animate();
