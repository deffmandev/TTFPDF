// Rendu des éléments

function renderElement(element, editor) {
    const page = document.getElementById('a4Page');
    const div = document.createElement('div');
    div.className = `element ${element.type}-element`;
    div.dataset.id = element.id;
    
    if (element.zIndex === undefined) {
        element.zIndex = editor.elements.indexOf(element);
    }
    div.style.zIndex = element.zIndex;

    const zControls = createZControls(element, editor);
    div.appendChild(zControls);

    // Positionner l'élément
    if (element.type === 'line') {
        div.style.left = Math.min(element.x1, element.x2) + 'mm';
        div.style.top = Math.min(element.y1, element.y2) + 'mm';
    } else {
        div.style.left = element.x + 'mm';
        div.style.top = element.y + 'mm';
    }

    // Ajouter les poignées de redimensionnement
    if (element.type === 'line') {
        addLineHandles(div, element, editor);
    } else if (needsResizeHandles(element.type)) {
        addResizeHandles(div, element, editor);
    }

    renderElementContent(div, element, zControls);

    div.addEventListener('mousedown', (e) => startDrag(e, element, editor));
    div.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editor.editElement(element);
    });

    page.appendChild(div);
}

function needsResizeHandles(type) {
    return ['textcell', 'multicell', 'rect', 'circle', 'image', 'header', 'footer'].includes(type);
}

function addResizeHandles(div, element, editor) {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.addEventListener('mousedown', (e) => startResize(e, element, editor, pos));
        div.appendChild(handle);
    });
}

function addLineHandles(div, element, editor) {
    // Calculer les positions relatives des poignées
    const dx = element.x2 - element.x1;
    const dy = element.y2 - element.y1;
    
    // Poignée pour le point de départ
    const handle1 = document.createElement('div');
    handle1.className = 'line-handle handle-start';
    handle1.style.position = 'absolute';
    handle1.style.left = '0px';
    handle1.style.top = '0px';
    handle1.addEventListener('mousedown', (e) => startLineResize(e, element, editor, 'start'));
    div.appendChild(handle1);

    // Poignée pour le point d'arrivée
    const handle2 = document.createElement('div');
    handle2.className = 'line-handle handle-end';
    handle2.style.position = 'absolute';
    handle2.addEventListener('mousedown', (e) => startLineResize(e, element, editor, 'end'));
    div.appendChild(handle2);
    
    updateLineHandles(div, element);
}

function updateLineHandles(div, element) {
    const dx = element.x2 - element.x1;
    const dy = element.y2 - element.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const mmToPx = 3.7795275591;
    const handle2 = div.querySelector('.handle-end');
    if (handle2) {
        handle2.style.left = (length * mmToPx) + 'px';
        handle2.style.top = '0px';
    }
}

