// Fonctions utilitaires

function applyFontStyle(div, style) {
    if (!style) return;
    if (style.includes('B')) div.style.fontWeight = 'bold';
    if (style.includes('I')) div.style.fontStyle = 'italic';
    if (style.includes('U')) div.style.textDecoration = 'underline';
}

function convertAlign(align) {
    const map = { 'L': 'left', 'C': 'center', 'R': 'right', 'J': 'justify' };
    return map[align] || 'left';
}

function convertVAlign(valign) {
    const map = { 'T': 'flex-start', 'M': 'center', 'B': 'flex-end' };
    return map[valign] || 'center';
}

function generateBarcodePreview(element) {
    return `<div style="font-family: monospace; font-size: 10pt; text-align: center; padding-top: 5px;">
        <div style="display: flex; justify-content: space-around; margin-bottom: 5px;">
            ${element.code.split('').map(() => '<div style="width: 2px; height: 30px; background: #000;"></div>').join('')}
        </div>
        <div>${element.code}</div>
        <div style="font-size: 8pt; color: #666;">${element.barcodeType}</div>
    </div>`;
}

function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

function getElementTypeName(type) {
    const names = {
        text: 'Texte', textcell: 'Cellule', multicell: 'Texte multiligne',
        rect: 'Rectangle', line: 'Ligne', circle: 'Cercle',
        image: 'Image', barcode: 'Code-barres', header: 'En-tête', footer: 'Pied de page'
    };
    return names[type] || type;
}
