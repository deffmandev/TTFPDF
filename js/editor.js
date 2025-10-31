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
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isRightPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        this.init();
        this.loadFromLocalStorage();
        // Sauvegarde automatique toutes les secondes
        this.saveInterval = setInterval(() => this.saveToLocalStorage(), 1000);
    }

    init() {
        this.setupEventListeners();
        // Nettoyer l'intervalle lors de la fermeture de la page
        window.addEventListener('beforeunload', () => {
            if (this.saveInterval) {
                clearInterval(this.saveInterval);
            }
        });
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
        document.getElementById('previewPDF').addEventListener('click', () => this.previewPDF());
        document.getElementById('newDocument').addEventListener('click', () => this.newDocument());
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadFromFile(e));
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImageUpload(e));

        // Modale
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('saveChanges').addEventListener('click', () => this.saveElementChanges());
        document.getElementById('deleteElement').addEventListener('click', () => this.deleteSelectedElement());

        window.addEventListener('click', (e) => {
            if (e.target.id === 'editModal') this.closeModal();
        });
        
        // Désélectionner les éléments en cliquant sur la feuille
        document.getElementById('a4Page').addEventListener('click', (e) => {
            if (e.target.id === 'a4Page') {
                this.selectElement(null);
            }
        });
        
        // Zoom avec la molette
        document.getElementById('a4Page').addEventListener('wheel', (e) => this.handleZoom(e));
        
        // Empêcher le menu contextuel du clic droit
        document.getElementById('a4Page').addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Clic droit pour déplacer la feuille (partout)
        document.getElementById('a4Page').addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Clic droit - déplacer la feuille
                e.preventDefault();
                this.startRightPan(e);
            }
            // Bouton gauche réservé aux éléments (pas de déplacement de feuille)
        });
        document.addEventListener('mousemove', (e) => this.pan(e));
        document.addEventListener('mouseup', () => this.stopPan());
    }

    addElement(element) {
        // ✅ Positionner tous les nouveaux éléments à 0,0 (position absolue sur la feuille)
        element.x = 0;
        element.y = 0;
        
        this.elements.push(element);
        renderElement(element, this);
        this.saveToLocalStorage();
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
        // Désélectionner l'élément précédent
        if (this.selectedElement) {
            const prevDiv = document.querySelector(`[data-id="${this.selectedElement.id}"]`);
            if (prevDiv) prevDiv.classList.remove('selected');
        }

        this.selectedElement = element;

        // Sélectionner le nouvel élément (si ce n'est pas null)
        if (element) {
            const div = document.querySelector(`[data-id="${element.id}"]`);
            if (div) div.classList.add('selected');
        }

        // Afficher les propriétés en temps réel dans le panneau droit
        this.updateRightPanel(element);
    }

    updateRightPanel(element) {
        const panel = document.getElementById('rightPanelContent');
        if (!element) {
            panel.innerHTML = '<p class="no-selection">Sélectionnez un élément pour voir ses propriétés</p>';
            return;
        }

        let html = '';

        // Propriétés communes
        html += `
            <div class="form-group">
                <label>Type</label>
                <input type="text" value="${getElementTypeName(element.type)}" disabled style="background: #f8f9fa;">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>X (mm)</label>
                    <input type="number" id="rtX" value="${element.x || element.x1 || 0}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'x', this.value)">
                </div>
                <div class="form-group">
                    <label>Y (mm)</label>
                    <input type="number" id="rtY" value="${element.y || element.y1 || 0}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'y', this.value)">
                </div>
            </div>
        `;

        // Propriétés spécifiques selon le type
        switch(element.type) {
            case 'text':
                html += `
                    <div class="form-group">
                        <label>Texte</label>
                        <textarea id="rtContent" rows="2" oninput="editor.updateElementProperty('${element.id}', 'content', this.value)">${element.content || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Taille</label>
                            <input type="number" id="rtFontSize" value="${element.fontSize || 12}" min="6" max="72" oninput="editor.updateElementProperty('${element.id}', 'fontSize', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Police</label>
                            <select id="rtFontFamily" onchange="editor.updateElementProperty('${element.id}', 'fontFamily', this.value)">
                                <option value="helvetica" ${element.fontFamily === 'helvetica' || element.fontFamily === 'arial' || element.fontFamily === 'dejavusans' ? 'selected' : ''}>Helvetica</option>
                                <option value="times" ${element.fontFamily === 'times' ? 'selected' : ''}>Times</option>
                                <option value="courier" ${element.fontFamily === 'courier' ? 'selected' : ''}>Courier</option>
                                <option value="symbol" ${element.fontFamily === 'symbol' ? 'selected' : ''}>Symbol</option>
                                <option value="zapfdingbats" ${element.fontFamily === 'zapfdingbats' ? 'selected' : ''}>ZapfDingbats</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Style</label>
                            <select id="rtFontStyle" onchange="editor.updateElementProperty('${element.id}', 'fontStyle', this.value)">
                                <option value="" ${element.fontStyle === '' ? 'selected' : ''}>Normal</option>
                                <option value="B" ${element.fontStyle === 'B' ? 'selected' : ''}>Gras</option>
                                <option value="I" ${element.fontStyle === 'I' ? 'selected' : ''}>Italique</option>
                                <option value="U" ${element.fontStyle === 'U' ? 'selected' : ''}>Souligné</option>
                                <option value="BI" ${element.fontStyle === 'BI' ? 'selected' : ''}>Gras Italique</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Alignement</label>
                            <select id="rtAlign" onchange="editor.updateElementProperty('${element.id}', 'align', this.value)">
                                <option value="L" ${element.align === 'L' ? 'selected' : ''}>Gauche</option>
                                <option value="C" ${element.align === 'C' ? 'selected' : ''}>Centre</option>
                                <option value="R" ${element.align === 'R' ? 'selected' : ''}>Droite</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur</label>
                        <input type="color" id="rtColor" value="${element.color || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'color', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Rotation (°)</label>
                        <input type="number" id="rtRotation" value="${element.rotation || 0}" min="0" max="360" step="15" oninput="editor.updateElementProperty('${element.id}', 'rotation', this.value)">
                    </div>
                `;
                break;

            case 'textcell':
                html += `
                    <div class="form-group">
                        <label>Texte</label>
                        <textarea id="rtContent" rows="2" oninput="editor.updateElementProperty('${element.id}', 'content', this.value)">${element.content || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Largeur</label>
                            <input type="number" id="rtWidth" value="${element.width || 50}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'width', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Hauteur</label>
                            <input type="number" id="rtHeight" value="${element.height || 20}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'height', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Taille</label>
                            <input type="number" id="rtFontSize" value="${element.fontSize || 12}" min="6" max="72" oninput="editor.updateElementProperty('${element.id}', 'fontSize', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Police</label>
                            <select id="rtFontFamily" onchange="editor.updateElementProperty('${element.id}', 'fontFamily', this.value)">
                                <option value="helvetica" ${element.fontFamily === 'helvetica' || element.fontFamily === 'arial' || element.fontFamily === 'dejavusans' ? 'selected' : ''}>Helvetica</option>
                                <option value="times" ${element.fontFamily === 'times' ? 'selected' : ''}>Times</option>
                                <option value="courier" ${element.fontFamily === 'courier' ? 'selected' : ''}>Courier</option>
                                <option value="symbol" ${element.fontFamily === 'symbol' ? 'selected' : ''}>Symbol</option>
                                <option value="zapfdingbats" ${element.fontFamily === 'zapfdingbats' ? 'selected' : ''}>ZapfDingbats</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Style</label>
                            <select id="rtFontStyle" onchange="editor.updateElementProperty('${element.id}', 'fontStyle', this.value)">
                                <option value="" ${element.fontStyle === '' ? 'selected' : ''}>Normal</option>
                                <option value="B" ${element.fontStyle === 'B' ? 'selected' : ''}>Gras</option>
                                <option value="I" ${element.fontStyle === 'I' ? 'selected' : ''}>Italique</option>
                                <option value="U" ${element.fontStyle === 'U' ? 'selected' : ''}>Souligné</option>
                                <option value="BI" ${element.fontStyle === 'BI' ? 'selected' : ''}>Gras Italique</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Align H</label>
                            <select id="rtAlign" onchange="editor.updateElementProperty('${element.id}', 'align', this.value)">
                                <option value="L" ${element.align === 'L' ? 'selected' : ''}>Gauche</option>
                                <option value="C" ${element.align === 'C' ? 'selected' : ''}>Centre</option>
                                <option value="R" ${element.align === 'R' ? 'selected' : ''}>Droite</option>
                                <option value="J" ${element.align === 'J' ? 'selected' : ''}>Justifié</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur</label>
                        <input type="color" id="rtColor" value="${element.color || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'color', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Align V</label>
                        <select id="rtVAlign" onchange="editor.updateElementProperty('${element.id}', 'valign', this.value)">
                            <option value="T" ${element.valign === 'T' ? 'selected' : ''}>Haut</option>
                            <option value="M" ${element.valign === 'M' ? 'selected' : ''}>Milieu</option>
                            <option value="B" ${element.valign === 'B' ? 'selected' : ''}>Bas</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Bordure</label>
                            <input type="color" id="rtBorderColor" value="${element.borderColor || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'borderColor', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Épaisseur</label>
                            <input type="number" id="rtBorderWidth" value="${element.borderWidth || 0.1}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'borderWidth', this.value)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur fond</label>
                        <input type="color" id="rtFillColor" value="${element.fillColor === 'transparent' ? '#ffffff' : (element.fillColor || '#ffffff')}" onchange="editor.updateElementProperty('${element.id}', 'fillColor', this.value)">
                    </div>
                `;
                break;

            case 'multicell':
                html += `
                    <div class="form-group">
                        <label>Texte</label>
                        <textarea id="rtContent" rows="3" oninput="editor.updateElementProperty('${element.id}', 'content', this.value)">${element.content || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Largeur</label>
                            <input type="number" id="rtWidth" value="${element.width || 150}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'width', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Hauteur auto</label>
                            <input type="number" id="rtHeight" value="1" disabled style="background: #f8f9fa; color: #666; font-weight: bold;" title="Hauteur calculée automatiquement: ${(element.minHeight || 0).toFixed(1)}mm">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Taille</label>
                            <input type="number" id="rtFontSize" value="${element.fontSize || 12}" min="6" max="72" oninput="editor.updateElementProperty('${element.id}', 'fontSize', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Police</label>
                            <select id="rtFontFamily" onchange="editor.updateElementProperty('${element.id}', 'fontFamily', this.value)">
                                <option value="helvetica" ${element.fontFamily === 'helvetica' || element.fontFamily === 'arial' || element.fontFamily === 'dejavusans' ? 'selected' : ''}>Helvetica</option>
                                <option value="times" ${element.fontFamily === 'times' ? 'selected' : ''}>Times</option>
                                <option value="courier" ${element.fontFamily === 'courier' ? 'selected' : ''}>Courier</option>
                                <option value="symbol" ${element.fontFamily === 'symbol' ? 'selected' : ''}>Symbol</option>
                                <option value="zapfdingbats" ${element.fontFamily === 'zapfdingbats' ? 'selected' : ''}>ZapfDingbats</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Style</label>
                            <select id="rtFontStyle" onchange="editor.updateElementProperty('${element.id}', 'fontStyle', this.value)">
                                <option value="" ${element.fontStyle === '' ? 'selected' : ''}>Normal</option>
                                <option value="B" ${element.fontStyle === 'B' ? 'selected' : ''}>Gras</option>
                                <option value="I" ${element.fontStyle === 'I' ? 'selected' : ''}>Italique</option>
                                <option value="U" ${element.fontStyle === 'U' ? 'selected' : ''}>Souligné</option>
                                <option value="BI" ${element.fontStyle === 'BI' ? 'selected' : ''}>Gras Italique</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Alignement</label>
                            <select id="rtAlign" onchange="editor.updateElementProperty('${element.id}', 'align', this.value)">
                                <option value="L" ${element.align === 'L' ? 'selected' : ''}>Gauche</option>
                                <option value="C" ${element.align === 'C' ? 'selected' : ''}>Centre</option>
                                <option value="R" ${element.align === 'R' ? 'selected' : ''}>Droite</option>
                                <option value="J" ${element.align === 'J' ? 'selected' : ''}>Justifié</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur</label>
                        <input type="color" id="rtColor" value="${element.color || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'color', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Hauteur de ligne (pt)</label>
                        <input type="number" id="rtLineHeight" value="${element.lineHeight || 12}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'lineHeight', this.value)">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Bordure</label>
                            <input type="color" id="rtBorderColor" value="${element.borderColor || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'borderColor', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Épaisseur</label>
                            <input type="number" id="rtBorderWidth" value="${element.borderWidth || 0.1}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'borderWidth', this.value)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur fond</label>
                        <input type="color" id="rtFillColor" value="${element.fillColor === 'transparent' ? '#ffffff' : (element.fillColor || '#ffffff')}" onchange="editor.updateElementProperty('${element.id}', 'fillColor', this.value)">
                    </div>
                `;
                break;

            case 'rect':
                html += `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Largeur</label>
                            <input type="number" id="rtWidth" value="${element.width || 50}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'width', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Hauteur</label>
                            <input type="number" id="rtHeight" value="${element.height || 30}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'height', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Bordure</label>
                            <input type="color" id="rtBorderColor" value="${element.borderColor || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'borderColor', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Épaisseur</label>
                            <input type="number" id="rtBorderWidth" value="${element.borderWidth || 0.1}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'borderWidth', this.value)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur fond</label>
                        <input type="color" id="rtFillColor" value="${element.fillColor === 'transparent' ? '#ffffff' : (element.fillColor || '#ffffff')}" onchange="editor.updateElementProperty('${element.id}', 'fillColor', this.value)">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="rtRounded" ${element.rounded ? 'checked' : ''} onchange="editor.updateElementProperty('${element.id}', 'rounded', this.checked)">
                            Coins arrondis
                        </label>
                    </div>
                    ${element.rounded ? `
                    <div class="form-group">
                        <label>Rayon</label>
                        <input type="number" id="rtRadius" value="${element.radius || 5}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'radius', this.value)">
                    </div>
                    ` : ''}
                `;
                break;

            case 'circle':
                html += `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Rayon X</label>
                            <input type="number" id="rtRadiusX" value="${element.radiusX || element.radius || 15}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'radiusX', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Rayon Y</label>
                            <input type="number" id="rtRadiusY" value="${element.radiusY || element.radius || 15}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'radiusY', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Bordure</label>
                            <input type="color" id="rtBorderColor" value="${element.borderColor || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'borderColor', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Épaisseur</label>
                            <input type="number" id="rtBorderWidth" value="${element.borderWidth || 0.1}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'borderWidth', this.value)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur fond</label>
                        <input type="color" id="rtFillColor" value="${element.fillColor === 'transparent' ? '#ffffff' : (element.fillColor || '#ffffff')}" onchange="editor.updateElementProperty('${element.id}', 'fillColor', this.value)">
                    </div>
                `;
                break;

            case 'line':
                html += `
                    <div class="form-row">
                        <div class="form-group">
                            <label>X1</label>
                            <input type="number" id="rtX1" value="${element.x1 || 10}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'x1', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Y1</label>
                            <input type="number" id="rtY1" value="${element.y1 || 10}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'y1', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>X2</label>
                            <input type="number" id="rtX2" value="${element.x2 || 60}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'x2', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Y2</label>
                            <input type="number" id="rtY2" value="${element.y2 || 10}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'y2', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Couleur</label>
                            <input type="color" id="rtColor" value="${element.color || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'color', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Épaisseur</label>
                            <input type="number" id="rtWidth" value="${element.width || 0.5}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'width', this.value)">
                        </div>
                    </div>
                `;
                break;

            case 'image':
                html += `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Largeur</label>
                            <input type="number" id="rtWidth" value="${element.width || 100}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'width', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Hauteur</label>
                            <input type="number" id="rtHeight" value="${element.height || 100}" step="0.1" oninput="editor.updateElementProperty('${element.id}', 'height', this.value)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="rtKeepAspectRatio" ${element.keepAspectRatio ? 'checked' : ''} onchange="editor.updateElementProperty('${element.id}', 'keepAspectRatio', this.checked)">
                            Conserver les proportions
                        </label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Rotation (°)</label>
                            <input type="number" id="rtRotation" value="${element.rotation || 0}" min="0" max="360" step="15" oninput="editor.updateElementProperty('${element.id}', 'rotation', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Opacité (%)</label>
                            <input type="number" id="rtOpacity" value="${element.opacity || 100}" min="0" max="100" step="10" oninput="editor.updateElementProperty('${element.id}', 'opacity', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Bordure</label>
                            <select id="rtBorder" onchange="editor.updateElementProperty('${element.id}', 'border', parseInt(this.value)); editor.updateRightPanel(editor.selectedElement);">
                                <option value="0" ${element.border === 0 ? 'selected' : ''}>Aucune</option>
                                <option value="1" ${element.border === 1 ? 'selected' : ''}>Avec bordure</option>
                            </select>
                        </div>
                        ${element.border === 1 ? `
                        <div class="form-group">
                            <label>Épaisseur (mm)</label>
                            <input type="number" id="rtBorderWidth" value="${element.borderWidth || 0.1}" step="0.1" min="0.1" max="5" oninput="editor.updateElementProperty('${element.id}', 'borderWidth', this.value)">
                        </div>
                        ` : '<div class="form-group"></div>'}
                    </div>
                    ${element.border === 1 ? `
                    <div class="form-group">
                        <label>Couleur bordure</label>
                        <input type="color" id="rtBorderColor" value="${element.borderColor || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'borderColor', this.value)">
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Lien (URL)</label>
                        <input type="text" id="rtLink" value="${element.link || ''}" placeholder="https://..." oninput="editor.updateElementProperty('${element.id}', 'link', this.value)">
                        <small style="display: block; margin-top: 5px; color: #666;">L'image sera cliquable dans le PDF</small>
                    </div>
                    ${element.serverPath ? `
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; color: #666;">📁 Chemin serveur</label>
                        <input type="text" value="${element.serverPath}" disabled style="background: #f0f0f0; font-family: monospace; font-size: 11px; width: 100%; padding: 5px;">
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; color: #666;">📷 Format</label>
                        <input type="text" value="${element.format || 'JPG'}" disabled style="background: #f0f0f0; width: 100%; padding: 5px;">
                    </div>
                `;
                break;

            case 'header':
            case 'footer':
                html += `
                    <div class="form-group">
                        <label>Contenu</label>
                        <input type="text" id="rtContent" value="${element.content || ''}" oninput="editor.updateElementProperty('${element.id}', 'content', this.value)">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Largeur</label>
                            <input type="number" id="rtWidth" value="${element.width || 210}" oninput="editor.updateElementProperty('${element.id}', 'width', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Hauteur</label>
                            <input type="number" id="rtHeight" value="${element.height || 10}" oninput="editor.updateElementProperty('${element.id}', 'height', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Taille</label>
                            <input type="number" id="rtFontSize" value="${element.fontSize || 12}" min="6" max="72" oninput="editor.updateElementProperty('${element.id}', 'fontSize', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Police</label>
                            <select id="rtFontFamily" onchange="editor.updateElementProperty('${element.id}', 'fontFamily', this.value)">
                                <option value="helvetica" ${element.fontFamily === 'helvetica' || element.fontFamily === 'arial' || element.fontFamily === 'dejavusans' ? 'selected' : ''}>Helvetica</option>
                                <option value="times" ${element.fontFamily === 'times' ? 'selected' : ''}>Times</option>
                                <option value="courier" ${element.fontFamily === 'courier' ? 'selected' : ''}>Courier</option>
                                <option value="symbol" ${element.fontFamily === 'symbol' ? 'selected' : ''}>Symbol</option>
                                <option value="zapfdingbats" ${element.fontFamily === 'zapfdingbats' ? 'selected' : ''}>ZapfDingbats</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Style</label>
                            <select id="rtFontStyle" onchange="editor.updateElementProperty('${element.id}', 'fontStyle', this.value)">
                                <option value="" ${element.fontStyle === '' ? 'selected' : ''}>Normal</option>
                                <option value="B" ${element.fontStyle === 'B' ? 'selected' : ''}>Gras</option>
                                <option value="I" ${element.fontStyle === 'I' ? 'selected' : ''}>Italique</option>
                                <option value="U" ${element.fontStyle === 'U' ? 'selected' : ''}>Souligné</option>
                                <option value="BI" ${element.fontStyle === 'BI' ? 'selected' : ''}>Gras Italique</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Alignement</label>
                            <select id="rtAlign" onchange="editor.updateElementProperty('${element.id}', 'align', this.value)">
                                <option value="L" ${element.align === 'L' ? 'selected' : ''}>Gauche</option>
                                <option value="C" ${element.align === 'C' ? 'selected' : ''}>Centre</option>
                                <option value="R" ${element.align === 'R' ? 'selected' : ''}>Droite</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Couleur</label>
                        <input type="color" id="rtColor" value="${element.color || '#000000'}" onchange="editor.updateElementProperty('${element.id}', 'color', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Couleur fond</label>
                        <input type="color" id="rtFillColor" value="${element.fillColor || '#ffffff'}" onchange="editor.updateElementProperty('${element.id}', 'fillColor', this.value)">
                    </div>
                `;
                break;
        }

        panel.innerHTML = html;
    }

    updateRightPanelValues(element) {
        // Mettre à jour uniquement les valeurs des champs sans recréer le HTML
        if (document.getElementById('rtX')) {
            document.getElementById('rtX').value = (element.x || element.x1 || 0).toFixed(1);
        }
        if (document.getElementById('rtY')) {
            document.getElementById('rtY').value = (element.y || element.y1 || 0).toFixed(1);
        }
        if (document.getElementById('rtX1')) {
            document.getElementById('rtX1').value = (element.x1 || 0).toFixed(1);
        }
        if (document.getElementById('rtY1')) {
            document.getElementById('rtY1').value = (element.y1 || 0).toFixed(1);
        }
        if (document.getElementById('rtX2')) {
            document.getElementById('rtX2').value = (element.x2 || 0).toFixed(1);
        }
        if (document.getElementById('rtY2')) {
            document.getElementById('rtY2').value = (element.y2 || 0).toFixed(1);
        }
        if (document.getElementById('rtWidth')) {
            document.getElementById('rtWidth').value = (element.width || 0).toFixed(1);
        }
        if (document.getElementById('rtHeight')) {
            document.getElementById('rtHeight').value = ((element.height || element.minHeight) || 0).toFixed(1);
        }
        if (document.getElementById('rtRadiusX')) {
            document.getElementById('rtRadiusX').value = ((element.radiusX || element.radius) || 0).toFixed(1);
        }
        if (document.getElementById('rtRadiusY')) {
            document.getElementById('rtRadiusY').value = ((element.radiusY || element.radius) || 0).toFixed(1);
        }
        if (document.getElementById('rtRotation')) {
            document.getElementById('rtRotation').value = (element.rotation || 0);
        }
        if (document.getElementById('rtOpacity')) {
            document.getElementById('rtOpacity').value = (element.opacity || 100);
        }
        
        // ✅ Pour multicell, toujours afficher "1" dans les champs auto
        if (element.type === 'multicell') {
            if (document.getElementById('rtHeight')) {
                document.getElementById('rtHeight').value = 1;
                document.getElementById('rtHeight').title = `Hauteur calculée automatiquement: ${(element.minHeight || 0).toFixed(1)}mm`;
            }
            if (document.getElementById('rtLineHeight')) {
                document.getElementById('rtLineHeight').value = 1; // ✅ TOUJOURS À 1 APRÈS MODIFICATION
                document.getElementById('rtLineHeight').title = "Valeur fixe: 1";
            }
        }
    }

    updateElementProperty(elementId, property, value) {
        console.log('🔧 updateElementProperty appelé:', { elementId, property, value });
        
        const element = this.elements.find(el => el.id == elementId);
        if (!element) {
            console.error('❌ Element not found:', elementId);
            return;
        }

        // Convertir la valeur selon le type
        if (['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'minHeight', 'radiusX', 'radiusY', 'radius', 'rotation', 'opacity', 'borderWidth', 'fontSize', 'lineHeight'].includes(property)) {
            value = parseFloat(value) || 0;
        }

        console.log('✅ Mise à jour:', property, 'de', element[property], 'à', value);
        element[property] = value;

        // ✅ Pour les multicell, recalculer la hauteur automatiquement
        if (element.type === 'multicell') {
            if (['content', 'fontSize', 'width', 'lineHeight'].includes(property)) {
                calculateMultiCellHeight(element);
                console.log('🔄 Hauteur multicell recalculée:', element.minHeight.toFixed(1), 'mm');
            }
        }

        // Mise à jour en temps réel du DOM
        const div = document.querySelector(`[data-id="${elementId}"]`);
        if (div) {
            console.log('📝 Élément DOM trouvé, mise à jour visuelle...');
            this.updateElementVisual(element, div, property, value);
        } else {
            console.error('❌ Élément DOM non trouvé pour ID:', elementId);
        }
        this.saveToLocalStorage();
    }

    updateElementVisual(element, div, property, value) {
        console.log('🎨 updateElementVisual:', property, value);
        const mmToPx = 3.7795275591;

        switch (property) {
            case 'x':
                if (element.type === 'line') {
                    div.style.left = Math.min(element.x1, element.x2) + 'mm';
                } else {
                    div.style.left = value + 'mm';
                }
                console.log('✅ Position X mise à jour');
                break;
                
            case 'y':
                if (element.type === 'line') {
                    div.style.top = Math.min(element.y1, element.y2) + 'mm';
                } else {
                    div.style.top = value + 'mm';
                }
                console.log('✅ Position Y mise à jour');
                break;
                
            case 'x1':
            case 'y1':
            case 'x2':
            case 'y2':
                if (element.type === 'line') {
                    const dx = element.x2 - element.x1;
                    const dy = element.y2 - element.y1;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    div.style.width = length + 'mm';
                    div.style.left = Math.min(element.x1, element.x2) + 'mm';
                    div.style.top = Math.min(element.y1, element.y2) + 'mm';
                    div.style.transform = `rotate(${angle}deg)`;
                    updateLineHandles(div, element);
                }
                console.log('✅ Ligne mise à jour');
                break;
                
            case 'width':
                if (element.type === 'line') {
                    div.style.height = (value * mmToPx) + 'px';
                } else {
                    div.style.width = value + 'mm';
                }
                console.log('✅ Largeur mise à jour:', value + 'mm');
                break;
                
            case 'height':
            case 'minHeight':
                if (element.type === 'multicell') {
                    div.style.minHeight = value + 'mm';
                } else {
                    div.style.height = value + 'mm';
                }
                console.log('✅ Hauteur mise à jour:', value + 'mm');
                break;
                
            case 'radiusX':
            case 'radiusY':
                if (element.type === 'circle') {
                    const sizeX = (element.radiusX || element.radius) * 2;
                    const sizeY = (element.radiusY || element.radius) * 2;
                    div.style.width = sizeX + 'mm';
                    div.style.height = sizeY + 'mm';
                    element.width = sizeX;
                    element.height = sizeY;
                }
                console.log('✅ Rayon cercle mis à jour');
                break;
                
            case 'fontSize':
                console.log('🔤 Changement de fontSize à:', value + 'pt');
                
                // Pour les éléments de texte simple
                if (element.type === 'text') {
                    div.style.fontSize = value + 'pt';
                    div.style.margin = -(value / 4) + 'px 0px 0px 4px'; // Margin négatif = taille de police / 4
                    console.log('✅ fontSize appliqué directement sur div');
                } else {
                    // Pour les cellules de texte, multicell, header, footer
                    const contentDiv = div.querySelector('div:not(.z-controls):not(.resize-handle)');
                    if (contentDiv) {
                        contentDiv.style.fontSize = value + 'pt';
                        console.log('✅ fontSize appliqué sur contentDiv');
                    } else {
                        console.error('❌ contentDiv non trouvé, application sur div principal');
                        div.style.fontSize = value + 'pt';
                    }
                }
                break;
                
            case 'fontFamily':
                if (element.type === 'text') {
                    div.style.fontFamily = value;
                } else {
                    const fontDiv = div.querySelector('div:not(.z-controls):not(.resize-handle)');
                    if (fontDiv) fontDiv.style.fontFamily = value;
                }
                console.log('✅ Police mise à jour:', value);
                break;
                
            case 'fontStyle':
                const styleTarget = element.type === 'text' ? div : div.querySelector('div:not(.z-controls):not(.resize-handle)');
                if (styleTarget) {
                    styleTarget.style.fontWeight = (value || '').includes('B') ? 'bold' : 'normal'; // ✅ Protection contre undefined
                    styleTarget.style.fontStyle = (value || '').includes('I') ? 'italic' : 'normal'; // ✅ Protection contre undefined
                    styleTarget.style.textDecoration = (value || '').includes('U') ? 'underline' : 'none'; // ✅ Protection contre undefined
                }
                console.log('✅ Style de police mis à jour:', value);
                break;
                
            case 'color':
                if (element.type === 'text') {
                    div.style.color = value;
                } else {
                    const colorDiv = div.querySelector('div:not(.z-controls):not(.resize-handle)');
                    if (colorDiv) colorDiv.style.color = value;
                }
                console.log('✅ Couleur mise à jour:', value);
                break;
                
            case 'content':
                if (element.type === 'text') {
                    div.textContent = value;
                    // Réajouter les contrôles z après modification du contenu
                    const zControls = div.querySelector('.z-controls');
                    if (zControls) div.appendChild(zControls);
                } else {
                    const textDiv = div.querySelector('div:not(.z-controls):not(.resize-handle)');
                    if (textDiv) {
                        if (element.type === 'multicell') {
                            textDiv.textContent = value.replace(/\\n/g, '\n');
                        } else {
                            textDiv.textContent = value;
                        }
                    }
                }
                console.log('✅ Contenu mis à jour');
                break;
                
            case 'borderColor':
                div.style.borderColor = value;
                console.log('✅ Couleur bordure mise à jour:', value);
                break;
                
            case 'borderWidth':
                div.style.borderWidth = (value * mmToPx) + 'px';
                console.log('✅ Épaisseur bordure mise à jour:', value + 'mm');
                break;
                
            case 'fillColor':
                div.style.backgroundColor = value === 'transparent' ? 'transparent' : value;
                console.log('✅ Couleur fond mise à jour:', value);
                break;
                
            case 'rotation':
                if (element.type === 'text') {
                    if (value && value !== 0) {
                        div.style.transform = `rotate(${-value}deg)`;
                        div.style.transformOrigin = 'center center';
                    } else {
                        div.style.transform = 'none';
                    }
                } else if (element.type === 'image') {
                    const img = div.querySelector('img');
                    if (img) {
                        img.style.transform = `rotate(${-value}deg)`;
                    }
                }
                console.log('✅ Rotation mise à jour:', value + '°');
                break;
                
            case 'opacity':
                if (element.type === 'image') {
                    const img = div.querySelector('img');
                    if (img) {
                        img.style.opacity = value / 100;
                    }
                }
                console.log('✅ Opacité mise à jour:', value + '%');
                break;
                
            case 'border':
                if (element.type === 'image') {
                    if (value === 1) {
                        div.style.border = `${(element.borderWidth || 0.1) * mmToPx}px solid ${element.borderColor || '#000000'}`;
                    } else {
                        div.style.border = 'none';
                    }
                }
                console.log('✅ Bordure image:', value === 1 ? 'activée' : 'désactivée');
                break;
                
            case 'keepAspectRatio':
                // Propriété stockée mais pas d'effet visuel immédiat
                console.log('✅ Proportions conservées:', value);
                break;
                
            case 'link':
                // Propriété stockée mais pas d'effet visuel immédiat
                console.log('✅ Lien mis à jour:', value);
                break;
                
            case 'radius':
                if (element.type === 'rect' && element.rounded) {
                    div.style.borderRadius = value + 'mm';
                }
                console.log('✅ Rayon coins arrondis mis à jour:', value + 'mm');
                break;
                
            case 'rounded':
                if (element.type === 'rect') {
                    div.style.borderRadius = value ? (element.radius || 5) + 'mm' : '0';
                    this.updateRightPanel(element);
                }
                console.log('✅ Coins arrondis:', value ? 'activés' : 'désactivés');
                break;
                
            case 'lineHeight':
                if (element.type === 'multicell') {
                    const contentDiv = div.querySelector('div:not(.z-controls):not(.resize-handle)');
                    if (contentDiv) {
                        // Convertir mm en pixels pour line-height CSS
                        contentDiv.style.lineHeight = (value * mmToPx) + 'px';
                        console.log('✅ Hauteur de ligne mise à jour:', value + 'mm', '=', (value * mmToPx) + 'px');
                    }
                }
                break;
                
            case 'align':
                const alignTarget = element.type === 'text' ? div : div.querySelector('div:not(.z-controls):not(.resize-handle)');
                if (alignTarget) {
                    const alignMap = { 'L': 'left', 'C': 'center', 'R': 'right', 'J': 'justify' };
                    alignTarget.style.textAlign = alignMap[value] || 'left';
                    console.log('✅ Alignement horizontal mis à jour:', value, '→', alignMap[value]);
                }
                break;
                
            case 'valign':
                if (element.type === 'textcell' || element.type === 'multicell') {
                    // Réorganiser la structure pour l'alignement vertical
                    const contentDiv = div.querySelector('div:not(.z-controls):not(.resize-handle)');
                    if (contentDiv) {
                        const valignMap = { 
                            'T': 'flex-start', 
                            'M': 'center', 
                            'B': 'flex-end' 
                        };
                        
                        // Configurer le conteneur comme flexbox
                        div.style.display = 'flex';
                        div.style.flexDirection = 'column';
                        div.style.justifyContent = valignMap[value] || 'flex-start';
                        
                        console.log('✅ Alignement vertical mis à jour:', value, '→', valignMap[value]);
                    }
                }
                break;
                
            default:
                console.warn('⚠️ Propriété non gérée en temps réel:', property);
                break;
        }
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
        if (element.valign === undefined) element.valign = 'T';
        if (element.border === undefined) element.border = 0;
        if (element.borderWidth === undefined) element.borderWidth = 0.1;
        if (element.borderColor === undefined) element.borderColor = '#000000';
        if (element.fillColor === undefined) element.fillColor = 'transparent';
        if (element.content === undefined) element.content = '';
        
        // Propriétés spécifiques selon le type
        switch(element.type) {
            case 'textcell':
                if (element.width === undefined) element.width = 50;
                if (element.height === undefined) element.height = 20;
                if (element.lineHeight === undefined) element.lineHeight = element.fontSize * 1.2;
                break;
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
                if (element.border === undefined) element.border = 0;
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
                if (document.getElementById('editRotation')) el.rotation = parseInt(document.getElementById('editRotation').value);
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
                if (document.getElementById('editRotation')) el.rotation = parseInt(document.getElementById('editRotation').value);
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
                if (document.getElementById('editRotation')) el.rotation = parseInt(document.getElementById('editRotation').value);
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
        this.saveToLocalStorage();
    }

    deleteSelectedElement() {
        if (!this.selectedElement) return;
        
        this.elements = this.elements.filter(el => el.id !== this.selectedElement.id);
        this.refreshPage();
        this.closeModal();
        
        modalManager.info('Élément supprimé');
        this.saveToLocalStorage();
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
            this.saveToLocalStorage();
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
        this.applyTransform();
        const sortedElements = [...this.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        sortedElements.forEach(el => renderElement(el, this));
        
        if (this.selectedElement) {
            const div = document.querySelector(`[data-id="${this.selectedElement.id}"]`);
            if (div) div.classList.add('selected'); // ✅ Correction: Ajout de parenthèses manquantes
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
                // ❌ SUPPRESSION : Pas de message de succès
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

    async previewPDF() {
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
                
                // ✅ Supprimer le fichier PHP après génération

                try {
                    await fetch('delete_php.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phpPath: result.phpPath
                        })
                    });
                    console.log('🗑️ Fichier PHP supprimé:', result.phpPath);
                } catch (deleteError) {
                    console.warn('⚠️ Impossible de supprimer le fichier PHP:', deleteError);
                }
                
                // ✅ Supprimer le fichier PDF après ouverture
                try {
                    await fetch('delete_pdf.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            pdfPath: result.pdfPath
                        })
                    });
                    console.log('🗑️ Fichier PDF supprimé:', result.pdfPath);
                } catch (deleteError) {
                    console.warn('⚠️ Impossible de supprimer le fichier PDF:', deleteError);
                }
                
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
                errorMsg += '⚠️ Le serveur a retourné une erreur.\n\nConsultez la console (F12) pour plus de détails.';
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
    }

    async newDocument() {
        // Confirmation avant de créer un nouveau document
        if (this.elements.length > 0) {
            const confirmed = await modalManager.showConfirm(
                'Êtes-vous sûr de vouloir créer un nouveau document ?\nToutes les modifications non sauvegardées seront perdues.',
                'Nouveau document'
            );
            if (!confirmed) return;
        }
        
        // Réinitialiser les données
        this.elements = [];
        this.selectedElement = null;
        this.pageSettings = {
            orientation: 'P',
            unit: 'mm',
            format: 'A4'
        };
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Rafraîchir la page
        this.refreshPage();
        
        // Appliquer le zoom par défaut
        const page = document.getElementById('a4Page');
        page.style.transform = `scale(${this.zoom})`;
        page.style.transformOrigin = 'top left';
        
        // Sauvegarder les données vides
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        try {
            const data = {
                version: '1.0',
                pageSettings: this.pageSettings,
                elements: this.elements
            };
            localStorage.setItem('pdfEditorData', JSON.stringify(data));
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde dans localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const dataStr = localStorage.getItem('pdfEditorData');
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.pageSettings) {
                    this.pageSettings = data.pageSettings;
                }
                if (data.elements) {
                    this.elements = data.elements;
                    this.refreshPage();
                }
                // Remettre le zoom à 100% au chargement
                this.zoom = 1;
                this.panX = 0;
                this.panY = 0;
                this.applyTransform();
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement depuis localStorage:', error);
        }
    }

    handleZoom(e) {
        e.preventDefault();
        
        const page = document.getElementById('a4Page');
        const rect = page.getBoundingClientRect();
        
        // Position de la souris relative à la page
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Zoom avant/après
        const zoomSpeed = 0.1;
        const oldZoom = this.zoom;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        const newZoom = Math.max(0.8, Math.min(2.0, oldZoom + delta));
        
        if (newZoom === oldZoom) return; // Pas de changement
        
        // Calculer le nouveau pan pour garder le point sous la souris fixe
        const scaleChange = newZoom / oldZoom;
        this.panX = mouseX - (mouseX - this.panX) * scaleChange;
        this.panY = mouseY - (mouseY - this.panY) * scaleChange;
        this.zoom = newZoom;
        
        this.applyTransform();
        console.log(`🔍 Zoom: ${(this.zoom * 100).toFixed(0)}%`);
    }

    applyTransform() {
        const page = document.getElementById('a4Page');
        page.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        page.style.transformOrigin = '0 0';
        
        // Afficher l'état du zoom et du pan dans la console
        console.log(`🔍 État du zoom: ${(this.zoom * 100).toFixed(0)}% | Pan: (${this.panX.toFixed(1)}px, ${this.panY.toFixed(1)}px)`);
    }

    startPan(e) {
        // Plus utilisé - le bouton gauche est réservé aux éléments
        // Le déplacement de la feuille se fait avec le bouton droit
    }

    pan(e) {
        if (!this.isRightPanning) return; // Seulement pour le bouton droit
        e.preventDefault();
        const deltaX = e.clientX - this.lastPanX;
        const deltaY = e.clientY - this.lastPanY;
        this.panX += deltaX;
        this.panY += deltaY;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.applyTransform();
    }

    stopPan() {
        this.isRightPanning = false;
        document.body.style.cursor = '';
    }

    startRightPan(e) {
        // Déplacement de la feuille avec bouton droit - toujours possible
        this.isRightPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        document.body.style.cursor = 'grabbing';
    }
}