function startLineResize(e, element, editor, handleType) {
    e.preventDefault();
    e.stopPropagation();

    const page = document.getElementById('a4Page');
    const pageRect = page.getBoundingClientRect();
    const mmToPx = 3.7795275591;
    const pxToMm = 1 / mmToPx;

    const onMouseMove = (e) => {
        const x = (e.clientX - pageRect.left) * pxToMm;
        const y = (e.clientY - pageRect.top) * pxToMm;

        if (handleType === 'start') {
            // Empêcher x1 >= x2 ou y1 >= y2
            element.x1 = Math.min(x, element.x2 - 1); // -1 pour éviter l'égalité
            element.y1 = Math.min(y, element.y2 - 1);
            element.x1 = Math.max(0, element.x1);
            element.y1 = Math.max(0, element.y1);
        } else {
            // Empêcher x2 <= x1 ou y2 <= y1
            element.x2 = Math.max(x, element.x1 + 1); // +1 pour éviter l'égalité
            element.y2 = Math.max(y, element.y1 + 1);
            element.x2 = Math.min(210, element.x2);
            element.y2 = Math.min(297, element.y2);
        }

        editor.refreshPage();
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function startResize(e, element, editor, position) {
    e.preventDefault();
    e.stopPropagation();

    const mmToPx = 3.7795275591;
    const pxToMm = 1 / mmToPx;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width || 0;
    const startHeight = element.height || element.minHeight || 0;
    const startPosX = element.x;
    const startPosY = element.y;

    const onMouseMove = (e) => {
        const deltaX = (e.clientX - startX) * pxToMm;
        const deltaY = (e.clientY - startY) * pxToMm;

        switch(position) {
            case 'bottom-right':
                element.width = Math.max(1, startWidth + deltaX);
                if (element.type === 'multicell') {
                    element.minHeight = Math.max(1, startHeight + deltaY);
                } else if (element.type === 'circle') {
                    // Pour les cercles, ajuster radiusX et radiusY
                    element.radiusX = element.width / 2;
                    element.radiusY = Math.max(1, startHeight + deltaY) / 2;
                } else {
                    element.height = Math.max(1, startHeight + deltaY);
                }
                break;
            case 'bottom-left':
                const newWidth = Math.max(1, startWidth - deltaX);
                element.width = newWidth;
                element.x = startPosX + (startWidth - newWidth);
                if (element.type === 'multicell') {
                    element.minHeight = Math.max(1, startHeight + deltaY);
                } else if (element.type === 'circle') {
                    // Pour les cercles, ajuster radiusX et radiusY
                    element.radiusX = element.width / 2;
                    element.radiusY = Math.max(1, startHeight + deltaY) / 2;
                } else {
                    element.height = Math.max(1, startHeight + deltaY);
                }
                break;
            case 'top-right':
                element.width = Math.max(1, startWidth + deltaX);
                const newHeight = Math.max(1, startHeight - deltaY);
                if (element.type === 'multicell') {
                    element.minHeight = newHeight;
                } else if (element.type === 'circle') {
                    // Pour les cercles, ajuster radiusX et radiusY
                    element.radiusX = element.width / 2;
                    element.radiusY = newHeight / 2;
                } else {
                    element.height = newHeight;
                }
                element.y = startPosY + (startHeight - newHeight);
                break;
            case 'top-left':
                const newW = Math.max(1, startWidth - deltaX);
                const newH = Math.max(1, startHeight - deltaY);
                element.width = newW;
                if (element.type === 'multicell') {
                    element.minHeight = newH;
                } else if (element.type === 'circle') {
                    // Pour les cercles, ajuster radiusX et radiusY
                    element.radiusX = element.width / 2;
                    element.radiusY = newH / 2;
                } else {
                    element.height = newH;
                }
                element.x = startPosX + (startWidth - newW);
                element.y = startPosY + (startHeight - newH);
                break;
        }

        if (element.type === 'circle') {
            element.radius = element.width / 2;
        }

        editor.refreshPage();
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function createZControls(element, editor) {
    const zControls = document.createElement('div');
    zControls.className = 'z-controls';
    zControls.innerHTML = `
        <button class="z-btn z-up" title="Avancer">+</button>
        <button class="z-btn z-down" title="Reculer">−</button>
        <button class="z-btn z-delete" title="Supprimer">🗑️</button>
    `;
    
    zControls.addEventListener('mousedown', (e) => e.stopPropagation());
    
    zControls.querySelector('.z-up').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        moveElementUp(element, editor);
    });
    
    zControls.querySelector('.z-down').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        moveElementDown(element, editor);
    });

    zControls.querySelector('.z-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const confirmed = await modalManager.showConfirm(
            'Voulez-vous vraiment supprimer cet élément ?',
            'Confirmation de suppression'
        );
        if (confirmed) {
            editor.elements = editor.elements.filter(el => el.id !== element.id);
            editor.refreshPage();
        }
    });

    return zControls;
}

function moveElementUp(element, editor) {
    const maxZ = Math.max(...editor.elements.map(e => e.zIndex || 0));
    if ((element.zIndex || 0) < maxZ) {
        element.zIndex = (element.zIndex || 0) + 1;
        editor.refreshPage();
    }
}

function moveElementDown(element, editor) {
    const minZ = Math.min(...editor.elements.map(e => e.zIndex || 0));
    if ((element.zIndex || 0) > minZ) {
        element.zIndex = (element.zIndex || 0) - 1;
        editor.refreshPage();
    }
}

