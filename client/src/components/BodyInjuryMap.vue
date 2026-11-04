<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { injuryRegions, injuryZones } from "../data/injuryZones";
import "../assets/injury-map.css";

const props = defineProps({
  active: {
    type: Boolean,
    default: true,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["zone-selected", "zone-confirmed"]);

const canvasContainer = ref(null);
const loading = ref(true);
const error = ref("");
const selectedZone = ref(null);
const hasInteracted = ref(false);
const activeRegion = ref(null);
const hoveredZone = ref(null);

let scene;
let camera;
let renderer;
let controls;
let observer;
let animationId;

let selectedMarker = null;
let hoveredMarker = null;
let markerTexture;
let selectedTexture;
let bodyMesh;

let pointerStart = null;
let overviewDistance = 3.2;

let needsRender = true;
let destroyed = false;
let lastHoverTime = 0;

const markers = [];
const bodyVolumes = [];
const pickVolumes = [];
const modelParts = [];

const bodyColor = new THREE.Color("#b7b7b5");
const selectedColor = new THREE.Color("#c94c48");

const focusPoint = new THREE.Vector3(0, 0.88, 0);
const pointer = new THREE.Vector2();

const raycaster = new THREE.Raycaster();
const visibilityRaycaster = new THREE.Raycaster();
const projectedPoint = new THREE.Vector3();
const directionToCamera = new THREE.Vector3();

function createMarkerTexture(selected) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext("2d");
  context.beginPath();
  context.arc(32, 32, 29, 0, Math.PI * 2);
  context.fillStyle = "#ffffff88";
  context.fill();

  context.beginPath();
  context.arc(32, 32, 19, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#555555";

  if (selected) {
    context.fillStyle = "#343434";
    context.strokeStyle = "#ffffff";
  }

  context.fill();
  context.lineWidth = 6;
  context.stroke();

  context.beginPath();
  context.arc(32, 32, 5, 0, Math.PI * 2);
  context.fillStyle = "#343434";

  if (selected) {
    context.fillStyle = "#ffffff";
  }

  context.fill();
  return new THREE.CanvasTexture(canvas);
}

function getDirection(direction, side) {
  if (direction === "back") {
    return new THREE.Vector3(0, 0, -1);
  }

  if (direction === "outer") {
    return new THREE.Vector3(side, 0, 0);
  }

  if (direction === "inner") {
    return new THREE.Vector3(-side, 0, 0);
  }

  if (direction === "top") {
    return new THREE.Vector3(0, 1, 0);
  }

  if (direction === "sole") {
    return new THREE.Vector3(0, -1, 0);
  }

  return new THREE.Vector3(0, 0, 1);
}

// Place each point on the model surface, using its direction from injuryZones.js
function addMarkers(meshes) {
  // On this model, -1 is the person's right side and 1 is the left side
  for (const side of [-1, 1]) {
    for (const zone of injuryZones) {
      if (zone.central && side < 0) {
        continue;
      }

      const point = new THREE.Vector3(zone.x * side, zone.y, zone.z);
      const direction = getDirection(zone.direction, side);
      const start = point.clone().add(direction);

      raycaster.set(start, direction.clone().negate());
      const hits = raycaster.intersectObjects(meshes, false);
      let surface = null;

      // Avoid placing a point on the other leg or on a nearby arm
      for (const hit of hits) {
        if (!zone.central && hit.point.x * side <= 0) {
          continue;
        }

        if (zone.region !== "arms" && Math.abs(hit.point.x) > 0.23) {
          continue;
        }

        if (hit.point.distanceTo(point) < 0.18) {
          surface = hit;
          break;
        }
      }

      if (!surface) {
        continue;
      }

      // Keep the full circle visible and let updateMarkers check if the body hides it
      const material = new THREE.SpriteMaterial({
        map: markerTexture,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        opacity: 0,
      });

      const marker = new THREE.Sprite(material);
      marker.position.copy(surface.point).addScaledVector(direction, 0.004);

      marker.userData = {
        zone: zone,
        side: side,
        normal: direction,
        point: surface.point.clone(),
      };
      marker.visible = false;

      markers.push(marker);
      scene.add(marker);
    }
  }
}

function addBodyVolume(region, x, y, z, width, height, depth) {
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const volume = new THREE.Mesh(geometry);

  volume.position.set(x, y, z);
  volume.scale.set(width, height, depth);
  volume.userData.region = region;

  volume.updateMatrixWorld(true);

  bodyVolumes.push(volume);

  // A larger hidden shape makes clicks near the body easier
  const pickVolume = volume.clone();
  pickVolume.scale.multiplyScalar(1.35);
  pickVolume.updateMatrixWorld(true);
  pickVolumes.push(pickVolume);
}

// Use simple hidden shapes for fast mouse and visibility checks
function createBodyVolumes() {
  addBodyVolume("head", 0, 1.63, -0.01, 0.075, 0.12, 0.075);
  addBodyVolume("torso", 0, 1.24, -0.025, 0.145, 0.25, 0.075);
  addBodyVolume("hip", 0, 0.95, -0.04, 0.16, 0.13, 0.085);

  for (const side of [-1, 1]) {
    addBodyVolume("arms", side * 0.25, 1.20, 0, 0.04, 0.21, 0.04);
    addBodyVolume("arms", side * 0.30, 0.92, 0, 0.025, 0.12, 0.025);
    addBodyVolume("thigh", side * 0.12, 0.73, -0.05, 0.065, 0.22, 0.06);
    addBodyVolume("knee", side * 0.12, 0.49, -0.065, 0.045, 0.055, 0.05);
    addBodyVolume("leg", side * 0.125, 0.29, -0.07, 0.04, 0.17, 0.055);
    addBodyVolume("ankle", side * 0.13, 0.11, -0.045, 0.02, 0.055, 0.03);
    addBodyVolume("foot", side * 0.125, 0.035, 0.02, 0.03, 0.025, 0.11);
  }
}

function getRegion(id) {
  for (const region of injuryRegions) {
    if (region.id === id) {
      return region;
    }
  }

  return null;
}

function getLabel(zone, side) {
  if (zone.central) {
    return zone.label;
  }

  let sideName = "left";

  if (side < 0) {
    sideName = "right";
  }

  return zone.label + " · " + sideName + " side";
}

function moveCamera(target, distance) {
  const direction = camera.position.clone().sub(controls.target).normalize();

  // Tilt the view so the top of the foot stays easy to see
  if (activeRegion.value && activeRegion.value.id === "foot" && direction.y < 0.35) {
    direction.y = 0.45;
    direction.normalize();
  }

  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  controls.update();
  needsRender = true;
}

function showWholeBody() {
  activeRegion.value = null;
  hoveredZone.value = null;
  moveCamera(new THREE.Vector3(0, 0.88, 0), overviewDistance);
}

function focusRegion(region, side) {
  let x = 0;

  if (region.id === "arms") {
    x = side * 0.25;
  }

  activeRegion.value = region;
  focusPoint.set(x, region.y, 0);

  const angle = THREE.MathUtils.degToRad(17.5);
  const screenRatio = Math.max(1, 0.8 / camera.aspect);
  const distance = region.height / (2 * Math.tan(angle)) * screenRatio;

  moveCamera(focusPoint, distance);
}

// Move the view back to the body centre as the user zooms out
function keepBodyInFrame() {
  if (!activeRegion.value) {
    return;
  }

  const distance = camera.position.distanceTo(controls.target);

  const progress = THREE.MathUtils.clamp((distance - 1.4) / (overviewDistance - 1.4), 0, 1);
  const center = focusPoint.clone().lerp(new THREE.Vector3(0, 0.88, 0), progress);

  const offset = center.clone().sub(controls.target);

  camera.position.add(offset);
  controls.target.copy(center);

  if (distance >= overviewDistance * 0.99) {
    activeRegion.value = null;
  }
}

function selectMarker(marker) {
  const zone = marker.userData.zone;
  const point = marker.userData.point;
  const side = marker.userData.side;
  let selectedSide = null;

  if (!zone.central) {
    selectedSide = "left";

    if (side < 0) {
      selectedSide = "right";
    }
  }

  selectedMarker = marker;
  selectedZone.value = {
    id: zone.id,
    label: getLabel(zone, side),
    region: zone.region,
    side: selectedSide,
    coordinates: { x: point.x, y: point.y, z: point.z },
  };

  highlightSelection(marker);
  emit("zone-selected", selectedZone.value);

  if (!activeRegion.value || activeRegion.value.id !== zone.region) {
    focusRegion(getRegion(zone.region), side);
  }

  needsRender = true;
}

function highlightSelection(marker) {
  if (!bodyMesh) {
    return;
  }

  const zone = marker.userData.zone;
  const point = marker.userData.point;
  const normal = marker.userData.normal;
  const positions = bodyMesh.geometry.getAttribute("position");
  const colors = bodyMesh.geometry.getAttribute("color");
  const color = new THREE.Color();
  const radius = Math.min(0.09, getRegion(zone.region).height / 5);
  let sideName = "left ";

  if (marker.userData.side < 0) {
    sideName = "right ";
  }

  for (const part of modelParts) {
    let selectedMuscle = false;

    if (zone.muscles) {
      for (const muscle of zone.muscles) {
        if (part.name.includes(sideName + muscle)) {
          selectedMuscle = true;
        }
      }
    }

    for (let i = part.start; i < part.start + part.count; i++) {
      let strength = 0;

      if (selectedMuscle) {
        strength = 1;
      }

      // Joints have no separate muscle, so colour only the surface near the point
      if (!zone.muscles) {
        const x = positions.getX(i) - point.x;
        const y = positions.getY(i) - point.y;
        const z = positions.getZ(i) - point.z;
        const distance = x * x + y * y + z * z;
        const depth = x * normal.x + y * normal.y + z * normal.z;

        if (depth > -radius * 0.45) {
          strength = THREE.MathUtils.clamp((1 - distance / (radius * radius)) * 2, 0, 1);
        }
      }

      color.copy(bodyColor).lerp(selectedColor, strength);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
  }

  // Update colours only on selection, without adding more meshes to draw
  colors.needsUpdate = true;
}

function getHit(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
  pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const selectable = [];

  for (const marker of markers) {
    if (marker.visible && marker.material.opacity > 0.5) {
      selectable.push(marker);
    }
  }

  // A point has priority over the body area behind it
  const markerHits = raycaster.intersectObjects(selectable, false);

  if (markerHits.length > 0) {
    return markerHits[0];
  }

  const bodyHits = raycaster.intersectObjects(pickVolumes, false);

  if (bodyHits.length > 0) {
    return bodyHits[0];
  }

  return null;
}

function onPointerDown(event) {
  hasInteracted.value = true;
  hoveredZone.value = null;
  pointerStart = null;

  if (!props.readOnly && event.button === 0 && event.isPrimary) {
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
}

function clearHover() {
  hoveredZone.value = null;
  hoveredMarker = null;
  needsRender = true;
}

function onPointerMove(event) {
  if (props.readOnly) {
    clearHover();
    return;
  }

  // A drag turns the body and must not select a point
  if (pointerStart) {
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);

    if (distance > 5) {
      pointerStart = null;
    }
  }

  if (event.buttons || loading.value) {
    hoveredZone.value = null;
    return;
  }

  // Limit hover checks to keep mouse movement smooth
  const now = performance.now();

  if (now - lastHoverTime < 50) {
    return;
  }

  lastHoverTime = now;
  hoveredMarker = null;
  hoveredZone.value = null;
  const hit = getHit(event);

  if (!hit) {
    needsRender = true;
    return;
  }

  let label;

  if (hit.object.isSprite) {
    hoveredMarker = hit.object;
    label = getLabel(hit.object.userData.zone, hit.object.userData.side);
  } else {
    label = getRegion(hit.object.userData.region).label;
  }

  const rect = canvasContainer.value.getBoundingClientRect();
  hoveredZone.value = {
    label: label,
    x: Math.max(8, Math.min(event.clientX - rect.left + 20, rect.width - 240)),
    y: Math.max(8, event.clientY - rect.top - 40),
  };
  needsRender = true;
}

function onPointerUp(event) {
  const start = pointerStart;
  pointerStart = null;

  if (!start || start.id !== event.pointerId || loading.value || props.readOnly) {
    return;
  }

  const hit = getHit(event);

  if (!hit) {
    return;
  }

  if (hit.object.isSprite) {
    selectMarker(hit.object);
  } else {
    let side = 1;

    if (hit.point.x < 0) {
      side = -1;
    }

    focusRegion(getRegion(hit.object.userData.region), side);
  }
}

function confirmZone() {
  emit("zone-confirmed", { ...selectedZone.value });
}

function updateMarkers() {
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  const distance = camera.position.distanceTo(controls.target);
  const zoom = THREE.MathUtils.clamp((1 - distance / overviewDistance) / 0.7, 0, 1);

  const occupied = [];
  const ordered = [];
  let fading = false;

  // Check the selected point first so nearby points cannot hide it
  if (selectedMarker) {
    ordered.push(selectedMarker);
  }

  for (const marker of markers) {
    if (marker !== selectedMarker) {
      ordered.push(marker);
    }
  }

  for (const marker of ordered) {
    // Show more detailed points as the user zooms in
    let opacity = THREE.MathUtils.smoothstep(zoom, 0.18, 0.45);

    if (marker.userData.zone.detail) {
      opacity = THREE.MathUtils.smoothstep(zoom, 0.65, 0.9);
    }

    if (props.readOnly) {
      opacity = 0;

      if (marker === selectedMarker) {
        opacity = 1;
      }
    }

    directionToCamera.copy(camera.position).sub(marker.position).normalize();
    const facing = marker.userData.normal.dot(directionToCamera);

    if (facing <= 0.05) {
      opacity = 0;
    }

    projectedPoint.copy(marker.position).project(camera);
    const x = (projectedPoint.x + 1) * width / 2;
    const y = (1 - projectedPoint.y) * height / 2;

    if (x < 0 || x > width || y < 0 || y > height || Math.abs(projectedPoint.z) > 1) {
      opacity = 0;
    }

    // Hide points that would overlap on screen
    if (opacity > 0) {
      for (const point of occupied) {
        if (Math.hypot(point.x - x, point.y - y) < 28) {
          opacity = 0;
          break;
        }
      }
    }

    if (opacity > 0) {
      // Check the hidden shapes instead of the detailed model to avoid lag
      directionToCamera.copy(marker.position).sub(camera.position);
      visibilityRaycaster.set(camera.position, directionToCamera.clone().normalize());
      visibilityRaycaster.far = Math.max(0, directionToCamera.length() - 0.015);

      if (visibilityRaycaster.intersectObjects(bodyVolumes, false).length > 0) {
        opacity = 0;
      }
    }

    if (opacity > 0) {
      occupied.push({ x: x, y: y });
    }

    const selected = marker === selectedMarker;
    marker.material.map = markerTexture;
    marker.renderOrder = 10;

    if (selected) {
      marker.material.map = selectedTexture;
      marker.renderOrder = 11;
    }

    const difference = opacity - marker.material.opacity;

    if (Math.abs(difference) > 0.02) {
      marker.material.opacity += difference * 0.35;
      fading = true;
    } else {
      marker.material.opacity = opacity;
    }

    marker.visible = marker.material.opacity > 0.02;

    let size = camera.position.distanceTo(marker.position) * 0.025;

    if (selected || (marker === hoveredMarker && hoveredZone.value)) {
      size *= 1.12;
    }

    marker.scale.setScalar(size);
  }

  return fading;
}

// Only draw when the view changes or points are still fading
function animate() {
  if (!props.active) {
    return;
  }

  animationId = requestAnimationFrame(animate);
  controls.update();

  if (!needsRender) {
    return;
  }

  const fading = updateMarkers();
  renderer.render(scene, camera);
  needsRender = fading;
}

function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value && value.isTexture) {
      value.dispose();
    }
  }

  material.dispose();
}

