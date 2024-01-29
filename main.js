      // Use rotateY for rotation
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
            gltf.scene.rotation.y = 0; // Remove or set to 0
      
            this.boat = gltf.scene;
            this.speed = {
              vel: 0,
              rot: 0
            };
            scene.add(this.boat);
          });
        }
      
        changeVelForward() {
          this.speed.vel -= 1;
        }
      
        changeVelBackward() {
          this.speed.vel += 1;
        }
      
        changeRotLeft() {
          this.speed.rot += 0.2;
        }
      
        changeRotRight() {
          this.speed.rot -= 0.2;
        }
      
        stop() {
          this.speed.vel = 0;
          this.speed.rot = 0;
        }
      
        update(delta) {
          if (this.boat) {
            // Use translateZ for forward and backward movement along the local z-axis
            this.boat.translateX(-this.speed.vel * delta);
            // Use rotateY for rotation
            this.boat.rotateY(this.speed.rot * delta);
          }
        }
      }
      
      class Trash {
        constructor(_scene) {
          _scene.scale.set(1.5, 1.5, 1.5);
          _scene.position.set(random(-100, 100), -0.5, random(-100, 100));
          scene.add(_scene);
          this.trash = _scene;
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
        return new Trash(boatModel.clone());
      }
      let trashes = [];
      
      const Trash_COUNT = 10000000;
      
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
          trashes.push(await createTrash());
        }
      
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
      }
      
      function handleKeyDown(event) {
        switch (event.code) {
          case 'ArrowUp':
            boat.changeVelForward();
            break;
          case 'ArrowDown':
            boat.changeVelBackward();
            break;
          case 'ArrowLeft':
            boat.changeRotLeft();
            break;
          case 'ArrowRight':
            boat.changeRotRight();
            break;
        }
      }
      
      function handleKeyUp(event) {
        boat.stop();
      }
      
      function checkCollisions() {
        if (boat.boat) {
          trashes.forEach(trash => {
            if (trash.trash) {
              if (isColliding(boat.boat, trash.trash)) {
                scene.remove(trash.trash);
              }
            }
          });
        }
      }
      
      function animate() {
        requestAnimationFrame(animate);
      
        const delta = clock.getDelta();
      
        // Update objects
        boat.update(delta);
        checkCollisions();
        if (boat.boat) {
          // Additional actions for the boat when it exists
        }
      
        // Render the scene
        renderer.render(scene, camera);
      }
      
      function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
      
      function isColliding(obj1, obj2) {
        return (
          Math.abs(obj1.position.x - obj2.position.x) < 15 &&
          Math.abs(obj1.position.z - obj2.position.z) < 15
        );
      }
      
      window.addEventListener('resize', onWindowResize);
      
      init();
      animate();
      