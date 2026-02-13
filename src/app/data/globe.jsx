
"use client";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, extend, useThree } from "@react-three/fiber";
import * as turf from "@turf/turf";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Color,
  Fog,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import ThreeGlobe from "three-globe";
import countries from "./globe.json";

extend({ ThreeGlobe });

const RING_PROPAGATION_SPEED = 3;
const aspect = 1.2;
const cameraZ = 300;
let numbersOfRings = [0];

// POPUP COMPONENT

const Popup = ({ position, player }) => {
  return (
    <Html
      position={position}
      center
      zIndexRange={[0, 0]}

      style={{
        pointerEvents: "none",
        transform: "translate3d(-50%, -124%, 0)",
      }}

    >
      <div
        style={{
          background: "rgba(25, 25, 25, 0.9)",
          backdropFilter: "blur(12px)",
          borderRadius: "18px",
          padding: "10px",
          color: "white",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          transform: "rotate(-8deg)",
        }}
        className="h-56 w-40 flex flex-col z-40 items-start justify-start"
      >
        {/* Navigation Buttons */}
        <button className="absolute left-[-18px] top-[35%] -translate-y-1/2 w-8 h-8 bg-[#1e1e1e]/90 rounded-full flex items-center justify-center border border-white/10 hover:bg-black transition-all z-50">
          <span className="text-white text-xs opacity-70">❮</span>
        </button>
        <button className="absolute right-[-18px] top-[35%] -translate-y-1/2 w-8 h-8 bg-[#1e1e1e]/90 rounded-full flex items-center justify-center border border-white/10 hover:bg-black transition-all z-50">
          <span className="text-white text-xs opacity-70">❯</span>
        </button>
        {/* IMAGE */}
        <div
          style={{
            position: "relative",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "10px",
          }}
          className="h-[200px] w-full object-cover overflow-hidden"
        >
          <img src={player?.image} alt={player?.name} />

          {/* Slider Dots */}
          <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2">
            <div
              style={{
                clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
                background: "#121212"
              }}
              className="w-14 h-4 flex items-center justify-center gap-1 px-2 pb-1"
            >
              <div className="w-2.5 h-[3px] bg-orange-500 rounded-full"></div>
              <div className="w-[3px] h-[3px] bg-gray-600 rounded-full"></div>
              <div className="w-[3px] h-[3px] bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* TEXT */}
        <div>
          <div className="text-sm">{player?.name}</div>
          <div className="text-xs text-white/70">{player?.team}</div>

          <div className=" mt-2 text-[11px] text-white/50 flex items-center gap-1 uppercase tracking-[0.5px]">
            🌐 {player?.country}
          </div>
        </div>
      </div>
    </Html>
  );
};


const randomPlayers = [
  {
    name: "Kylian Mbappé",
    team: "PSG",
    country: "France",
    image: "/Kylian.jpg",
  },
  {
    name: "Stephen Curry",
    team: "Golden State",
    country: "USA",
    image: "Stephen.png",
  },
  {
    name: "Virat Kohli",
    team: "India",
    country: "India",
    image: "/Virat.jpg",
  },
  {
    name: "Lionel Messi",
    team: "Inter Miami",
    country: "Argentina",
    image: "/Lionel.png",
  },
  {
    name: "LeBron James",
    team: "LA Lakers",
    country: "USA",
    image: "/LeBron.png",
  },
  {
    name: "Neymar Jr",
    team: "Al Hilal",
    country: "Brazil",
    image: "/Lionel.png",
  },
];

const getRandomPlayer = () => {
  return randomPlayers[Math.floor(Math.random() * randomPlayers.length)];
};

const getCountryFromLatLng = (lat, lng) => {
  const point = turf.point([lng, lat]);

  for (let feature of countries.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      return feature.properties.name;
    }
  }

  return "Ocean";
};

//GLOBE COMPONENT

