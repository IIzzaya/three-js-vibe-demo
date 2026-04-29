export default function elements(
    domSelectors: Record<string, string>,
): Record<string, HTMLElement> {
    const result: Record<string, HTMLElement> = {};

    Object.entries(domSelectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement) {
            result[key] = el;
        }
    });

    return result;
}