function disposeObject(object) {
  object.traverse(child => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (child.material) {
      let materials = [child.material];

      if (Array.isArray(child.material)) {
        materials = child.material;
      }

      for (const material of materials) {
        disposeMaterial(material);
      }
    }
  });
}

// Join the body parts into one mesh to reduce drawing work
function combineModel(meshes) {
  const parts = [];
  let vertexCount = 0;

  for (const mesh of meshes) {
    let geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    // All parts need the same geometry format before they can be joined
    if (geometry.index) {
      const flatGeometry = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flatGeometry;
    }

    for (const name of Object.keys(geometry.attributes)) {
      if (name !== "position" && name !== "normal") {
        geometry.deleteAttribute(name);
      }
    }

    const count = geometry.getAttribute("position").count;

    // Keep each muscle's vertex range after joining the model
    modelParts.push({
      name: mesh.name.toLowerCase().replace(/_/g, " "),
      start: vertexCount,
      count: count,
    });

    vertexCount += count;
    parts.push(geometry);
  }

  const combined = mergeGeometries(parts);
  const colors = new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 3), 3);

  for (let i = 0; i < vertexCount; i++) {
    colors.setXYZ(i, bodyColor.r, bodyColor.g, bodyColor.b);
  }

  combined.setAttribute("color", colors);

  for (const geometry of parts) {
    geometry.dispose();
  }

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
  });

  return new THREE.Mesh(combined, material);
}

