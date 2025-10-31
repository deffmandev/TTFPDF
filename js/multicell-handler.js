console.log('✅ multicell-handler.js chargé');

/**
 * Gère le rendu spécifique des éléments MultiCell
 */
function renderMultiCellElement(div, element, zControls, editor) {
    const mmToPx = 3.7795275591;
    
    // ✅ CALCULER LA HAUTEUR AVANT LE RENDU
    calculateMultiCellHeight(element);
    
    // Configuration du conteneur principal
    div.style.width = element.width + 'mm';
    div.style.minHeight = element.minHeight + 'mm'; // Utiliser la hauteur calculée
    div.style.height = 'auto';
    div.style.maxHeight = 'none';
    div.style.position = 'absolute'; // ✅ Changé de 'relative' à 'absolute'
    div.style.boxSizing = 'border-box';
    
    // Styles de bordure et fond
    div.style.borderColor = element.borderColor;
    div.style.borderWidth = (element.borderWidth * mmToPx) + 'px';
    div.style.borderStyle = 'solid';
    div.style.backgroundColor = element.fillColor;
    
    // Appliquer la rotation si nécessaire
    if (element.rotation && element.rotation !== 0) {
        div.style.transform = `rotate(${-element.rotation}deg)`;
        div.style.transformOrigin = 'center center';
    }
    
    // Contenu du multicell
    const multiContent = document.createElement('div');
    multiContent.className = 'multicell-content';
    
    // Préserver les sauts de ligne comme dans FPDF MultiCell
    const formattedContent = element.content.replace(/\\n/g, '\n');
    multiContent.textContent = formattedContent;
    
    // Styles du texte
    multiContent.style.fontSize = element.fontSize + 'pt';
    multiContent.style.fontFamily = element.fontFamily;
    multiContent.style.color = element.color;
    multiContent.style.width = '100%';
    multiContent.style.minHeight = '100%';
    multiContent.style.textAlign = convertAlign(element.align);
    multiContent.style.pointerEvents = 'none';
    multiContent.style.wordWrap = 'break-word';
    multiContent.style.whiteSpace = 'pre-line'; // Préserver les sauts de ligne
    multiContent.style.overflowWrap = 'break-word';
    multiContent.style.padding = '1px 4px'; // ✅ Supprimé le padding pour correspondre au PDF
    
    // Appliquer le style de police
    applyFontStyle(multiContent, element.fontStyle);
    
    // Hauteur de ligne pour correspondre au PDF FPDF
    const lineHeightMm = element.lineHeight || (element.fontSize * 1.2);
    const lineHeightPx = (lineHeightMm / 25.4) * 96; // Conversion mm vers px (96 DPI)
    multiContent.style.lineHeight = lineHeightPx + 'px';
    
    div.appendChild(multiContent);
    
    // ⛔ AJOUTER UNIQUEMENT LA POIGNÉE HORIZONTALE (pas les 4 coins)
    addMultiCellResizeHandle(div, element, editor);
    
    // Ajouter les contrôles z-index
    div.appendChild(zControls);
}

/**
 * Ajoute UNE SEULE poignée de redimensionnement HORIZONTALE pour MultiCell
 * (barre verticale à droite)
 */
function addMultiCellResizeHandle(div, element, editor) {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle multicell-resize';
    resizeHandle.innerHTML = '⇔';
    resizeHandle.title = 'Redimensionner la largeur uniquement (hauteur automatique)';
    
    // Style de la poignée (barre verticale à droite)
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.top = '0';
    resizeHandle.style.width = '8px';
    resizeHandle.style.height = '100%';
    resizeHandle.style.background = 'rgba(0, 123, 255, 0.3)';
    resizeHandle.style.borderLeft = '2px solid #007bff';
    resizeHandle.style.cursor = 'ew-resize';
    resizeHandle.style.zIndex = '1000';
    resizeHandle.style.display = 'flex';
    resizeHandle.style.alignItems = 'center';
    resizeHandle.style.justifyContent = 'center';
    resizeHandle.style.fontSize = '10px';
    resizeHandle.style.color = '#007bff';
    resizeHandle.style.userSelect = 'none';
    
    resizeHandle.addEventListener('mousedown', (e) => {
        startMultiCellResize(e, element, editor);
    });
    
    div.appendChild(resizeHandle);
}

