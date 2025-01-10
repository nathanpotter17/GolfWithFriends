"use client";

import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three/src/loaders/TextureLoader.js";

import { useState } from "react";

import * as THREE from "three";
import React from "react";

interface QuadGroundProps {
  scale: number;
}

export default function QuadGround({ scale }: QuadGroundProps) {
  const tex = useLoader(TextureLoader, "../tex4AD.png");
  const tex1 = useLoader(TextureLoader, "../newDisp.png");
  const tex2 = useLoader(TextureLoader, "../newNormal.png");

  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);

  tex1.wrapS = tex1.wrapT = THREE.RepeatWrapping;
  tex1.repeat.set(14, 14);

  tex2.wrapS = tex2.wrapT = THREE.RepeatWrapping;
  tex2.repeat.set(14, 14);

  // Define parameters for the flat area
  const flatRadius = 3.5; // Radius of the flat area in the center
  const dimensions = new THREE.Vector2(100, 100);

  // Function to generate height, with a tee box in the center
  function getHeight(x: number, z: number) {
    const distanceFromCenter = Math.sqrt(x * x + z * z);

    if (distanceFromCenter < flatRadius) {
      // Create a Tee Box
      return 0;
    } else {
      // Apply height variation for areas outside the flat region
      // return 0;
      return Math.sin(x * 0.2) * Math.cos(z * 0.2) * scale;
    }
  }

  const segments = 100; // Number of segments (higher means more detail)

  // LOD system
  // const lod = new THREE.LOD();

  // Create buffer geometry
  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Create vertices, normals, and UVs
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const x = (i / segments) * dimensions.x - dimensions.x / 2;
      const z = (j / segments) * dimensions.y - dimensions.y / 2;
      const y = getHeight(x, z); // Get the height based on the function

      // Position
      vertices.push(x, y, z);

      // Normal (simple upward normal for now)
      normals.push(0, 1, 0);

      // UV coordinates
      uvs.push(i / segments, j / segments);
    }
  }

  // Create indices for the square faces (two triangles per square)
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = i * (segments + 1) + (j + 1);
      const c = (i + 1) * (segments + 1) + (j + 1);
      const d = (i + 1) * (segments + 1) + j;

      // Create two triangles (a, b, d) and (b, c, d)
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Add the vertices, normals, uvs, and indices to the geometry
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); // Generate smooth normals

  // Create a material with textures
  const material = new THREE.MeshPhysicalMaterial({
    map: tex,
    roughnessMap: tex1,
    normalMap: tex2,
    specularIntensity: 0.08,
    roughness: 1,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  return <primitive object={mesh} />;
}