function loadModel() {
  const loader = new GLTFLoader();
  const path = process.env.BASE_URL + "full-body-muscular-system-superficial-layer.glb";

  loader.load(path, gltf => {
    // The file may finish loading after the user leaves the page
    if (destroyed) {
      disposeObject(gltf.scene);
      return;
    }

    const model = gltf.scene;

    // The point positions are mapped to a centred body that is 1.75 metres tall
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.75 / (box.max.y - box.min.y);

    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    model.updateMatrixWorld(true);

    const meshes = [];

    model.traverse(child => {
      if (child.isMesh) {
        meshes.push(child);
      }
    });

    addMarkers(meshes);
    bodyMesh = combineModel(meshes);
    scene.add(bodyMesh);
    disposeObject(model);

    loading.value = false;
    needsRender = true;
  }, undefined, () => {
    if (!destroyed) {
      loading.value = false;
      error.value = "The 3D body could not load. Please try again.";
    }
  });
}

function resizeScene() {
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;

  if (!width || !height) {
    return;
  }

  camera.aspect = width / height;

  // Leave room for the text on the left without turning the camera
  if (width > 900) {
    camera.setViewOffset(width, height, -width * 0.12, 0, width, height);
  } else {
    camera.clearViewOffset();
  }

  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  overviewDistance = Math.max(3.2, 1.4 / camera.aspect);
  controls.maxDistance = overviewDistance;
  needsRender = true;
}