/**
 * Gère le redimensionnement HORIZONTAL UNIQUEMENT du MultiCell
 */
function startMultiCellResize(e, element, editor) {
    e.preventDefault();
    e.stopPropagation();

    const mmToPx = 3.7795275591;
    const pxToMm = 1 / mmToPx;

    // ✅ Compensation du zoom pour les coordonnées initiales du redimensionnement MultiCell
    const zoomFactor = editor.zoom || 1;
    const startX = e.clientX / zoomFactor;
    const startWidth = element.width || 100;

    console.log('🔧 Début redimensionnement MultiCell - Largeur initiale:', startWidth, 'mm');

    const onMouseMove = (e) => {
        // ✅ Compensation du zoom pour les deltas de redimensionnement MultiCell
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        
        const deltaX = (adjustedClientX - startX) * pxToMm;
        const newWidth = Math.max(10, startWidth + deltaX);
        
        // ⛔ BLOQUER LA HAUTEUR - Modifier uniquement la largeur
        element.width = newWidth;
        
        // Recalculer automatiquement la hauteur en fonction du contenu
        calculateMultiCellHeight(element);
        
        console.log('📏 MultiCell - L:', newWidth.toFixed(1), 'mm, H auto:', (element.minHeight || 0).toFixed(1), 'mm');
        
        // Rafraîchir l'affichage
        editor.refreshPage();
    };

    const onMouseUp = () => {
        console.log('🔧 Fin redimensionnement MultiCell - Largeur finale:', element.width.toFixed(1), 'mm');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

/**
 * Calcule automatiquement la hauteur d'un MultiCell en fonction du contenu
 */
function calculateMultiCellHeight(element) {
    const fontSize = element.fontSize || 10;
    
    // ✅ Hauteur de ligne fixe à 5mm pour affichage correct
    const lineHeightMm = 5;
    const width = element.width || 100;
    
    // Calculer le nombre total de lignes visuelles
    const totalVisualLines = Math.ceil((element.content.split('\n').length * lineHeightMm) / lineHeightMm);
    
    // Calculer la hauteur du contenu
    const contentHeight = totalVisualLines * lineHeightMm;
    
    // Ajouter le padding vertical seulement si plusieurs lignes
    const paddingVertical = totalVisualLines > 1 ? 8 : 0; // ✅ N'ajoute pas le 8mm si une seule ligne
    
    // Hauteur totale du cadre
    const totalHeight = totalVisualLines === 1 ? lineHeightMm : contentHeight + paddingVertical;
    
    // Mettre à jour l'élément
    element.minHeight = totalHeight;
    
    console.log(`📏 MultiCell H auto: ${totalVisualLines} lignes × ${lineHeightMm.toFixed(2)}mm ${totalVisualLines > 1 ? '+ 8mm' : ''} = ${totalHeight.toFixed(1)}mm`);
    
    return totalHeight;
}

/**
 * Convertit l'alignement FPDF en alignement CSS
 */
function convertAlign(align) {
    const alignMap = {
        'L': 'left',
        'C': 'center',
        'R': 'right',
        'J': 'justify'
    };
    return alignMap[align] || 'left';
}

/**
 * Applique les styles de police (gras, italique, souligné)
 */
function applyFontStyle(element, fontStyle) {
    if (!fontStyle) return;
    
    if (fontStyle.includes('B')) {
        element.style.fontWeight = 'bold';
    }
    if (fontStyle.includes('I')) {
        element.style.fontStyle = 'italic';
    }
    if (fontStyle.includes('U')) {
        element.style.textDecoration = 'underline';
    }
}