function Globe({ globeConfig, data, pinPopups = [] }) {
  const globeRef = useRef(null);
  const groupRef = useRef();
  const [isInitialized, setIsInitialized] = useState(false);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const pinSpritesRef = useRef([]);
  const [hoveredPin, setHoveredPin] = useState(null);
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const { camera, gl } = useThree();
  const [popupContent, setPopupContent] = useState(null);

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  // THREE‑GLOBE INSTANCE

  useEffect(() => {
    if (!globeRef.current && groupRef.current) {
      globeRef.current = new ThreeGlobe();
      groupRef.current.add(globeRef.current);
      setIsInitialized(true);
    }
    return () => {
      if (globeRef.current && groupRef.current) {
        groupRef.current.remove(globeRef.current);
        globeRef.current = null;
        setIsInitialized(false);
      }
    };
  }, []);

  // GLOBE MATERIAL

  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;
    const globeMaterial = globeRef.current.globeMaterial();
    globeMaterial.color = new Color(globeConfig.globeColor);
    globeMaterial.emissive = new Color(globeConfig.emissive);
    globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity || 0.1;
    globeMaterial.shininess = globeConfig.shininess || 0.9;
  }, [
    isInitialized,
    globeConfig.globeColor,
    globeConfig.emissive,
    globeConfig.emissiveIntensity,
    globeConfig.shininess,
  ]);

  // ARCS, POINTS, RINGS

  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    let points = [];
    for (let i = 0; i < data.length; i++) {
      const arc = data[i];
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.startLat,
        lng: arc.startLng,
        title: arc.startTitle || `Point ${i}`,
        description: arc.startDescription || "Start location",
        country: getCountryFromLatLng(arc.startLat, arc.startLng),
      });

      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.endLat,
        lng: arc.endLng,
        title: arc.endTitle || `Point ${i}`,
        description: arc.endDescription || "End location",
        country: getCountryFromLatLng(arc.endLat, arc.endLng),
      });
    }

    const uniquePoints = points.filter(
      (v, i, a) =>
        a.findIndex((v2) => v2.lat === v.lat && v2.lng === v.lng) === i,
    );

    setFilteredPoints(uniquePoints);

    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);

    globeRef.current
      .arcsData(data)
      .arcStartLat((d) => d.startLat * 1)
      .arcStartLng((d) => d.startLng * 1)
      .arcEndLat((d) => d.endLat * 1)
      .arcEndLng((d) => d.endLng * 1)
      .arcColor((e) => e.color)
      .arcAltitude((e) => e.arcAlt * 1)
      .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)])
      .arcDashLength(defaultProps.arcLength)
      .arcDashInitialGap((e) => e.order * 1)
      .arcDashGap(15)
      .arcDashAnimateTime(() => defaultProps.arcTime);

    globeRef.current
      .pointsData(uniquePoints)
      .pointColor((e) => e.color)
      .pointsMerge(true)
      .pointAltitude(0.0)
      .pointRadius(2);

    globeRef.current
      .ringsData([])
      .ringColor(() => defaultProps.polygonColor)
      .ringMaxRadius(defaultProps.maxRings)
      .ringPropagationSpeed(RING_PROPAGATION_SPEED)
      .ringRepeatPeriod(
        (defaultProps.arcTime * defaultProps.arcLength) / defaultProps.rings,
      );
  }, [
    isInitialized,
    data,
    defaultProps.pointSize,
    defaultProps.showAtmosphere,
    defaultProps.atmosphereColor,
    defaultProps.atmosphereAltitude,
    defaultProps.polygonColor,
    defaultProps.arcLength,
    defaultProps.arcTime,
    defaultProps.rings,
    defaultProps.maxRings,
  ]);

  // ADD PINS WITH HOVER DETECTION

  useEffect(() => {
    if (!globeRef.current || !isInitialized || filteredPoints.length === 0)
      return;

    // Remove existing pins
    pinSpritesRef.current.forEach((sprite) => {
      globeRef.current.remove(sprite);
    });
    pinSpritesRef.current = [];

    const textureLoader = new TextureLoader();
    const pinTexture = textureLoader.load("/pin.png");
    const spriteScale = 7;

    // Keep pins in the same content, limit to 6 in front hemisphere
    const frontPins = filteredPoints
      .map((point) => {
        const coords = globeRef.current.getCoords(point.lat, point.lng, 0.003);
        return { point, coords };
      })
      // Only front hemisphere (z > 0) AND upper hemisphere (y > 0)
      .filter(({ coords }) => coords.z > 0 && coords.y > 0)
      // Sort by closest to camera (optional but cleaner)
      .sort((a, b) => b.coords.z - a.coords.z)
      .slice(0, 6);

    frontPins.forEach(({ point, coords }) => {
      const material = new SpriteMaterial({
        map: pinTexture,
        depthWrite: false,
        depthTest: true,
        transparent: true,
      });

      const sprite = new Sprite(material);

      sprite.center.set(0.5, 0);
      sprite.scale.set(spriteScale, spriteScale, 1);

      sprite.position.set(coords.x, coords.y + 0.03, coords.z);

      sprite.userData = {
        ...point,
        lat: point.lat,
        lng: point.lng,
        country: point.country || "Unknown",
        baseScale: spriteScale,
        originalPosition: sprite.position.clone(),
      };

      globeRef.current.add(sprite);

      pinSpritesRef.current.push(sprite);
    });

    return () => {
      if (globeRef.current) {
        pinSpritesRef.current.forEach((sprite) => {
          globeRef.current.remove(sprite);
        });
        pinSpritesRef.current = [];
      }
    };
  }, [isInitialized, filteredPoints]);

  //  HOVER DETECTION

  useEffect(() => {
    if (!globeRef.current || !camera) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event) => {
      const rect = gl.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(
        pinSpritesRef.current,
        false,
      );

      if (intersects.length > 0) {
        const pin = intersects[0].object;

        if (hoveredPin !== pin) {
          if (hoveredPin) {
            const base = globeRef.current.getCoords(
              hoveredPin.userData.lat,
              hoveredPin.userData.lng,
              0.003,
            );

            hoveredPin.position.set(base.x, base.y, base.z);
            hoveredPin.scale.set(7, 7, 1);
          }

          const pop = globeRef.current.getCoords(
            pin.userData.lat,
            pin.userData.lng,
            0.003,
          );

          pin.position.set(pop.x, pop.y, pop.z);
          pin.scale.set(9, 9, 1);

          setHoveredPin(pin);

          const popup = globeRef.current.getCoords(
            pin.userData.lat,
            pin.userData.lng,
            0.025,
          );

          setPopupContent({
            position: new THREE.Vector3(popup.x, popup.y, popup.z),
            player: getRandomPlayer(),
          });
        }
      } else {
        if (hoveredPin) {
          const base = globeRef.current.getCoords(
            hoveredPin.userData.lat,
            hoveredPin.userData.lng,
            0.006,
          );

          hoveredPin.position.set(base.x, base.y, base.z);
          hoveredPin.scale.set(7, 7, 1);
        }

        setHoveredPin(null);
        setPopupContent(null);
      }
    };

    gl.domElement.addEventListener("mousemove", onMouseMove);

    return () => {
      gl.domElement.removeEventListener("mousemove", onMouseMove);
    };
  }, [camera, gl, hoveredPin]);

  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    const interval = setInterval(() => {
      if (!globeRef.current) return;
      const newNumbersOfRings = genRandomNumbers(
        0,
        data.length,
        Math.floor((data.length * 4) / 5),
      );
      const ringsData = data
        .filter((d, i) => newNumbersOfRings.includes(i))
        .map((d) => ({
          lat: d.startLat,
          lng: d.startLng,
          color: d.color,
        }));
      globeRef.current.ringsData(ringsData);
    }, 2000);

    return () => clearInterval(interval);
  }, [isInitialized, data]);

  return (
    <>
      <group ref={groupRef} />
      {popupContent && (
        <Popup position={popupContent.position} player={popupContent.player} />
      )}
    </>
  );
}

export function WebGLRendererConfig() {
  const { gl, size } = useThree();
  useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(size.width, size.height);
    gl.setClearColor(0x000000, 0);
  }, [gl, size]);
  return null;
}

export function World(props) {
  const { globeConfig } = props;
  const scene = new Scene();
  scene.fog = new Fog(0xffffff, 400, 2000);

  return (
    <Canvas scene={scene} camera={new PerspectiveCamera(50, aspect, 180, 1800)}>
      <WebGLRendererConfig />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight
        color={globeConfig.directionalLeftLight}
        position={new Vector3(-400, 100, 400)}
      />
      <directionalLight
        color={globeConfig.directionalTopLight}
        position={new Vector3(-200, 500, 200)}
      />
      <pointLight
        className="z-50"
        color={globeConfig.pointLight}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <Globe className="scale-[0.5]" {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotateSpeed={1}
        autoRotate={true}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}

export function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

export function genRandomNumbers(min, max, count) {
  const arr = [];
  while (arr.length < count) {
    const r = Math.floor(Math.random() * (max - min)) + min;
    if (arr.indexOf(r) === -1) arr.push(r);
  }
  return arr;
}
