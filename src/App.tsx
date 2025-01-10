import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { GolfSimulationRapier } from "../components/GolfSimRapier";
import { Course } from "../components/Course4";
import QuadGround from "../components/assets/QuadGround";
import CustomEnvironmentSunlight from "../components/lighting/Lighting";

interface Player {
  id: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  color: string;
}

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [connectionCount, setConnectionCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const playerBody = useRef<RapierRigidBody>(null);

  const id = useRef("");

  const [startGame, setStartGame] = useState(false);
  const [controls, openControls] = useState(false);

  const [scaling, setScaling] = useState(0);

  useEffect(() => {
    const ws = new WebSocket("http://localhost:8080");
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "playerUpdate") {
        setPlayers(Object.values(data.players));
      } else if (data.type === "init") {
        id.current = data.player;
        console.log(id.current);
      } else if (data.type === "count") {
        setConnectionCount(data.count);
      } else if (data.type === "turnStart") {
        document.getElementById(
          "turn"
        )!.innerText = `Player ${data.player} Turn`;
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <>
      {startGame ? (
        <>
          <div className="fixed pt-2 top-0 right-0 w-full h-[75px] bg-emerald-900 z-10">
            <div className="flex flex-row items-center pt-1">
              <a
                className="pointer-events-auto hover:cursor-pointer"
                onClick={() => setStartGame(false)}
              >
                <h1 className="font-bold text-3xl pl-4 text-white">
                  The Golf Game
                </h1>
              </a>
              <div className="pl-4">
                <p>Power</p>
                <div
                  id="power-container"
                  className="w-[100px] bg-[#ddd] border-solid border-2 border-white"
                >
                  <div
                    id="power-fill"
                    className="h-[20px] w-0 bg-emerald-500"
                  ></div>
                </div>
              </div>
              <div className="pl-4">
                <p>Shot Vertical Angle</p>
                <p className="pl-4" id="angle">
                  0
                </p>
              </div>
              <div
                className="ml-4 w-[150px] h-[50px] text-center bg-[#0000ff] rounded-lg"
                id="club-container"
              >
                <p className="font-light">Club</p>
                <p className="font-bold" id="club">
                  Driver
                </p>
              </div>
              <div className="pl-4">
                <p>Shots</p>
                <p className="pl-4 font-bold" id="shots">
                  0
                </p>
              </div>
              <div className="pl-4">
                <p>Turn</p>
                <p className="pl-4 font-bold" id="turn">
                  Tee Off
                </p>
              </div>
            </div>
          </div>
          <div className="fixed top-0 right-0 z-10 bg-slate-500 m-4 p-4 rounded-md">
            <h2>Golf Multiplayer</h2>
            <p>Active Connections: {connectionCount}</p>
            <p>My ID: Player {id.current}</p>
          </div>
          <Canvas
            style={{ height: "100dvh", width: "auto" }}
            camera={{ position: [0, 15, -25] }}
            shadows="soft"
          >
            {/* <color attach="background" args={["lightblue"]} /> */}
            <ambientLight intensity={1} />
            <Sky sunPosition={[50, 20, -100]} />
            <Physics>
              {/* local player's hitbox with a transparent material */}
              <GolfSimulationRapier
                wsRef={wsRef}
                playerBody={playerBody}
                id={id.current}
              />
              {scaling === 0 ? (
                <>
                  <RigidBody type="fixed" colliders="trimesh">
                    <Course />
                  </RigidBody>
                </>
              ) : (
                <>
                  <RigidBody type="fixed" colliders="trimesh">
                    <QuadGround scale={scaling} />
                  </RigidBody>
                </>
              )}

              {players.map((player) => (
                // Networked player skins
                <mesh
                  key={player.id}
                  position={[player.x, player.y, player.z]}
                  rotation={[player.rx, player.ry, player.rz]}
                >
                  <sphereGeometry args={[0.15, 16, 16]} />
                  <meshStandardMaterial color={player.color} />
                </mesh>
              ))}
            </Physics>
            <CustomEnvironmentSunlight />
            <Perf position="bottom-right" />
          </Canvas>
        </>
      ) : (
        <>
          <div className="flex w-full h-screen bg-emerald-900 justify-center items-center">
            <div className="flex flex-col text-center items-center z-[2]">
              <h1 className="font-bold text-5xl text-white">The Golf Game</h1>
              <br></br>
              <button
                onClick={() => setStartGame(true)}
                className="bg-slate-500 mb-4 py-4 px-8 rounded-lg text-white font-bold"
              >
                Start Game
              </button>

              <button
                onClick={() => openControls(!controls)}
                className="bg-slate-500 py-4 px-8 rounded-lg text-white font-bold"
              >
                Controls
              </button>
              <br></br>
              <h3>Select your Course</h3>
              <select
                onChange={(e) => setScaling(parseFloat(e.target.value))}
                className="bg-gray-200 rounded-lg text-black"
                typeof="number"
              >
                <option value="0">Big Outdoors</option>
                <option value="0.5">Fairways</option>
                <option value="1">Hills</option>
                <option value="2">Mountains</option>
              </select>
              <div
                className={`fixed bg-gray-600 rounded-lg w-[90%] bottom-10 text-center px-36 pt-4 pb-4 overflow-hidden transition-all duration-300 ${
                  controls ? "max-h-[150px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-white text-md">
                  Click and drag to move the camera, which will aim your shot.
                  Hold spacebar to set the power of your shot. Use different
                  clubs to change the relative shot power by pressing 1, 2, or
                  3. Finally, use the up and down arrow keys to give your shot
                  more angle.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App;
