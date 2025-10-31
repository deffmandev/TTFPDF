// Classe principale PDFEditor

class PDFEditor {
    constructor() {
        this.elements = [];
        this.selectedElement = null;
        this.pageSettings = {
            orientation: 'P',
            unit: 'mm',
            format: 'A4'
        };
        this.draggedElement = null;
        this.offset = { x: 0, y: 0 };
        this.isDragging = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Texte
        document.getElementById('addText').addEventListener('click', () => this.addElement(ElementFactory.createText()));
        document.getElementById('addTextCell').addEventListener('click', () => this.addElement(ElementFactory.createTextCell()));
        document.getElementById('addMultiCell').addEventListener('click', () => this.addElement(ElementFactory.createMultiCell()));
        
        // Formes
        document.getElementById('addRect').addEventListener('click', () => this.addElement(ElementFactory.createRect()));
        document.getElementById('addLine').addEventListener('click', () => this.addElement(ElementFactory.createLine()));
        document.getElementById('addCircle').addEventListener('click', () => this.addElement(ElementFactory.createCircle()));
        
        // Médias
        document.getElementById('addImage').addEventListener('click', () => document.getElementById('imageInput').click());
        
        // Page
        document.getElementById('addHeader').addEventListener('click', () => this.addElement(ElementFactory.createHeader()));
        document.getElementById('addFooter').addEventListener('click', () => this.addElement(ElementFactory.createFooter()));
        
        // Fichier
        document.getElementById('saveFile').addEventListener('click', () => this.saveToFile());
        document.getElementById('openFile').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('exportPHP').addEventListener('click', () => this.exportToPHP());
        document.getElementById('saveToServer').addEventListener('click', () => this.saveToServer());
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadFromFile(e));
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImageUpload(e));

        // Modale
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('saveChanges').addEventListener('click', () => this.saveElementChanges());
        document.getElementById('deleteElement').addEventListener('click', () => this.deleteSelectedElement());

        window.addEventListener('click', (e) => {
            if (e.target.id === 'editModal') this.closeModal();
        });
    }

    addElement(element) {
        this.elements.push(element);
        renderElement(element, this);
    }

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        modalManager.showLoading('Téléchargement de l\'image...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            const imageData = event.target.result;
            const timestamp = Date.now();
            const extension = file.name.split('.').pop().toLowerCase();
            const filename = `image_${timestamp}.${extension}`;

            try {
                // Télécharger l'image sur le serveur
                const response = await fetch('upload_image.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        imageData: imageData,
                        filename: filename
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    // Créer l'élément image avec le chemin serveur
                    const element = {
                        id: Date.now(),
                        type: 'image',
                        x: 50,
                        y: 50,
                        width: 100,
                        height: 100,
                        src: imageData, // Pour l'affichage dans l'éditeur
                        serverPath: result.url, // Pour la génération du PDF
                        format: result.type
                    };
                    
                    this.addElement(element);
                    modalManager.hideLoading();
                    console.log('✅ Image téléchargée:', result.url);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                modalManager.hideLoading();
                console.error('❌ Erreur upload image:', error);
                
                // En cas d'erreur, créer quand même l'élément avec base64
                const element = {
                    id: Date.now(),
                    type: 'image',
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    src: imageData,
                    serverPath: null,
                    format: extension.toUpperCase()
                };
                this.addElement(element);
                
                modalManager.warning('Image ajoutée mais non téléchargée sur le serveur.\n\nElle sera encodée en base64 dans le PDF.');
            }
        };
        
        reader.onerror = () => {
            modalManager.hideLoading();
            modalManager.error('Erreur lors de la lecture du fichier image.');
        };
        
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    selectElement(element) {
        document.querySelectorAll('.element').forEach(el => el.classList.remove('selected'));
        const div = document.querySelector(`[data-id="${element.id}"]`);
        if (div) div.classList.add('selected');
        this.selectedElement = element;
    }

    editElement(element) {
        this.selectedElement = element;
        const modalBody = document.getElementById('modalBody');
        let html = '';

        // S'assurer que toutes les propriétés nécessaires sont définies
        this.ensureElementProperties(element);

        switch(element.type) {
            case 'text':
                html = FormBuilder.getTextEditForm(element);
                break;
            case 'textcell':
                html = FormBuilder.getTextCellEditForm(element);
                break;
            case 'multicell':
                html = FormBuilder.getMultiCellEditForm(element);
                break;
            case 'rect':
                html = FormBuilder.getRectEditForm(element);
                break;
            case 'line':
                html = FormBuilder.getLineEditForm(element);
                break;
            case 'circle':
                html = FormBuilder.getCircleEditForm(element);
                break;
            case 'image':
                html = FormBuilder.getImageEditForm(element);
                break;
            case 'barcode':
                html = FormBuilder.getBarcodeEditForm(element);
                break;
            case 'header':
            case 'footer':
                html = FormBuilder.getHeaderFooterEditForm(element);
                break;
        }

        modalBody.innerHTML = html;
        document.getElementById('modalTitle').textContent = `Éditer ${getElementTypeName(element.type)}`;
        document.getElementById('editModal').style.display = 'block';
    }

    ensureElementProperties(element) {
        // S'assurer que toutes les propriétés ont des valeurs par défaut
        if (element.fontSize === undefined) element.fontSize = 12;
        if (element.fontFamily === undefined) element.fontFamily = 'helvetica';
        if (element.fontStyle === undefined) element.fontStyle = '';
        if (element.color === undefined) element.color = '#000000';
        if (element.align === undefined) element.align = 'L';
        if (element.border === undefined) element.border = 0;
        if (element.borderWidth === undefined) element.borderWidth = 0.1;
        if (element.borderColor === undefined) element.borderColor = '#000000';
        if (element.fillColor === undefined) element.fillColor = 'transparent';
        if (element.content === undefined) element.content = '';
        
        // Propriétés spécifiques selon le type
        switch(element.type) {
            case 'textcell':
            case 'multicell':
                if (element.width === undefined) element.width = 50;
                if (element.height === undefined) element.height = 20;
                if (element.minHeight === undefined) element.minHeight = 20;
                if (element.lineHeight === undefined) element.lineHeight = element.fontSize * 1.2;
                break;
            case 'rect':
                if (element.width === undefined) element.width = 50;
                if (element.height === undefined) element.height = 30;
                if (element.rounded === undefined) element.rounded = false;
                if (element.radius === undefined) element.radius = 5;
                break;
            case 'line':
                if (element.x1 === undefined) element.x1 = 10;
                if (element.y1 === undefined) element.y1 = 10;
                if (element.x2 === undefined) element.x2 = 60;
                if (element.y2 === undefined) element.y2 = 10;
                if (element.width === undefined) element.width = 0.5;
                break;
            case 'circle':
                if (element.radius === undefined) element.radius = 15;
                if (element.radiusX === undefined) element.radiusX = element.radius;
                if (element.radiusY === undefined) element.radiusY = element.radius;
                // Initialiser width et height pour les cercles
                if (element.width === undefined) element.width = element.radiusX * 2;
                if (element.height === undefined) element.height = element.radiusY * 2;
                break;
            case 'image':
                if (element.width === undefined) element.width = 50;
                if (element.height === undefined) element.height = 50;
                if (element.rotation === undefined) element.rotation = 0;
                if (element.opacity === undefined) element.opacity = 100;
                if (element.keepAspectRatio === undefined) element.keepAspectRatio = true;
                if (element.link === undefined) element.link = '';
                break;
            case 'barcode':
                if (element.code === undefined) element.code = '123456789';
                if (element.barcodeType === undefined) element.barcodeType = 'C128';
                if (element.width === undefined) element.width = 50;
                if (element.height === undefined) element.height = 20;
                break;
            case 'header':
            case 'footer':
                if (element.width === undefined) element.width = 210;
                if (element.height === undefined) element.height = 10;
                break;
        }
    }

    saveElementChanges() {
        if (!this.selectedElement) return;

        const el = this.selectedElement;
        
        // Position pour tous les éléments
        if (document.getElementById('editX')) el.x = parseFloat(document.getElementById('editX').value);
        if (document.getElementById('editY')) el.y = parseFloat(document.getElementById('editY').value);
        
        switch(el.type) {
            case 'text':
                if (document.getElementById('editContent')) el.content = document.getElementById('editContent').value;
                if (document.getElementById('editFontSize')) el.fontSize = parseInt(document.getElementById('editFontSize').value);
                if (document.getElementById('editFontFamily')) {
                    let fontFamily = document.getElementById('editFontFamily').value;
                    // Convertir les polices non supportées par FPDF
                    if (fontFamily === 'arial') fontFamily = 'helvetica';
                    if (fontFamily === 'dejavusans') fontFamily = 'helvetica';
                    el.fontFamily = fontFamily;
                }
                if (document.getElementById('editFontStyle')) el.fontStyle = document.getElementById('editFontStyle').value;
                if (document.getElementById('editColor')) el.color = document.getElementById('editColor').value;
                if (document.getElementById('editAlign')) el.align = document.getElementById('editAlign').value;
                break;
            case 'textcell':
                if (document.getElementById('editContent')) el.content = document.getElementById('editContent').value;
                if (document.getElementById('editWidth')) el.width = parseFloat(document.getElementById('editWidth').value);
                if (document.getElementById('editHeight')) {
                    const heightValue = parseFloat(document.getElementById('editHeight').value);
                    if (el.type === 'multicell') {
                        el.minHeight = heightValue;
                    } else {
                        el.height = heightValue;
                    }
                }
                if (document.getElementById('editFontSize')) el.fontSize = parseInt(document.getElementById('editFontSize').value);
                if (document.getElementById('editFontFamily')) {
                    let fontFamily = document.getElementById('editFontFamily').value;
                    // Convertir les polices non supportées par FPDF
                    if (fontFamily === 'arial') fontFamily = 'helvetica';
                    if (fontFamily === 'dejavusans') fontFamily = 'helvetica';
                    el.fontFamily = fontFamily;
                }
                if (document.getElementById('editFontStyle')) el.fontStyle = document.getElementById('editFontStyle').value;
                if (document.getElementById('editColor')) el.color = document.getElementById('editColor').value;
                if (document.getElementById('editAlign')) el.align = document.getElementById('editAlign').value;
                if (document.getElementById('editBorderColor')) el.borderColor = document.getElementById('editBorderColor').value;
                if (document.getElementById('editBorderWidth')) el.borderWidth = parseFloat(document.getElementById('editBorderWidth').value);
                if (document.getElementById('editFillColor')) {
                    const transparent = document.getElementById('editTransparent');
                    if (transparent && transparent.checked) {
                        el.fillColor = 'transparent';
                    } else {
                        el.fillColor = document.getElementById('editFillColor').value;
                    }
                }
                break;
            case 'multicell':
                if (document.getElementById('editContent')) el.content = document.getElementById('editContent').value;
                if (document.getElementById('editWidth')) el.width = parseFloat(document.getElementById('editWidth').value);
                if (document.getElementById('editHeight')) {
                    const heightValue = parseFloat(document.getElementById('editHeight').value);
                    if (el.type === 'multicell') {
                        el.minHeight = heightValue;
                    } else {
                        el.height = heightValue;
                    }
                }
                if (document.getElementById('editFontSize')) el.fontSize = parseInt(document.getElementById('editFontSize').value);
                if (document.getElementById('editFontFamily')) {
                    let fontFamily = document.getElementById('editFontFamily').value;
                    // Convertir les polices non supportées par FPDF
                    if (fontFamily === 'arial') fontFamily = 'helvetica';
                    if (fontFamily === 'dejavusans') fontFamily = 'helvetica';
                    el.fontFamily = fontFamily;
                }
                if (document.getElementById('editFontStyle')) el.fontStyle = document.getElementById('editFontStyle').value;
                if (document.getElementById('editColor')) el.color = document.getElementById('editColor').value;
                if (document.getElementById('editAlign')) el.align = document.getElementById('editAlign').value;
                if (document.getElementById('editBorderColor')) el.borderColor = document.getElementById('editBorderColor').value;
                if (document.getElementById('editBorderWidth')) el.borderWidth = parseFloat(document.getElementById('editBorderWidth').value);
                if (document.getElementById('editFillColor')) {
                    const transparent = document.getElementById('editTransparent');
                    if (transparent && transparent.checked) {
                        el.fillColor = 'transparent';
                    } else {
                        el.fillColor = document.getElementById('editFillColor').value;
                    }
                }
                if (document.getElementById('editLineHeight')) el.lineHeight = parseFloat(document.getElementById('editLineHeight').value);
                break;
            case 'rect':
                if (document.getElementById('editWidth')) el.width = parseFloat(document.getElementById('editWidth').value);
                if (document.getElementById('editHeight')) {
                    const heightValue = parseFloat(document.getElementById('editHeight').value);
                    if (el.type === 'multicell') {
                        el.minHeight = heightValue;
                    } else {
                        el.height = heightValue;
                    }
                }
                if (document.getElementById('editBorderColor')) el.borderColor = document.getElementById('editBorderColor').value;
                if (document.getElementById('editBorderWidth')) el.borderWidth = parseFloat(document.getElementById('editBorderWidth').value);
                if (document.getElementById('editFillColor')) {
                    const transparent = document.getElementById('editTransparent');
                    if (transparent && transparent.checked) {
                        el.fillColor = 'transparent';
                    } else {
                        el.fillColor = document.getElementById('editFillColor').value;
                    }
                }
                break;
            case 'line':
                if (document.getElementById('editX1')) el.x1 = parseFloat(document.getElementById('editX1').value);
                if (document.getElementById('editY1')) el.y1 = parseFloat(document.getElementById('editY1').value);
                if (document.getElementById('editX2')) el.x2 = parseFloat(document.getElementById('editX2').value);
                if (document.getElementById('editY2')) el.y2 = parseFloat(document.getElementById('editY2').value);
                
                // S'assurer que x1 <= x2 et y1 <= y2
                if (el.x1 > el.x2) {
                    [el.x1, el.x2] = [el.x2, el.x1];
                }
                if (el.y1 > el.y2) {
                    [el.y1, el.y2] = [el.y2, el.y1];
                }
                
                if (document.getElementById('editColor')) el.color = document.getElementById('editColor').value;
                if (document.getElementById('editWidth')) el.width = parseFloat(document.getElementById('editWidth').value);
                break;
            case 'circle':
                if (document.getElementById('editRadiusX')) el.radiusX = parseFloat(document.getElementById('editRadiusX').value);
                if (document.getElementById('editRadiusY')) el.radiusY = parseFloat(document.getElementById('editRadiusY').value);
                // Pour la compatibilité, garder radius comme moyenne
                el.radius = (el.radiusX + el.radiusY) / 2;
                if (document.getElementById('editBorderColor')) el.borderColor = document.getElementById('editBorderColor').value;
                if (document.getElementById('editBorderWidth')) el.borderWidth = parseFloat(document.getElementById('editBorderWidth').value);
                if (document.getElementById('editFillColor')) {
                    const transparent = document.getElementById('editTransparent');
                    if (transparent && transparent.checked) {
                        el.fillColor = 'transparent';
                    } else {
                        el.fillColor = document.getElementById('editFillColor').value;
                    }
                }
                break;
            case 'image':
                if (document.getElementById('editWidth')) el.width = parseFloat(document.getElementById('editWidth').value);
                if (document.getElementById('editHeight')) el.height = parseFloat(document.getElementById('editHeight').value);
                if (document.getElementById('editDPI')) el.dpi = parseInt(document.getElementById('editDPI').value);
                if (document.getElementById('editKeepAspectRatio')) el.keepAspectRatio = document.getElementById('editKeepAspectRatio').checked;
                if (document.getElementById('editRotation')) el.rotation = parseInt(document.getElementById('editRotation').value);
                if (document.getElementById('editOpacity')) el.opacity = parseInt(document.getElementById('editOpacity').value);
                if (document.getElementById('editBorder')) el.border = parseInt(document.getElementById('editBorder').value);
                if (document.getElementById('editBorderWidth')) el.borderWidth = parseFloat(document.getElementById('editBorderWidth').value);
                if (document.getElementById('editBorderColor')) el.borderColor = document.getElementById('editBorderColor').value;
                if (document.getElementById('editLink')) el.link = document.getElementById('editLink').value;
                break;
            case 'barcode':
                if (document.getElementById('editCode')) el.code = document.getElementById('editCode').value;
                if (document.getElementById('editBarcodeType')) el.barcodeType = document.getElementById('editBarcodeType').value;
                break;
        }

        this.refreshPage();
        this.closeModal();
    }

    deleteSelectedElement() {
        if (!this.selectedElement) return;
        
        this.elements = this.elements.filter(el => el.id !== this.selectedElement.id);
        this.refreshPage();
        this.closeModal();
        
        modalManager.info('Élément supprimé');
    }

    openPageSettings() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="form-group">
                <label>Marge haute (mm)</label>
                <input type="number" id="marginTop" value="${this.pageSettings.marginTop}">
            </div>
            <div class="form-group">
                <label>Marge droite (mm)</label>
                <input type="number" id="marginRight" value="${this.pageSettings.marginRight}">
            </div>
            <div class="form-group">
                <label>Marge basse (mm)</label>
                <input type="number" id="marginBottom" value="${this.pageSettings.marginBottom}">
            </div>
            <div class="form-group">
                <label>Marge gauche (mm)</label>
                <input type="number" id="marginLeft" value="${this.pageSettings.marginLeft}">
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Mise en page';
        document.getElementById('deleteElement').style.display = 'none';
        
        const oldSave = document.getElementById('saveChanges').onclick;
        document.getElementById('saveChanges').onclick = () => {
            this.pageSettings.marginTop = parseInt(document.getElementById('marginTop').value);
            this.pageSettings.marginRight = parseInt(document.getElementById('marginRight').value);
            this.pageSettings.marginBottom = parseInt(document.getElementById('marginBottom').value);
            this.pageSettings.marginLeft = parseInt(document.getElementById('marginLeft').value);
            this.updatePageMargins();
            this.closeModal();
            document.getElementById('saveChanges').onclick = oldSave;
            document.getElementById('deleteElement').style.display = 'block';
        };

        document.getElementById('editModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
        this.selectedElement = null;
    }

    refreshPage() {
        const page = document.getElementById('a4Page');
        page.innerHTML = '';
        const sortedElements = [...this.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        sortedElements.forEach(el => renderElement(el, this));
        
        if (this.selectedElement) {
            const div = document.querySelector(`[data-id="${this.selectedElement.id}"]`);
            if (div) div.classList.add('selected');
        }
    }

    saveToFile() {
        const data = {
            version: '1.0',
            pageSettings: this.pageSettings,
            elements: this.elements
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        modalManager.success('Projet sauvegardé avec succès !');
    }

    loadFromFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.pageSettings = data.pageSettings || this.pageSettings;
                this.elements = data.elements || [];
                this.refreshPage();
                modalManager.success('Fichier chargé avec succès !');
            } catch (error) {
                modalManager.error('Erreur lors du chargement du fichier.\n\nLe fichier JSON est peut-être corrompu.');
                console.error('Erreur de chargement:', error);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    updatePageMargins() {
        const page = document.getElementById('a4Page');
        const mmToPx = 3.7795275591;
        page.style.padding = `${this.pageSettings.marginTop * mmToPx}px ${this.pageSettings.marginRight * mmToPx}px ${this.pageSettings.marginBottom * mmToPx}px ${this.pageSettings.marginLeft * mmToPx}px`;
    }

    async saveToServer() {
        const phpCode = generatePHPCode(this);
        const timestamp = Date.now();
        const filename = `generated_pdf_${timestamp}`;
        
        modalManager.showLoading('Génération du PDF en cours...');
        
        try {
            const response = await fetch('save_php.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: phpCode,
                    filename: filename
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Essayer de parser le JSON directement sans vérifier le content-type
            const text = await response.text();
            let result;
            
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('Réponse non-JSON:', text);
                throw new Error("La réponse n'est pas du JSON valide");
            }
            
            modalManager.hideLoading();
            
            if (result.success) {
                console.log('✅ PDF généré avec succès:');
                console.log('   PHP:', result.phpPath);
                console.log('   PDF:', result.pdfPath);
                console.log('   Taille:', result.pdfSize, 'bytes');
                
                // Ouvrir directement le PDF sans modale
                window.open(result.pdfUrl, '_blank');
                
            } else {
                console.error('Erreur serveur:', result);
                throw new Error(result.message || 'Erreur inconnue');
            }
        } catch (error) {
            modalManager.hideLoading();
            console.error('❌ Erreur complète:', error);
            
            let errorMsg = 'Erreur lors de la génération du PDF.\n\n';
            
            if (error.message.includes('404')) {
                errorMsg += '⚠️ Le fichier save_php.php est introuvable.\n\n';
                errorMsg += 'Vérifiez que le serveur PHP est démarré.';
            } else if (error.message.includes('JSON')) {
                errorMsg += '⚠️ Le serveur a retourné une erreur.\n\n';
                errorMsg += 'Consultez la console (F12) pour plus de détails.';
            } else if (error.message.includes('FPDF')) {
                errorMsg += '⚠️ FPDF n\'est pas installé correctement.\n\n';
                errorMsg += 'Vérifiez que fpdf/fpdf.php existe.';
            } else if (error.message.includes('Image')) {
                errorMsg += '⚠️ Problème avec une image.\n\n';
                errorMsg += error.message;
            } else {
                errorMsg += '⚠️ ' + error.message + '\n\n';
                errorMsg += 'Consultez la console pour plus de détails.';
            }
            
            errorMsg += '\n\nVoulez-vous télécharger le fichier PHP pour l\'examiner ?';
            
            const download = await modalManager.showConfirm(errorMsg, 'Erreur de génération');
            if (download) {
                this.exportToPHP();
            }
        }
    }

    exportToPHP() {
        const phpCode = generatePHPCode(this);
        const blob = new Blob([phpCode], { type: 'text/php' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = Date.now();
        a.download = `generated_pdf_${timestamp}.php`;
        
        console.log('📥 Fichier PHP généré et prêt à être téléchargé');
        console.log('💡 Recommandation: Sauvegardez-le dans: d:\\DEV\\TTpdf\\generated\\');
        
        a.click();
        URL.revokeObjectURL(url);
        
        modalManager.info('Fichier PHP téléchargé !\n\nSauvegardez-le dans:\nd:\\DEV\\TTpdf\\generated\\');
    }
}
