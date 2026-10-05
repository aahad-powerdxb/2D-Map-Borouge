import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import gsap from 'gsap';

class MapApp {
  constructor () {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 10;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.ambient_light = new THREE.AmbientLight(0xffffff, 3);

    this.initUI();

    this.hoveredMarker = null;
    this.markers = [];
    
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.plane = this.loadPlane();

    this.scene.add(this.plane, this.ambient_light);
    this.addMarkers();

    window.addEventListener('click', (event) => {
      this.onClick(event);
    });
    window.addEventListener('mousemove', (event) => {
      this.onMouseMove(event);
    });
    this.renderer.setAnimationLoop((time) => {
      this.animate(time);
    });
  }

  initUI() {
    this.sidebar = document.getElementById("office-sidebar");
    const video = document.getElementById("office-video");

    this.sidebar.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    this.close_btn = document.getElementById("close-btn");

    this.close_btn.addEventListener('click', (event) => {
      video.pause();
      this.sidebar.classList.remove('open');
    });
  }

  addMarkers () {
    const officeLocations = [
      { x: 2.73, y: -0.49, location_name: "UAE" },
      { x: -0.25, y: 1.61, location_name: "Germany" },
      { x: 0.69, y: 2.43, location_name: "Poland" },
      { x: -5.99, y: 1.69, location_name: "USA (New York)" },
      { x: -9.13, y: 0.69, location_name: "USA (California)" },
      { x: -8.71, y: 2.34, location_name: "Canada" },
      { x: -4.45, y: -4.00, location_name: "Brazil" },
      { x: 7.35, y: -0.11, location_name: "Japan" },
      { x: 4.49, y: -0.18, location_name: "India" },
      { x: 6.48, y: -2.33, location_name: "Indonesia" }
    ];

    // Define the 3 office types matching our legend colors
    const officeTypes = [
      { type: "Headquarters", color: 0xff3366 },     // Pinkish-Red
      { type: "Regional Branch", color: 0x33ccff },  // Cyan
      { type: "Tech Hub", color: 0x66ff66 }         // Green
    ];

    // Your shared data object might look something like this:
    const sharedOfficeData = {
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.",
      videoSrc: "stock_video.mp4"
    };

    const sphere_geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    });

    
    for (const location of officeLocations) {
      // 1. Pick a random office type from the array
      const randomType = officeTypes[Math.floor(Math.random() * officeTypes.length)];

      // 2. Create a unique material for this marker using its assigned color
      const material = new THREE.MeshStandardMaterial({
        color: randomType.color,
        emissive: randomType.color,
        emissiveIntensity: 2,
      });

      // 3. Match the point light color to the marker's color
      const point_light = new THREE.PointLight(randomType.color, 4, 3);
      const sphereMesh = new THREE.Mesh(sphere_geometry, material);
      
      sphereMesh.position.x = location.x;
      sphereMesh.position.y = location.y;
      sphereMesh.position.z = 0.1;

      // 4. Attach the office type info into userData so it can be displayed in the UI
      sphereMesh.userData = { 
        ...location, 
        ...sharedOfficeData, 
        officeType: randomType.type 
      };

      this.scene.add(sphereMesh);
      sphereMesh.add(point_light);
      this.markers.push(sphereMesh);

      // GSAP POP-IN ANIMATION
      sphereMesh.scale.set(0, 0, 0);
      gsap.to(sphereMesh.scale, {
        x: 1, y: 1, z: 1, 
        duration: 0.6, 
        delay: Math.random() * 0.5,
        ease: "back.out(1.7)"
      });
    }
  }

  resetHoveredMarker() {
    if (this.hoveredMarker) {
      console.log("🔴 Scaling DOWN");
      const light = this.hoveredMarker.children[0];
      gsap.to(this.hoveredMarker.scale, { x: 1, y: 1, z: 1, duration: 0.3, overwrite: true });
      gsap.to(light, {
        intensity: 4,
        duration: 0.3,
        overwrite: true
      });
      this.hoveredMarker = null;
    }
  }

  markerHoverLogic(object) {
    // If moving from one marker directly to another, shrink the old one first
    if (this.hoveredMarker && this.hoveredMarker !== object) {
      this.resetHoveredMarker();
    }

    // Scale up the newly hovered marker with a subtle bounce
    if (this.hoveredMarker !== object) {
      this.hoveredMarker = object;
      const light = this.hoveredMarker.children[0];
      
      gsap.to(this.hoveredMarker.scale, { 
        x: 1.4, y: 1.4, z: 1.4, 
        duration: 0.3, 
        ease: "back.out(2)",
        overwrite: true
      });

      gsap.to(light, {
        intensity: 10,
        duration: 0.3,
        overwrite: true
      });

      console.log("🟢 Scaling UP");
    }
  }

  onMouseMove(event) {
    const intersects = this.fetchIntersects(event);
    
    if (intersects.length === 0) {
      this.resetHoveredMarker();
      return;
    }
    
    const first_object = intersects[0].object;
    if (first_object.geometry.type === "SphereGeometry") {
      this.markerHoverLogic(first_object);
    }
    else {
      this.resetHoveredMarker();
    }
  }

  fetchIntersects(event) {
    const mouse_x = event.clientX;
    const mouse_y = event.clientY;

    this.mouse.x = (mouse_x / window.innerWidth * 2 - 1);
    this.mouse.y = (-(mouse_y / innerHeight) * 2 + 1);

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects([this.plane, ...this.markers]);

    return intersects;
  }

  onClick(event) {
    const intersects = this.fetchIntersects(event);

    if (intersects.length === 0) 
      return;

    const first_object = intersects[0].object
    const map_intersect_coords = intersects[0].point;
    console.log("X:", map_intersect_coords.x, ", Y:", map_intersect_coords.y, ", Z:", map_intersect_coords.z);

    const title = document.getElementById("office-title");
    const description = document.getElementById("office-description");
    const video = document.getElementById("office-video");
    
    if (first_object.geometry.type === "SphereGeometry") {
      console.log("This is a marker!");
      title.textContent = first_object.userData.location_name;
      description.textContent = first_object.userData.description;
      video.src = first_object.userData.videoSrc;

      this.sidebar.classList.add('open');

      // 🎥 ZOOM IN
      gsap.to(this.camera.position, {
        x: first_object.position.x,
        y: first_object.position.y,
        z: 4, // Closer z-index for zoom
        duration: 1,
        ease: "power2.inOut",
        overwrite: true
      });
    }

    if (first_object.geometry.type === "PlaneGeometry") {
      console.log("This is the map!");

      video.pause();
      this.sidebar.classList.remove('open');

      // 🎥 ZOOM OUT (Reset to original position)
      gsap.to(this.camera.position, {
        x: 0,
        y: 0,
        z: 10, // Original camera height
        duration: 1,
        ease: "power2.inOut",
        overwrite: true
      });
    }
  }

  animate(time) {
    this.renderer.render(this.scene, this.camera)
  }

  loadPlane() {
    const plane_geometry = new THREE.PlaneGeometry();
    const loader = new THREE.TextureLoader();
    const texture = loader.load("demo_map.jpg");
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
    });

    const mesh = new THREE.Mesh(plane_geometry, material);

    const vFov = (this.camera.fov * Math.PI) / 180;
    const distance = this.camera.position.z - mesh.position.z;
    const screenHeight = Math.tan(vFov/2) * 2 * distance;
    const screenWidth = screenHeight * (window.innerWidth/window.innerHeight);

    mesh.scale.set(screenWidth, screenHeight, 1);

    return mesh;
  }
}

const mapApp = new MapApp();