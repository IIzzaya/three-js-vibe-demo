export interface AssetDefinition {
    name: string;
    type: "glbModel" | "imageTexture" | "cubeTexture" | "videoTexture";
    path: string | string[];
}

export interface AssetGroup {
    [location: string]: {
        assets: AssetDefinition[];
    };
}

const assets: AssetGroup[] = [
    {
        core: {
            assets: [
                {
                    name: "placeholder-character",
                    type: "glbModel",
                    path: "/models/placeholder-character.glb",
                },
            ],
        },
    },
];

export default assets;
