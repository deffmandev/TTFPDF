// Fonctions utilitaires

function convertAlign(align) {
    const mapping = {
        'left': 'flex-start',
        'center': 'center',
        'right': 'flex-end',
        'justify': 'space-between'
    };
    return mapping[align] || 'flex-start';
}

function applyFontStyle(element, fontStyle) {
    if (!fontStyle) return;
    
    const { bold, italic, underline } = fontStyle;
    
    if (bold) {
        element.style.fontWeight = 'bold';
    }
    if (italic) {
        element.style.fontStyle = 'italic';
    }
    if (underline) {
        element.style.textDecoration = 'underline';
    }
}

function getElementTypeName(type) {
    const names = {
        'text': 'Texte',
        'textcell': 'Cellule de texte',
        'multicell': 'Texte multiligne',
        'rect': 'Rectangle',
        'line': 'Ligne',
        'circle': 'Cercle',
        'image': 'Image',
        'barcode': 'Code-barres',
        'header': 'En-tête',
        'footer': 'Pied de page'
    };
    return names[type] || type;
}