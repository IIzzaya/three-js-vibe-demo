import * as THREE from "three";

export default class Nametag {
    createNametag(size = 16, baseWidth = 150, name = "John Doe"): THREE.Sprite {
        const borderSize = 2;
        const ctx = document.createElement("canvas").getContext("2d")!;
        const font = `200 ${size}px Arial`;
        ctx.font = font;
        const textWidth = ctx.measureText(name).width;

        const doubleBorderSize = borderSize * 2;
        const width = baseWidth + doubleBorderSize;
        const height = size + doubleBorderSize;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        ctx.font = font;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, width, height);

        const scaleFactor = Math.min(1, baseWidth / textWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, 1);
        ctx.fillStyle = "white";
        ctx.fillText(name, 0, 0);

        const canvasTexture = new THREE.CanvasTexture(ctx.canvas);
        canvasTexture.minFilter = THREE.LinearFilter;
        canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
        canvasTexture.wrapT = THREE.ClampToEdgeWrapping;

        const nameMaterial = new THREE.SpriteMaterial({
            map: canvasTexture,
            transparent: true,
        });

        const labelBaseScale = 0.01;
        const label = new THREE.Sprite(nameMaterial);
        label.position.y = 5;
        label.scale.x = ctx.canvas.width * labelBaseScale;
        label.scale.y = ctx.canvas.height * labelBaseScale;

        return label;
    }

    update(): void {}
}
