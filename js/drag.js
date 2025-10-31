console.log('✅ drag.js chargé');

document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('a4Page');
    let draggedElement = null;
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    // DRAG & DROP
    page.addEventListener('mousedown', (e) => {
        const element = e.target.closest('.element');
        if (!element) return;
        
        // ✅ Empêcher le drag avec le bouton droit
        if (e.button !== 0) return;
        
        if (e.target.classList.contains('resize-handle')) return;
        if (document.body.classList.contains('resizing')) return;
        
        draggedElement = element;
        isDragging = false;
        
        // ✅ Compensation du zoom pour les coordonnées initiales
        const zoomFactor = editor.zoom || 1;
        startX = e.clientX / zoomFactor;
        startY = e.clientY / zoomFactor;
        
        const rect = element.getBoundingClientRect();
        const pageRect = page.getBoundingClientRect();
        initialX = rect.left - pageRect.left;
        initialY = rect.top - pageRect.top;
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!draggedElement || document.body.classList.contains('resizing')) return;
        
        // ✅ Compensation du zoom pour les deltas
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        const adjustedStartX = startX / zoomFactor;
        const adjustedClientY = e.clientY / zoomFactor;
        const adjustedStartY = startY / zoomFactor;
        
        const deltaX = adjustedClientX - adjustedStartX;
        const deltaY = adjustedClientY - adjustedStartY;
        
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            isDragging = true;
            document.body.classList.add('dragging');
        }
        
        if (isDragging) {
            const mmToPx = 3.7795275591;
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            draggedElement.style.left = (newX / mmToPx) + 'mm';
            draggedElement.style.top = (newY / mmToPx) + 'mm';
            
            const elementId = parseInt(draggedElement.getAttribute('data-id'));
            const element = editor.elements.find(el => el.id === elementId);
            if (element) {
                element.x = newX / mmToPx;
                element.y = newY / mmToPx;
                editor.updateRightPanelValues(element);
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (draggedElement) {
            draggedElement = null;
            isDragging = false;
            document.body.classList.remove('dragging');
        }
    });
    
    // REDIMENSIONNEMENT (sauf multicell qui est géré dans render.js)
    let isResizing = false;
    let resizeElement = null;
    let resizeStartWidth, resizeStartHeight;
    
    page.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('resize-handle')) return;
        
        // ✅ Empêcher le redimensionnement avec le bouton droit
        if (e.button !== 0) return;
        
        const elementDiv = e.target.closest('.element');
        const elementType = elementDiv.getAttribute('data-type');
        
        // Multicell géré dans render.js
        if (elementType === 'multicell') return;
        
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        resizeElement = elementDiv;
        // ✅ Compensation du zoom pour les coordonnées de départ du redimensionnement
        const zoomFactor = editor.zoom || 1;
        startX = e.clientX / zoomFactor;
        startY = e.clientY / zoomFactor;
        
        const elementId = parseInt(elementDiv.getAttribute('data-id'));
        const element = editor.elements.find(el => el.id === elementId);
        
        if (element) {
            resizeStartWidth = element.width;
            resizeStartHeight = element.height;
        }
        
        document.body.classList.add('resizing');
        elementDiv.classList.add('resizing');
        
        console.log('🔧 Début redimensionnement:', elementType);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !resizeElement) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // ✅ Compensation du zoom pour les deltas de redimensionnement
        const zoomFactor = editor.zoom || 1;
        const adjustedClientX = e.clientX / zoomFactor;
        const adjustedClientY = e.clientY / zoomFactor;
        
        const deltaX = adjustedClientX - startX;
        const deltaY = adjustedClientY - startY;
        
        const mmToPx = 3.7795275591;
        const deltaWidth = deltaX / mmToPx;
        const deltaHeight = deltaY / mmToPx;
        
        const newWidth = Math.max(10, resizeStartWidth + deltaWidth);
        const newHeight = Math.max(5, resizeStartHeight + deltaHeight);
        
        const elementId = parseInt(resizeElement.getAttribute('data-id'));
        const element = editor.elements.find(el => el.id === elementId);
        
        if (element) {
            element.width = newWidth;
            element.height = newHeight;
            
            resizeElement.style.width = newWidth + 'mm';
            resizeElement.style.height = newHeight + 'mm';
            
            editor.updateRightPanelValues(element);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeElement = null;
            document.body.classList.remove('resizing');
            document.querySelectorAll('.resizing').forEach(el => el.classList.remove('resizing'));
            
            console.log('🔧 Fin redimensionnement');
        }
    });
});
