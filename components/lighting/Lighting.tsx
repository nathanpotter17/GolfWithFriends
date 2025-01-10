import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, TextureLoader } from "three";
import {
  Lensflare,
  LensflareElement,
} from "three/examples/jsm/objects/Lensflare.js";
import { lensFlares } from "../assets/assets";

interface CustomEnvironmentProps {}

const CustomEnvironmentSunlight: React.FC<CustomEnvironmentProps> = () => {
  const { scene } = useThree();

  useEffect(() => {
    const light = new DirectionalLight(0xffffff, Math.PI);
    light.position.set(100, 100, -300);

    light.castShadow = true;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    // const directionalLightHelper = new CameraHelper(light.shadow.camera); // Uncomment if needed
    // scene.add(directionalLightHelper);

    const textureLoader = new TextureLoader();
    const textureFlare0 = textureLoader.load(lensFlares["textFlare0"]);
    const textureFlare1 = textureLoader.load(lensFlares["textFlare1"]);
    const textureFlare2 = textureLoader.load(lensFlares["textFlare2"]);
    const textureFlare3 = textureLoader.load(lensFlares["textFlare3"]);

    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(textureFlare0, 1000, 0));
    lensflare.addElement(new LensflareElement(textureFlare1, 500, 0.15));
    lensflare.addElement(new LensflareElement(textureFlare2, 62.5, 0.4));
    lensflare.addElement(new LensflareElement(textureFlare3, 125, 0.6));
    lensflare.addElement(new LensflareElement(textureFlare3, 250, 0.8));

    light.add(lensflare);

    light.intensity = 0.7;

    scene.add(light);
  }, [scene]);

  return null;
};

export default CustomEnvironmentSunlight;