// Keep the loaded body, but stop drawing it during the questionnaire
watch(() => props.active, async active => {
  cancelAnimationFrame(animationId);

  if (active) {
    await nextTick();

    if (!props.active || !renderer || destroyed) {
      return;
    }

    resizeScene();
    needsRender = true;
    animate();
  }
});

watch(() => props.readOnly, readOnly => {
  clearHover();

  if (readOnly && selectedMarker) {
    focusRegion(getRegion(selectedZone.value.region), selectedMarker.userData.side);
  }
});

onMounted(() => {
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // Limit drawing resolution on high-resolution screens to reduce lag
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", "Interactive 3D body");
    canvasContainer.value.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 0.3;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI - 0.15;

    controls.addEventListener("change", () => {
      keepBodyInFrame();
      needsRender = true;
    });

    controls.addEventListener("start", () => {
      hoveredZone.value = null;
      hasInteracted.value = true;
    });

    scene.add(new THREE.HemisphereLight("#ffffff", "#9b9b9b", 2));

    const light = new THREE.DirectionalLight("#ffffff", 3);
    light.position.set(2, 4, 4);
    scene.add(light);

    const backlight = new THREE.DirectionalLight("#ffffff", 2);
    backlight.position.set(-3, 2, -4);
    scene.add(backlight);

    markerTexture = createMarkerTexture(false);
    selectedTexture = createMarkerTexture(true);
    createBodyVolumes();
    resizeScene();

    camera.position.set(0, 0.88, overviewDistance);
    controls.target.set(0, 0.88, 0);
    controls.update();

    observer = new ResizeObserver(resizeScene);
    observer.observe(canvasContainer.value);

    loadModel();
    animate();
  } catch (err) {
    loading.value = false;
    error.value = "Your browser cannot show the 3D body.";
  }
});

