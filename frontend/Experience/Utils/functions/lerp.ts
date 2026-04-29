export default function lerp(
    start: number,
    end: number,
    factor: number,
): number {
    return (1 - factor) * start + factor * end;
}
