export function sanitizeHtml2CanvasNode(node: HTMLElement | Element) {
    if (!(node instanceof HTMLElement)) return

    const compStyle = window.getComputedStyle(node)
    const props = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor']

    props.forEach(prop => {
        const val = compStyle[prop as any]
        if (val && (val.includes('lab') || val.includes('oklab') || val.includes('oklch') || val.includes('lch') || val.includes('color('))) {
            node.dataset[`orig_${prop}`] = node.style[prop as any] || 'unset'

            let safeColor = '#000000'
            if (prop === 'backgroundColor') safeColor = 'transparent'
            if (prop.startsWith('border')) safeColor = '#d4d4d8' // zinc-300 equivalent
            if (prop === 'outlineColor') safeColor = 'transparent'

            // Convert camelCase prop to kebab-case
            const kebabProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
            node.style.setProperty(kebabProp, safeColor, 'important')
        }
    })
}

export function restoreHtml2CanvasNode(node: HTMLElement | Element) {
    if (!(node instanceof HTMLElement)) return

    const props = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor']

    props.forEach(prop => {
        const orig = node.dataset[`orig_${prop}`]
        if (orig) {
            const kebabProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
            if (orig === 'unset') {
                node.style.removeProperty(kebabProp)
            } else {
                (node.style as any)[prop] = orig
            }
            delete node.dataset[`orig_${prop}`]
        }
    })
}

/**
 * Sweeps the entire element tree before html2canvas processes it
 * to strip unsupported CSS v4 color formats (oklch, lab, etc).
 */
export function prepareElementForPdf(element: HTMLElement) {
    // Save element transforms
    element.dataset['orig_transform'] = element.style.transform || 'unset'
    element.style.transform = 'none'

    sanitizeHtml2CanvasNode(element)
    const children = element.querySelectorAll('*')
    children.forEach((node) => sanitizeHtml2CanvasNode(node))

    // Force browser reflow to recount getBoundingClientRect() exactly at 1:1 scale
    // This fixes "doble fila" (overlapping/jumping words) in html2canvas!
    void element.offsetHeight
}

/**
 * Restores the element tree to its original reactive tailwind state
 */
export function restoreElementAfterPdf(element: HTMLElement) {
    const origTransform = element.dataset['orig_transform']
    if (origTransform) {
        if (origTransform === 'unset') {
            element.style.removeProperty('transform')
        } else {
            element.style.transform = origTransform
        }
        delete element.dataset['orig_transform']
    }

    restoreHtml2CanvasNode(element)
    const children = element.querySelectorAll('*')
    children.forEach((node) => restoreHtml2CanvasNode(node))
}
