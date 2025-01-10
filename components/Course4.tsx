"use client";

import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Plane004: THREE.Mesh;
    Plane004_1: THREE.Mesh;
    Plane004_2: THREE.Mesh;
  };
  materials: {
    ["Material.003"]: THREE.MeshStandardMaterial;
    ["Material.010"]: THREE.MeshStandardMaterial;
    ["Material.012"]: THREE.MeshStandardMaterial;
  };
};

export function Course(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF("/Course-transformed.glb") as GLTFResult;

  return (
    <group {...props} dispose={null} receiveShadow>
      <mesh
        geometry={nodes.Plane004.geometry}
        material={materials["Material.003"]}
      />
      <mesh
        geometry={nodes.Plane004_1.geometry}
        material={materials["Material.010"]}
      />
      <mesh
        geometry={nodes.Plane004_2.geometry}
        material={materials["Material.012"]}
      />
    </group>
  );
}

useGLTF.preload("/Course-transformed.glb");
