
"use client";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, extend, useThree } from "@react-three/fiber";
import * as turf from "@turf/turf";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";

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


const Popup = ({ position, player, onEnter,
  onLeave,
  onPrev,
  onNext, }) => {
  return (
    <Html
      position={position}
      center
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}

      style={{
        pointerEvents: "auto",

        transform: "translate3d(-85%, -110%, 0)",
      }}
    >
      <motion.div

        initial={{ opacity: 0, scale: 0.4, y: 30, rotate: 0, transformOrigin: "bottom right" }}

        animate={{ opacity: 1, scale: 1, y: -5, rotate: -5 }}
        exit={{
          opacity: 0, scale: 0.4,
          y: 30, rotate: 0
        }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-[200px] bg-[#121212]/95 backdrop-blur-xl rounded-[22px] p-2 shadow-2xl border border-white/10"
        style={{

          color: "white",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
          marginleft: "10px"

        }}
      >

        <button onClick={onPrev} className="absolute left-[-14px] top-[40%] -translate-y-1/2 w-10 h-10 bg-[#1e1e1e] rounded-full flex items-center justify-center border border-white/10 shadow-xl z-50">
          <span className="text-white text-[10px]">❮</span>
        </button>
        <button onClick={onNext} className="absolute right-[-14px] top-[40%] -translate-y-1/2 w-10 h-10 bg-[#1e1e1e] rounded-full flex items-center justify-center border border-white/10 shadow-xl z-50">
          <span className="text-white text-[10px]">❯</span>
        </button>

        {/* IMAGE CONTAINER */}
        <div className="relative h-48 w-full rounded-[14px] overflow-hidden mb-3 bg-zinc-800">
          <img
            src={player?.image}
            alt={player?.name}
            className="w-full h-full object-cover"
          />

          {/* Slider Dots */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <div
              style={{
                clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
                background: "#121212"
              }}
              className="w-12 h-3.5 flex items-center justify-center gap-1 px-2 pb-1"
            >
              <div className="w-2.5 h-[2px] bg-orange-500 rounded-full"></div>
              <div className="w-[2px] h-[2px] bg-gray-600 rounded-full"></div>
              <div className="w-[2px] h-[2px] bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* TEXT AREA */}
        <div className="px-1 pb-1">
          <div className="text-[20px] font-semibold tracking-tight">{player?.name}</div>
          <div className="text-[15px] text-white/80">{player?.team}</div>

          <div className="mt-2 text-[12px] text-white/60 flex items-center gap-1 uppercase  tracking-widest">
            <span className="text-xs">🌐</span> {player?.country}
          </div>
        </div>
      </motion.div>
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
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);


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


    pinSpritesRef.current.forEach((sprite) => {
      globeRef.current.remove(sprite);
    });
    pinSpritesRef.current = [];

    const textureLoader = new TextureLoader();
    const pinTexture = textureLoader.load("/alt-pin.png");
    pinTexture.colorSpace = THREE.SRGBColorSpace;
    const spriteScale = 7;


    const frontPins = filteredPoints
      .map((point) => {
        const coords = globeRef.current.getCoords(point.lat, point.lng, 0.003);
        return { point, coords };
      })

      .filter(({ coords }) => coords.z > 0 && coords.y > 0)

      .sort((a, b) => b.coords.z - a.coords.z)
      .slice(0, 6);

    frontPins.forEach(({ point, coords }) => {
      const material = new SpriteMaterial({
        map: pinTexture,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        color: 0xffffff,
      });

      const sprite = new Sprite(material);

      sprite.center.set(0.5, 0);
      sprite.scale.set(spriteScale, spriteScale, 1);

      sprite.position.set(coords.x, coords.y + 0.03, coords.z);
      const randomIndex = Math.floor(Math.random() * randomPlayers.length);
      sprite.userData = {
        ...point,
        lat: point.lat,
        lng: point.lng,
        country: point.country || "Unknown",
        baseScale: spriteScale,
        originalPosition: sprite.position.clone(),
        playerIndex: randomIndex,
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
            hoveredPin.renderOrder = 0;
          }

          const pop = globeRef.current.getCoords(
            pin.userData.lat,
            pin.userData.lng,
            0.003,
          );

          pin.position.set(pop.x, pop.y, pop.z);
          pin.scale.set(9, 9, 1);
          pin.renderOrder = 999;

          setHoveredPin(pin);

          const popup = globeRef.current.getCoords(
            pin.userData.lat,
            pin.userData.lng,
            0.06,
          );

          setCurrentIndex(pin.userData.playerIndex);

          setPopupContent({
            position: new THREE.Vector3(popup.x, popup.y, popup.z),
          });


        }
      } else {
        if (!isPopupHovered) {
          if (hoveredPin) {
            const base = globeRef.current.getCoords(
              hoveredPin.userData.lat,
              hoveredPin.userData.lng,
              0.003
            );

            hoveredPin.position.set(base.x, base.y, base.z);
            hoveredPin.scale.set(7, 7, 1);
            hoveredPin.renderOrder = 0;
          }

          setHoveredPin(null);
          setPopupContent(null);
        }
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
      <AnimatePresence mode="wait">
        {popupContent && (
          <Popup
            key="popup"
            position={popupContent.position}
            player={randomPlayers[currentIndex]}
            onEnter={() => setIsPopupHovered(true)}
            onLeave={() => setIsPopupHovered(false)}
            onPrev={() =>
              setCurrentIndex((prev) =>
                prev === 0 ? randomPlayers.length - 1 : prev - 1
              )
            }
            onNext={() =>
              setCurrentIndex((prev) =>
                prev === randomPlayers.length - 1 ? 0 : prev + 1
              )
            }
          />
        )}
      </AnimatePresence>


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

      <group rotation={[0.2, 0, 0]}>
        <Globe className="scale-[0.5]" {...props} />
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotateSpeed={1}
        autoRotate={false}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 2.5}
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




