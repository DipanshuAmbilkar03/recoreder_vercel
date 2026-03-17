"use client";
import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

// Preload models
useGLTF.preload("/models/india/scene.gltf");
useGLTF.preload("/models/puit___water_well/scene.gltf");
useGLTF.preload("/models/terrain_test/scene.gltf");

export function IndiaModel(props) {
    const { scene } = useGLTF("/models/india/scene.gltf");
    useEffect(() => {
        // Center the model roughly
        scene.position.set(0, 0, 0);
    }, [scene]);
    return <primitive object={scene} {...props} />;
}

export function WaterWellModel(props) {
    const { scene } = useGLTF("/models/puit___water_well/scene.gltf");
    return <primitive object={scene} {...props} />;
}

export function TerrainModel(props) {
    const { scene } = useGLTF("/models/terrain_test/scene.gltf");
    return <primitive object={scene} {...props} />;
}