function renderElementContent(div, element, zControls) {
    const mmToPx = 3.7795275591;
    
    switch(element.type) {
        case 'text':
            div.textContent = element.content;
            div.style.fontSize = element.fontSize + 'pt';
            div.style.fontFamily = element.fontFamily;
            div.style.color = element.color;
            div.style.lineHeight = '1'; // Correspondre à FPDF
            div.style.margin = '0';
            div.style.padding = '0';
            applyFontStyle(div, element.fontStyle);
            div.appendChild(zControls);
            break;

        case 'textcell':
            div.style.width = element.width + 'mm';
            div.style.height = element.height + 'mm';
            
            const cellContent = document.createElement('div');
            cellContent.textContent = element.content;
            cellContent.style.fontSize = element.fontSize + 'pt';
            cellContent.style.fontFamily = element.fontFamily;
            cellContent.style.color = element.color;
            cellContent.style.width = '100%';
            cellContent.style.height = '100%';
            cellContent.style.display = 'flex';
            cellContent.style.alignItems = 'center';
            cellContent.style.justifyContent = convertAlign(element.align);
            cellContent.style.pointerEvents = 'none';
            // Pour les cellules de texte : permettre au texte de déborder (comme FPDF Cell)
            cellContent.style.whiteSpace = 'nowrap';
            cellContent.style.overflow = 'visible';
            
            div.style.borderColor = element.borderColor;
            div.style.borderWidth = (element.borderWidth * mmToPx) + 'px';
            div.style.borderStyle = 'solid';
            div.style.backgroundColor = element.fillColor;
            div.style.boxSizing = 'border-box';
            div.style.overflow = 'visible'; // Permettre au texte de déborder du cadre
            applyFontStyle(cellContent, element.fontStyle);
            div.appendChild(cellContent);
            div.appendChild(zControls);
            break;

        case 'multicell':
            div.style.width = element.width + 'mm';
            div.style.minHeight = element.minHeight + 'mm';
            
            const multiContent = document.createElement('div');
            // Préserver les sauts de ligne comme dans FPDF MultiCell
            const formattedContent = element.content.replace(/\\n/g, '\n');
            multiContent.textContent = formattedContent;
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
            multiContent.style.padding = '4px';
            
            div.style.borderColor = element.borderColor;
            div.style.borderWidth = (element.borderWidth * mmToPx) + 'px';
            div.style.borderStyle = 'solid';
            div.style.backgroundColor = element.fillColor;
            div.style.boxSizing = 'border-box';
            applyFontStyle(multiContent, element.fontStyle);
            
            // Appliquer la hauteur de ligne pour correspondre au PDF FPDF
            // FPDF utilise la hauteur de ligne en mm, nous convertissons pour CSS
            const lineHeightMm = element.lineHeight || (element.fontSize * 1.2);
            const lineHeightPx = (lineHeightMm / 25.4) * 96; // Conversion mm vers px (96 DPI)
            multiContent.style.lineHeight = lineHeightPx + 'px';
            
            div.appendChild(multiContent);
            div.appendChild(zControls);
            break;

        case 'rect':
            div.style.width = element.width + 'mm';
            div.style.height = element.height + 'mm';
            div.style.borderColor = element.borderColor;
            div.style.borderWidth = (element.borderWidth * mmToPx) + 'px';
            div.style.borderStyle = 'solid';
            div.style.backgroundColor = element.fillColor;
            div.style.boxSizing = 'border-box';
            if (element.rounded && element.radius) {
                div.style.borderRadius = element.radius + 'mm';
            }
            break;

        case 'line':
            const dx = element.x2 - element.x1;
            const dy = element.y2 - element.y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            div.style.width = length + 'mm';
            div.style.height = (element.width * mmToPx) + 'px';
            div.style.backgroundColor = element.color;
            div.style.transform = `rotate(${angle}deg)`;
            div.style.transformOrigin = '0 0';
            break;

        case 'circle':
            const radiusX = element.radiusX || element.radius || 15;
            const radiusY = element.radiusY || element.radius || 15;
            const sizeX = radiusX * 2;
            const sizeY = radiusY * 2;
            div.style.width = sizeX + 'mm';
            div.style.height = sizeY + 'mm';
            div.style.borderRadius = '50%';
            div.style.borderColor = element.borderColor;
            div.style.borderWidth = (element.borderWidth * mmToPx) + 'px';
            div.style.borderStyle = 'solid';
            div.style.backgroundColor = element.fillColor;
            div.style.boxSizing = 'border-box';
            
            // Mettre à jour width et height pour la logique de redimensionnement
            element.width = sizeX;
            element.height = sizeY;
            break;

        case 'image':
            // Utiliser des dimensions exactes pour correspondre au PDF
            div.style.width = element.width + 'mm';
            div.style.height = element.height + 'mm';
            div.style.boxSizing = 'border-box';
            div.style.overflow = 'visible';
            div.style.position = 'relative';
            div.style.border = 'none'; // Pas de bordure par défaut
            
            const img = document.createElement('img');
            img.src = element.src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'fill'; // Remplir exactement comme FPDF
            img.style.pointerEvents = 'none';
            img.style.display = 'block';
            img.style.position = 'absolute';
            img.style.left = '0';
            img.style.top = '0';
            img.style.margin = '0';
            img.style.padding = '0';
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                img.style.transform = `rotate(${-element.rotation}deg)`;
                img.style.transformOrigin = 'center center';
            }
            
            // Appliquer l'opacité si nécessaire
            if (element.opacity && element.opacity < 100) {
                img.style.opacity = element.opacity / 100;
            }
            
            div.appendChild(img);
            
            // Ajouter une bordure seulement si explicitement demandée
            if (element.border === 1) {
                const mmToPx = 3.7795275591;
                div.style.border = (element.borderWidth || 0.1) * mmToPx + 'px solid ' + (element.borderColor || '#000000');
            }
            
            // Ajouter les contrôles z-index
            div.appendChild(zControls);
            break;

        case 'barcode':
            div.style.width = element.width + 'mm';
            div.style.height = element.height + 'mm';
            div.style.border = '1px solid #ccc';
            div.style.backgroundColor = '#f9f9f9';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.fontSize = '12px';
            div.style.color = '#666';
            div.style.fontFamily = 'monospace';
            
            const barcodeContent = document.createElement('div');
            barcodeContent.textContent = `${element.barcodeType || 'C128'}: ${element.code || '123456789'}`;
            barcodeContent.style.pointerEvents = 'none';
            
            div.appendChild(barcodeContent);
            div.appendChild(zControls);
            break;

        case 'header':
        case 'footer':
            div.style.width = element.width + 'mm';
            div.style.height = element.height + 'mm';
            
            const headerFooterContent = document.createElement('div');
            headerFooterContent.textContent = element.content.replace('{nb}', '1');
            headerFooterContent.style.fontSize = element.fontSize + 'pt';
            headerFooterContent.style.fontFamily = element.fontFamily;
            headerFooterContent.style.color = element.color;
            headerFooterContent.style.width = '100%';
            headerFooterContent.style.height = '100%';
            headerFooterContent.style.display = 'flex';
            headerFooterContent.style.alignItems = 'center';
            headerFooterContent.style.justifyContent = convertAlign(element.align);
            headerFooterContent.style.pointerEvents = 'none';
            
            div.style.backgroundColor = element.fillColor;
            div.style.boxSizing = 'border-box';
            if (element.borderWidth) {
                div.style.border = (element.borderWidth * mmToPx) + 'px solid ' + (element.borderColor || '#000000');
            }
            applyFontStyle(headerFooterContent, element.fontStyle);
            div.appendChild(headerFooterContent);
            div.appendChild(zControls);
            break;
    }
}

