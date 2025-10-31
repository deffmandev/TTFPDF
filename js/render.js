// Rendu des éléments

function renderElement(element, editor) {
    const page = document.getElementById('a4Page');
    const div = document.createElement('div');
    div.className = `element ${element.type}-element`;
    div.dataset.id = element.id;
    div.style.position = 'absolute'; // ✅ Forcer position absolute pour tous les éléments
    
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

    renderElementContent(div, element, zControls, editor);

    div.addEventListener('mousedown', (e) => startDrag(e, element, editor));
    div.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editor.editElement(element);
    });

    // ✅ Clic droit pour désélectionner l'élément
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.selectElement(null);
    });

    page.appendChild(div);
}

function needsResizeHandles(type) {
    return ['textcell', 'rect', 'circle', 'image', 'header', 'footer'].includes(type);
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
    // ✅ Empêcher le redimensionnement de ligne avec le bouton droit
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const page = document.getElementById('a4Page');
    const pageRect = page.getBoundingClientRect();
    const mmToPx = 3.7795275591;
    const pxToMm = 1 / mmToPx;

    const onMouseMove = (e) => {
        // ✅ Compensation du zoom pour les coordonnées des poignées de ligne
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        const adjustedClientY = e.clientY / zoomFactor;
        
        const x = (adjustedClientX - pageRect.left) * pxToMm;
        const y = (adjustedClientY - pageRect.top) * pxToMm;

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
    // ✅ Empêcher le redimensionnement avec le bouton droit
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const mmToPx = 3.7795275591;
    const pxToMm = 1 / mmToPx;

    // ✅ Compensation du zoom pour les coordonnées initiales du redimensionnement
    const zoomFactor = editor.zoom || 1;
    const startX = e.clientX / zoomFactor;
    const startY = e.clientY / zoomFactor;
    const startWidth = element.width || 0;
    const startHeight = element.height || element.minHeight || 0;
    const startPosX = element.x;
    const startPosY = element.y;

    const onMouseMove = (e) => {
        // ✅ Compensation du zoom pour les deltas de redimensionnement
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        const adjustedClientY = e.clientY / zoomFactor;
        
        const deltaX = (adjustedClientX - startX) * pxToMm;
        const deltaY = (adjustedClientY - startY) * pxToMm;

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
        // ✅ Empêcher l'action avec le bouton droit
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        moveElementUp(element, editor);
    });
    
    zControls.querySelector('.z-down').addEventListener('click', (e) => {
        // ✅ Empêcher l'action avec le bouton droit
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        moveElementDown(element, editor);
    });

    zControls.querySelector('.z-delete').addEventListener('click', async (e) => {
        // ✅ Empêcher l'action avec le bouton droit
        if (e.button !== 0) return;
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

function renderElementContent(div, element, zControls, editor) {
    
    switch(element.type) {
        case 'text':
        case 'text':
            div.textContent = element.content;
            div.style.fontSize = element.fontSize + 'pt';
            div.style.fontFamily = element.fontFamily;
            div.style.color = element.color;
            div.style.lineHeight = '1'; // Correspondre à FPDF
            div.style.margin = '0';
            div.style.padding = '0';
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
            }
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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
            }
            
            div.appendChild(cellContent);
            div.appendChild(zControls);
            break;

        case 'multicell':
            // ✅ Utiliser la fonction de multicell-handler.js
            renderMultiCellElement(div, element, zControls, editor);
            return;

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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
            }
            
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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
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

    // ✅ Empêcher le drag avec le bouton droit - réservé au déplacement de la feuille
    if (e.button !== 0) return;

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
    
    // ✅ Compensation du zoom pour l'offset initial
    const zoomFactor = editor.zoom || 1;
    const adjustedClientX = e.clientX / zoomFactor;
    const adjustedClientY = e.clientY / zoomFactor;
    
    editor.offset.x = adjustedClientX - pageRect.left - (currentX * mmToPx);
    editor.offset.y = adjustedClientY - pageRect.top - (currentY * mmToPx);

    const onMouseMove = (e) => {
        if (!editor.isDragging) return;
        
        const pxToMm = 1 / mmToPx;
        // ✅ Compensation du zoom pour les coordonnées de souris
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        const adjustedClientY = e.clientY / zoomFactor;
        
        const x = (adjustedClientX - pageRect.left - editor.offset.x) * pxToMm;
        const y = (adjustedClientY - pageRect.top - editor.offset.y) * pxToMm;
        
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

function renderElementContent(div, element, zControls, editor) {
    const mmToPx = 3.7795275591;
    
    switch(element.type) {
        case 'text':
        case 'text':
            div.textContent = element.content;
            div.style.fontSize = element.fontSize + 'pt';
            div.style.fontFamily = element.fontFamily;
            div.style.color = element.color;
            //div.style.lineHeight = '-1px'; // Correspondre à FPDF - pas de line-height supplémentaire
            div.style.margin = -(element.fontSize/4) + 'px 0 0 4px'; // Ajuster la marge supérieure pour centrer verticalement
            div.style.padding = '0'; // Supprimer tout padding
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.flexWrap = 'wrap';
            div.style.alignContent = 'flex-start';
            div.style.justifyContent = 'flex-start';
            //div.style.whiteSpace = 'nowrap';
            div.style.border = 'none';
            // Créer un cadre rouge exactement de la taille de la police
            //div.style.boxShadow = `0 0 0 0.1mm red`;
            div.style.background = 'transparent';
            //div.style.boxSizing = 'border-box';
            div.style.position = 'absolute';
            // Hauteur proportionnelle à la police pour un meilleur rendu visuel
            //div.style.height = element.fontSize/4;
            div.style.overflow = 'none';
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
            }
            applyFontStyle(div, element.fontStyle);
            // Pour les éléments texte, positionner les contrôles différemment
            zControls.style.position = 'absolute';
            zControls.style.top = '-35px';
            zControls.style.left = '50%';
            zControls.style.right = 'auto';
            zControls.style.transform = 'translateX(-50%)';
            zControls.style.pointerEvents = 'auto';
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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
            }
            
            div.appendChild(cellContent);
            div.appendChild(zControls);
            break;

        case 'multicell':
            // ✅ Utiliser la fonction de multicell-handler.js
            renderMultiCellElement(div, element, zControls, editor);
            return;

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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
            }
            
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
            
            // Appliquer la rotation si nécessaire
            if (element.rotation && element.rotation !== 0) {
                div.style.transform = `rotate(${-element.rotation}deg)`;
                div.style.transformOrigin = 'center center';
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

    // ✅ Empêcher le drag avec le bouton droit - réservé au déplacement de la feuille
    if (e.button !== 0) return;

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
    
    // ✅ Compensation du zoom pour l'offset initial
    const zoomFactor = editor.zoom || 1;
    const adjustedClientX = e.clientX / zoomFactor;
    const adjustedClientY = e.clientY / zoomFactor;
    
    editor.offset.x = adjustedClientX - pageRect.left - (currentX * mmToPx);
    editor.offset.y = adjustedClientY - pageRect.top - (currentY * mmToPx);

    const onMouseMove = (e) => {
        if (!editor.isDragging) return;
        
        const pxToMm = 1 / mmToPx;
        // ✅ Compensation du zoom pour les coordonnées de souris
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        const adjustedClientY = e.clientY / zoomFactor;
        
        const x = (adjustedClientX - pageRect.left - editor.offset.x) * pxToMm;
        const y = (adjustedClientY - pageRect.top - editor.offset.y) * pxToMm;
        
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