// Release graphics memory when leaving the page
onBeforeUnmount(() => {
  destroyed = true;
  cancelAnimationFrame(animationId);

  if (observer) {
    observer.disconnect();
  }

  if (controls) {
    controls.dispose();
  }

  if (scene) {
    disposeObject(scene);
  }

  for (const volume of bodyVolumes) {
    volume.geometry.dispose();
    volume.material.dispose();
  }

  if (markerTexture) {
    markerTexture.dispose();
  }

  if (selectedTexture) {
    selectedTexture.dispose();
  }

  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
});
</script>

<template>
  <section class="injury-lab" aria-label="Find your pain on the body">

    <div
      ref="canvasContainer"
      class="injury-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="pointerStart = null"
      @pointerleave="clearHover"
      @wheel="hasInteracted = true"
    ></div>

    <div class="injury-info">
      <slot name="info">
        <h1 id="injury-title" class="injury-title">
          Where does it hurt?
        </h1>

        <p class="injury-description">
          Turn the body, zoom in and click where it hurts.
        </p>

        <button
          class="injury-reset"
          type="button"
          :disabled="loading || error !== ''"
          @click="showWholeBody"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
          </svg>
          Show full body
        </button>

        <div v-if="selectedZone" class="injury-selection" aria-live="polite">
          <p class="injury-selection-caption">Your pain</p>

          <h2>{{ selectedZone.label }}</h2>

          <p class="injury-selection-help">
            Confirm this point to start the questions.
          </p>

          <button
            class="button button-dark"
            type="button"
            @click="confirmZone"
          >
            This is the spot
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </slot>
    </div>

    <p v-if="loading" class="injury-status" role="status">Loading…</p>
    <p v-else-if="error" class="injury-status" role="alert">{{ error }}</p>

    <div
      v-if="hoveredZone"
      class="injury-tooltip"
      role="tooltip"
      :style="{ left: hoveredZone.x + 'px', top: hoveredZone.y + 'px' }"
    >
      {{ hoveredZone.label }}
    </div>

    <p v-if="!loading && !error && !hasInteracted && !readOnly" class="injury-help">
      Drag to turn · Scroll to zoom
    </p>
  </section>
</template>