function startDrag(e, element, editor) {
    if (e.target.classList.contains('z-btn') || 
        e.target.closest('.z-controls') ||
        e.target.classList.contains('resize-handle') ||
        e.target.classList.contains('line-handle')) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    editor.selectElement(element);
    editor.isDragging = true;
    editor.draggedElement = element;
    
    const page = document.getElementById('a4Page');
    const pageRect = page.getBoundingClientRect();
    const mmToPx = 3.7795275591;
    
    let currentX, currentY;
    
    if (element.type === 'line') {
        // Pour les lignes, utiliser le centre comme point de référence
        currentX = (element.x1 + element.x2) / 2;
        currentY = (element.y1 + element.y2) / 2;
    } else {
        currentX = element.x;
        currentY = element.y;
    }
    
    editor.offset.x = e.clientX - pageRect.left - (currentX * mmToPx);
    editor.offset.y = e.clientY - pageRect.top - (currentY * mmToPx);

    const onMouseMove = (e) => {
        if (!editor.isDragging) return;
        
        const pxToMm = 1 / mmToPx;
        const x = (e.clientX - pageRect.left - editor.offset.x) * pxToMm;
        const y = (e.clientY - pageRect.top - editor.offset.y) * pxToMm;
        
        if (element.type === 'line') {
            // Déplacer la ligne en gardant ses dimensions
            const dx = element.x2 - element.x1;
            const dy = element.y2 - element.y1;
            
            // Bloquer le déplacement si dx ou dy est nul (ligne dégénérée)
            if (dx === 0 || dy === 0) {
                return; // Ne pas déplacer si la ligne est dégénérée
            }
            
            // Calculer le nouveau centre
            const centerX = x;
            const centerY = y;
            
            // Recalculer x1,y1 et x2,y2
            element.x1 = centerX - dx / 2;
            element.y1 = centerY - dy / 2;
            element.x2 = centerX + dx / 2;
            element.y2 = centerY + dy / 2;
            
            // S'assurer que x1 <= x2 et y1 <= y2 pendant le déplacement
            if (element.x1 > element.x2) {
                [element.x1, element.x2] = [element.x2, element.x1];
            }
            if (element.y1 > element.y2) {
                [element.y1, element.y2] = [element.y2, element.y1];
            }
            
            // Contraindre dans la page
            const minX = Math.min(element.x1, element.x2);
            const maxX = Math.max(element.x1, element.x2);
            const minY = Math.min(element.y1, element.y2);
            const maxY = Math.max(element.y1, element.y2);
            
            if (minX < 0) {
                const offset = -minX;
                element.x1 += offset;
                element.x2 += offset;
            }
            if (maxX > 210) {
                const offset = maxX - 210;
                element.x1 -= offset;
                element.x2 -= offset;
            }
            if (minY < 0) {
                const offset = -minY;
                element.y1 += offset;
                element.y2 += offset;
            }
            if (maxY > 297) {
                const offset = maxY - 297;
                element.y1 -= offset;
                element.y2 -= offset;
            }
        } else {
            // Contraintes normales pour les autres éléments
            const maxX = 210 - (element.width || 0);
            const maxY = 297 - (element.minHeight || element.height || 0);
            
            element.x = Math.max(0, Math.min(x, maxX));
            element.y = Math.max(0, Math.min(y, maxY));
        }
        
        const div = document.querySelector(`[data-id="${element.id}"]`);
        if (element.type === 'line') {
            div.style.left = Math.min(element.x1, element.x2) + 'mm';
            div.style.top = Math.min(element.y1, element.y2) + 'mm';
        } else {
            div.style.left = element.x + 'mm';
            div.style.top = element.y + 'mm';
        }
        
        if (element.type === 'line') {
            const dx = element.x2 - element.x1;
            const dy = element.y2 - element.y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            div.style.width = length + 'mm';
            div.style.transform = `rotate(${angle}deg)`;
            updateLineHandles(div, element);
        }
    };

    const onMouseUp = () => {
        editor.isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        editor.draggedElement = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function generateBarcodePreview(element) {
    const code = element.code || '123456789';
    const type = element.barcodeType || 'C128';
    
    return `<div style="font-size: 10px; color: #666;">${type}: ${code}</div>`;
}

function generateCode39Preview(code) {
    // Code 39 avec encodage identique à PHP
    const chars = ('*' + code.toUpperCase() + '*').split('');
    let bars = '';
    
    const code39Table = {
        '0': '111221211', '1': '211211112', '2': '112211112', '3': '212211111',
        '4': '111221112', '5': '211221111', '6': '112221111', '7': '111211212',
        '8': '211211211', '9': '112211211', 'A': '211112112', 'B': '112112112',
        'C': '212112111', 'D': '111122112', 'E': '211122111', 'F': '112122111',
        'G': '111112212', 'H': '211112211', 'I': '112112211', 'J': '111122211',
        'K': '211111122', 'L': '112111122', 'M': '212111121', 'N': '111121122',
        'O': '211121121', 'P': '112121121', 'Q': '111111222', 'R': '211111221',
        'S': '112111221', 'T': '111121221', 'U': '221111112', 'V': '122111112',
        'W': '222111111', 'X': '121121112', 'Y': '221121111', 'Z': '122121111',
        '-': '121111212', '.': '221111211', ' ': '122111211', '$': '121212111',
        '/': '121211121', '+': '121112121', '%': '111212121', '*': '121121211'
    };
    
    chars.forEach(char => {
        const pattern = code39Table[char];
        if (pattern) {
            for(let i = 0; i < pattern.length; i++) {
                const barWidth = parseInt(pattern[i]);
                const width = barWidth + 'px';
                const color = (i % 2 === 0) ? 'black' : 'white';
                bars += `<div style="display: inline-block; width: ${width}; height: 24px; background: ${color};"></div>`;
            }
        }
        // Espace inter-caractères (comme dans PHP)
        bars += '<div style="display: inline-block; width: 1px; height: 24px; background: white;"></div>';
    });
    
    return `<div style="display: flex; align-items: end; background: white; border: 1px solid #ddd; padding: 4px; margin: 2px 0;">${bars}</div>`;
}

function generateCode128Preview(code) {
    // Code 128 avec logique simplifiée mais cohérente avec PHP
    let bars = '';
    
    // Start Code B (comme dans PHP simplifié)
    bars += '<div style="display: inline-block; width: 2px; height: 28px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 28px; background: white;"></div>';
    bars += '<div style="display: inline-block; width: 2px; height: 28px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 3px; height: 28px; background: white;"></div>';
    
    // Encodage des données (même logique que PHP)
    for(let i = 0; i < Math.min(code.length, 15); i++) {
        const char = code[i];
        const charCode = char.charCodeAt(0) - 32; // Même calcul que PHP
        
        // Pattern basé sur les bits du charCode
        for(let j = 0; j < 6; j++) {
            const bit = (charCode >> j) & 1;
            const width = bit ? '2px' : '1px';
            const color = (j % 2 === 0) ? 'black' : 'white';
            bars += `<div style="display: inline-block; width: ${width}; height: 28px; background: ${color};"></div>`;
        }
    }
    
    // Checksum et stop (simplifié comme PHP)
    bars += '<div style="display: inline-block; width: 2px; height: 28px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 3px; height: 28px; background: white;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 28px; background: black;"></div>';
    
    return `<div style="display: flex; align-items: end; background: white; border: 1px solid #ddd; padding: 4px; margin: 2px 0;">${bars}</div>`;
}

function generateEAN13Preview(code) {
    // EAN-13 avec logique identique à PHP
    let bars = '';
    
    // Calcul du checksum (même fonction que PHP)
    let fullCode = code.padEnd(12, '0').substring(0, 12);
    const checksum = calculateEAN13Checksum(fullCode);
    fullCode += checksum;
    
    // Patterns identiques à PHP
    const leftOdd = ['3211', '2221', '2122', '1411', '1132'];
    const leftEven = ['1123', '1222', '2212', '1141', '2311'];
    const rightPatterns = ['3211', '2221', '2122', '1411', '1132'];
    
    // Pattern de parité identique à PHP
    const firstDigit = parseInt(fullCode[0]);
    const parityPattern = [
        'OOOOOO', 'OOEOEE', 'OOEEOE', 'OOEEEO', 'OEOOEE',
        'OEEOOE', 'OEEEOO', 'OEOEOE', 'OEOEEO', 'OOEOEO'
    ][firstDigit];
    
    // Garde gauche
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: white;"></div>';
    
    // 6 chiffres de gauche avec parité
    for(let i = 1; i <= 6; i++) {
        const digit = parseInt(fullCode[i]);
        const isEven = parityPattern[i-1] === 'E';
        const pattern = isEven ? leftEven[digit] : leftOdd[digit];
        
        for(let j = 0; j < pattern.length; j++) {
            const width = pattern[j] + 'px';
            const color = (j % 2 === 0) ? 'black' : 'white';
            bars += `<div style="display: inline-block; width: ${width}; height: 32px; background: ${color};"></div>`;
        }
    }
    
    // Séparateur central (identique à PHP)
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: white;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: white;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: white;"></div>';
    
    // 6 chiffres de droite
    for(let i = 7; i <= 12; i++) {
        const digit = parseInt(fullCode[i]);
        const pattern = rightPatterns[digit];
        
        for(let j = 0; j < pattern.length; j++) {
            const width = pattern[j] + 'px';
            const color = (j % 2 === 0) ? 'black' : 'white';
            bars += `<div style="display: inline-block; width: ${width}; height: 32px; background: ${color};"></div>`;
        }
    }
    
    // Garde droite
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: black;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: white;"></div>';
    bars += '<div style="display: inline-block; width: 1px; height: 40px; background: black;"></div>';
    
    return `<div style="display: flex; align-items: end; background: white; border: 1px solid #ddd; padding: 4px; margin: 2px 0;">${bars}</div>`;
}

function calculateEAN13Checksum(code) {
    let sum = 0;
    for(let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum.toString();
}

function generateQRCodePreview(code) {
    // QR Code version 1 (21x21) avec pattern correct
    const size = 21;
    let qrGrid = '';
    
    for(let y = 0; y < size; y++) {
        for(let x = 0; x < size; x++) {
            let isBlack = false;
            
            // Coins de position (7x7 avec motifs internes)
            if ((x < 7 && y < 7) || (x > size-8 && y < 7) || (x < 7 && y > size-8)) {
                // Carré extérieur noir
                if ((x < 7 && y < 7 && x >= 0 && x <= 6 && y >= 0 && y <= 6) ||
                    (x > size-8 && y < 7 && x >= size-7 && x <= size-1 && y >= 0 && y <= 6) ||
                    (x < 7 && y > size-8 && x >= 0 && x <= 6 && y >= size-7 && y <= size-1)) {
                    isBlack = true;
                }
            // Coins de position (7x7 avec motifs internes)
            } else if ((x < 7 && y < 7) || (x > size-8 && y < 7) || (x < 7 && y > size-8)) {
                // Carré extérieur noir
                if ((x < 7 && y < 7 && x >= 0 && x <= 6 && y >= 0 && y <= 6) ||
                    (x > size-8 && y < 7 && x >= size-7 && x <= size-1 && y >= 0 && y <= 6) ||
                    (x < 7 && y > size-8 && x >= 0 && x <= 6 && y >= size-7 && y <= size-1)) {
                    isBlack = true;
                }
                // Carré intérieur blanc
                if ((x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                    (x >= size-5 && x <= size-3 && y >= 2 && y <= 4) ||
                    (x >= 2 && x <= 4 && y >= size-5 && y <= size-3)) {
                    isBlack = false;
                }
            }
            // Lignes de synchronisation horizontales et verticales
            else if ((x === 6 && y >= 0 && y <= 8) || (x === 6 && y >= size-7 && y <= size-1) ||
                     (y === 6 && x >= 8 && x <= size-1)) {
                isBlack = true;
            }
            // Données (pattern déterministe basé sur le code)
            else {
                // Utiliser un hash simple du code pour générer un pattern déterministe
                const hash = simpleHash(code);
                const index = y * size + x;
                isBlack = ((hash + index) % 17) < 8;
            }
            qrGrid += `<div style="display: inline-block; width: 3px; height: 3px; background: ${isBlack ? 'black' : 'white'}; border: 0.5px solid #f5f5f5;"></div>`;
        }
        qrGrid += '<br>';
    }
    return `<div style="font-size: 6px; line-height: 1; text-align: center; background: white; border: 1px solid #ddd; padding: 4px; margin: 2px 0;">${qrGrid}</div>`;
}

function simpleHash(str) {
    let hash = 0;
    for(let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir en 32 bits
    }
    return Math.abs(hash);
}
