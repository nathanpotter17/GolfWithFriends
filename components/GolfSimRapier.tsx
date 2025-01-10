"use client";

import React, { useState, useEffect, useRef, RefObject } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  euler,
  quat,
  RapierRigidBody,
  RigidBody,
  vec3,
} from "@react-three/rapier";
import { Vector3, MathUtils } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";

interface GolfSimulationProps {
  wsRef: RefObject<WebSocket>;
  playerBody: RefObject<RapierRigidBody>;
  id: string;
}

export const GolfSimulationRapier = ({
  wsRef,
  playerBody,
  id,
}: GolfSimulationProps) => {
  const [power, setPower] = useState(0);
  const powerRef = useRef<number>(power);
  const powerLimit = useRef<number>(1);
  const [isCharging, setIsCharging] = useState(false);
  const shots = useRef<number>(0);
  const [isShooting, setIsShooting] = useState(false);
  const [verticalAngle, setVerticalAngle] = useState<number>(0);
  const [cameraOffset] = useState(new Vector3(0, 5, 10));

  const horizontalAngleRef = useRef<number>(0);
  const verticalAngleRef = useRef<number>(0);

  const ballVelocity = useRef(new Vector3(0, 0, 0));

  // the player local reference
  const ballBodyRef = useRef<RapierRigidBody>(playerBody.current);

  const holeRef = useRef<RapierRigidBody>(null);

  const ballPosition = useRef(new Vector3(0, 0.2, 0));

  const controlsRef = useRef<any>(null);
  const arrowHelperRef = useRef<any>(null);
  const angleArrowRef = useRef<any>(null);

  const outOfBounds = useRef(false);
  const oldShotPosition = useRef(new Vector3(0, 0, 0));

  const holePosition = new Vector3(1.5, -0.9, -240);

  const driverPower = 0.5;
  const ironPower = 0.35;
  const putterPower = 0.1;

  // BALL CONFIG! SUPER IMPORTANT
  if (ballBodyRef.current) {
    ballBodyRef.current.enableCcd(true);
    powerRef.current = driverPower;
  }

  const setClub = (club: string) => {
    if (club === "driver") {
      powerLimit.current = driverPower;
      document.getElementById("club-container")!.style.backgroundColor =
        "#0000ff";
      document.getElementById("club")!.innerText = "Driver";
    } else if (club === "iron") {
      powerLimit.current = ironPower;
      document.getElementById("club-container")!.style.backgroundColor =
        "#ff0000";
      document.getElementById("club")!.innerText = "Iron";
    } else if (club === "putter") {
      verticalAngleRef.current = 0;
      powerLimit.current = putterPower;
      document.getElementById("club-container")!.style.backgroundColor =
        "#00ff00";
      document.getElementById("club")!.innerText = "Putter";
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      setIsCharging(true);
    }
    if (event.code === "Digit1") {
      setClub("driver");
    }
    if (event.code === "Digit2") {
      setClub("iron");
    }
    if (event.code === "Digit3") {
      setClub("putter");
      verticalAngleRef.current = 0;
      setVerticalAngle(0);
    }
    if (event.code === "ArrowUp") {
      setVerticalAngle((prevAngle) => {
        verticalAngleRef.current = MathUtils.clamp(prevAngle + 0.1, 0, Math.PI);
        return verticalAngleRef.current;
      });
    }
    if (event.code === "ArrowDown") {
      setVerticalAngle((prevAngle) => {
        verticalAngleRef.current = MathUtils.clamp(prevAngle - 0.1, 0, Math.PI);
        return verticalAngleRef.current;
      });
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code === "Space" && !isShooting) {
      shootBall();
      setIsCharging(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const { camera, gl, scene } = useThree();
  camera.lookAt(ballPosition.current);

  const disableControls = () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };

  const enableControls = () => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  };

  useEffect(() => {
    // Setup OrbitControls
    controlsRef.current = new OrbitControls(camera, gl.domElement);
    controlsRef.current.enablePan = false;
    controlsRef.current.minPolarAngle = 0;
    controlsRef.current.maxPolarAngle = Math.PI / 2.2;
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.35;
    controlsRef.current.enableZoom = false;
    controlsRef.current.target.set(0, 0.2, 0);
    controlsRef.current.update();
  }, [camera, gl.domElement, scene]);

  useEffect(() => {
    camera.position.copy(ballPosition.current).add(cameraOffset);
  }, [ballBodyRef, camera, cameraOffset]);

  const updateArrow = () => {
    const dir = new Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    arrowHelperRef.current.setDirection(dir);
    arrowHelperRef.current.position
      .copy(ballPosition.current)
      .add(new Vector3(0, 0.25, 0));
  };

  const updateAngleArrow = () => {
    angleArrowRef.current.position
      .copy(ballPosition.current)
      .add(new Vector3(0, 0.25, 0));
    angleArrowRef.current.rotation.x = 1.57 - verticalAngle;
  };

  const shootBall = () => {
    if (!ballBodyRef.current) return;

    ballBodyRef.current.wakeUp();

    const direction = new Vector3();
    camera.getWorldDirection(direction);
    // direction.y = 0; // Assign the vertical angle
    direction.normalize();

    console.log(`Camera direction: ${direction.toArray()}`);

    let liftFactor = 1;

    // Update horizontal angle ref
    const horizontalAngle = Math.atan2(direction.z, direction.x);
    horizontalAngleRef.current = horizontalAngle;

    const velocity = powerRef.current;

    if (powerRef.current === driverPower) {
      liftFactor = 5;
    }

    if (powerRef.current === ironPower) {
      liftFactor = 1;
    }

    if (powerRef.current === putterPower) {
      verticalAngleRef.current = 0;
      liftFactor = 0;
    }

    const verticalLift = liftFactor * powerRef.current;

    console.log(`Horizontal Angle: ${(horizontalAngle * 180) / Math.PI}`);
    console.log(`Power: ${powerRef.current}`);
    console.log(
      `Vertical Angle: ${(verticalAngleRef.current * 180) / Math.PI}`
    );
    console.log(`Lift: ${verticalLift}`);

    // Compute velocities
    const vx =
      velocity * Math.cos(verticalAngleRef.current) * Math.cos(horizontalAngle);
    console.log(`Vx: ${vx}`);
    const vy = velocity * Math.sin(verticalAngleRef.current) + verticalLift;
    console.log(`Vy: ${vy}`);
    const vz =
      velocity * Math.cos(verticalAngleRef.current) * Math.sin(horizontalAngle);
    console.log(`Vz: ${vz}`);

    // Set the velocity of the ball
    ballBodyRef.current.applyImpulse({ x: vx, y: vy, z: vz }, true);

    // Reset power and shooting status
    setIsShooting(true);
    disableControls();

    setTimeout(() => {
      setPower(0);
      setIsShooting(false);
      shots.current += 1;

      recordShotPosition();

      document.getElementById("shots")!.innerText = shots.current.toString();

      if (ballVelocity.current.x < 0.02 || ballVelocity.current.z < 0.02) {
        slowBall();
      }
      horizontalAngleRef.current = 0;
      enableControls();
    }, 20000); // roughly how long the max shot takes...
  };

  const chargePower = () => {
    if (isCharging) {
      setPower((prevPower) => {
        powerRef.current = THREE.MathUtils.clamp(
          prevPower + 0.01,
          0,
          powerLimit.current
        );
        return powerRef.current;
      });
    }
  };

  const recordShotPosition = () => {
    if (!ballBodyRef.current) return;

    const cPos = vec3(ballBodyRef.current!.translation());
    oldShotPosition.current.copy(cPos);
  };

  const resetBall = () => {
    outOfBounds.current = true;
    ballBodyRef.current!.setTranslation(
      new Vector3(
        oldShotPosition.current.x,
        oldShotPosition.current.y + 1,
        oldShotPosition.current.z
      ),
      true
    );
    ballBodyRef.current!.resetForces(true);
    ballBodyRef.current!.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ballBodyRef.current!.sleep();
    3;

    wsRef.current!.send(
      JSON.stringify({
        type: "move",
        x: oldShotPosition.current.x,
        y: oldShotPosition.current.y + 1,
        z: oldShotPosition.current.z,
        rx: 0,
        ry: 0,
        rz: 0,
      })
    );

    shots.current += 1;

    outOfBounds.current = false;
  };

  const cameraAngleDisplay = () => {
    document.getElementById("angle")!.innerText = `${(
      verticalAngle *
      (180 / Math.PI)
    ).toFixed(2)} degrees`;
  };

  const updatePowerBar = () => {
    const power = powerRef.current;
    document.getElementById("power-fill")!.style.width = `${power * 100}%`;
  };

  const slowBall = () => {
    // right now, we're just checking if the ball is moving very slowly... we should put exact opposite forces on it to stop it slowly
    if (
      ballBodyRef.current &&
      (ballVelocity.current.x < 0.02 ||
        ballVelocity.current.z < 0.02 ||
        ballVelocity.current.y < 0.02)
    ) {
      ballBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      ballBodyRef.current.sleep();
      wsRef.current!.send(
        JSON.stringify({
          type: "turnOver",
          player: id,
        })
      );
    }
  };

  useFrame(() => {
    updatePowerBar();
    updateArrow();
    updateAngleArrow();
    cameraAngleDisplay();

    if (!ballBodyRef.current) return;

    ballPosition.current.copy(vec3(ballBodyRef.current.translation()));
    ballVelocity.current.copy(vec3(ballBodyRef.current.linvel()));

    controlsRef.current.target.copy(ballPosition.current);
    controlsRef.current.update();

    if (isCharging) {
      chargePower();
    }

    if (isShooting) {
      camera.position.copy(ballPosition.current).add(cameraOffset);
      camera.lookAt(ballPosition.current);

      // Reset camera direction to the horizontal angle after shooting
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const horizontalAngle = horizontalAngleRef.current;

      camera.position.copy(ballPosition.current).add(cameraOffset);
      camera.lookAt(
        ballPosition.current
          .clone()
          .add(
            new Vector3(Math.cos(horizontalAngle), 0, Math.sin(horizontalAngle))
          )
      );

      controlsRef.current.target.copy(ballPosition.current);
      controlsRef.current.update();
    }

    if (
      ballPosition.current.y < -5 ||
      ballPosition.current.z < -300 ||
      ballPosition.current.z > 100 ||
      ballPosition.current.x < -120 ||
      ballPosition.current.x > 120
    ) {
      resetBall();
    }

    // Transmit the ball position to the server
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      ballBodyRef.current
    ) {
      const cPos = vec3(ballBodyRef.current.translation());
      const cRot = euler().setFromQuaternion(
        quat(ballBodyRef.current.rotation())
      );

      const message = JSON.stringify({
        type: "move",
        x: cPos.x,
        y: cPos.y,
        z: cPos.z,
        rx: cRot.x,
        ry: cRot.y,
        rz: cRot.z,
      });

      wsRef.current.send(message);
    }
  });

  return (
    <>
      <RigidBody
        position={holePosition}
        ref={holeRef}
        type="fixed"
        colliders="hull"
        onCollisionEnter={(e) => {
          alert("Congratulations! You completed the hole!");
          // go into spectator mode
        }}
      >
        <mesh receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 32]} />
          <meshStandardMaterial color={0x000000} />
        </mesh>
      </RigidBody>
      <RigidBody
        position={[0, 1, 0]}
        canSleep={true}
        angularDamping={0.7}
        linearDamping={0.1}
        ref={ballBodyRef}
        type="dynamic"
        colliders="ball"
      >
        <mesh castShadow>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color={0xffffff} opacity={0} transparent />
        </mesh>
      </RigidBody>
      <arrowHelper
        ref={arrowHelperRef}
        args={[new Vector3(0, 0, 1), new Vector3(), 1, 0xff0000]}
      />
      <arrowHelper
        ref={angleArrowRef}
        args={[new Vector3(0, 0, 1), new Vector3(), 1, 0x00ff00]}
      />
    </>
  );
};
