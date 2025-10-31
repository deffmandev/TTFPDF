// Formulaires d'édition

const FormBuilder = {
    getFontControls(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>Taille (pt)</label>
                    <input type="number" id="editFontSize" value="${el.fontSize || 12}" min="6" max="72">
                </div>
                <div class="form-group">
                    <label>Police</label>
                    <select id="editFontFamily">
                        <option value="helvetica" ${el.fontFamily === 'helvetica' || el.fontFamily === 'arial' || el.fontFamily === 'dejavusans' ? 'selected' : ''}>Helvetica</option>
                        <option value="times" ${el.fontFamily === 'times' ? 'selected' : ''}>Times</option>
                        <option value="courier" ${el.fontFamily === 'courier' ? 'selected' : ''}>Courier</option>
                        <option value="symbol" ${el.fontFamily === 'symbol' ? 'selected' : ''}>Symbol</option>
                        <option value="zapfdingbats" ${el.fontFamily === 'zapfdingbats' ? 'selected' : ''}>ZapfDingbats</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Couleur</label>
                    <input type="color" id="editColor" value="${el.color || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Style</label>
                    <select id="editFontStyle">
                        <option value="" ${el.fontStyle === '' ? 'selected' : ''}>Normal</option>
                        <option value="B" ${el.fontStyle === 'B' ? 'selected' : ''}>Gras</option>
                        <option value="I" ${el.fontStyle === 'I' ? 'selected' : ''}>Italique</option>
                        <option value="U" ${el.fontStyle === 'U' ? 'selected' : ''}>Souligné</option>
                        <option value="BI" ${el.fontStyle === 'BI' ? 'selected' : ''}>Gras + Italique</option>
                    </select>
                </div>
            </div>
        `;
    },

    getBorderControls(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>Couleur bordure</label>
                    <input type="color" id="editBorderColor" value="${el.borderColor || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Épaisseur bordure (mm)</label>
                    <input type="number" id="editBorderWidth" value="${el.borderWidth || 0.1}" step="0.1" min="0" max="5">
                    <small style="display: block; margin-top: 5px; color: #666;">Valeur recommandée: 0.1 à 1.0 mm</small>
                </div>
            </div>
            <div class="form-group">
                <label>Couleur de fond</label>
                <input type="color" id="editFillColor" value="${el.fillColor === 'transparent' ? '#ffffff' : (el.fillColor || '#ffffff')}">
                <label style="display: inline-block; margin-left: 10px;">
                    <input type="checkbox" id="editTransparent" ${el.fillColor === 'transparent' ? 'checked' : ''}>
                    Transparent
                </label>
            </div>
            <script>
                document.getElementById('editTransparent').addEventListener('change', (e) => {
                    document.getElementById('editFillColor').disabled = e.target.checked;
                });
                document.getElementById('editFillColor').disabled = ${el.fillColor === 'transparent' ? 'true' : 'false'};
            </script>
        `;
    },

    getTextEditForm(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>Position X (mm)</label>
                    <input type="number" id="editX" value="${el.x || 50}" step="0.1" min="-100" max="310">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord gauche, 210 = bord droit</small>
                </div>
                <div class="form-group">
                    <label>Position Y (mm)</label>
                    <input type="number" id="editY" value="${el.y || 50}" step="0.1" min="-100" max="397">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord haut, 297 = bord bas</small>
                </div>
            </div>
            
            <div class="form-group">
                <label>Texte</label>
                <textarea id="editContent" rows="3">${el.content || ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Taille police</label>
                    <input type="number" id="editFontSize" value="${el.fontSize || 12}" min="6" max="72">
                </div>
                <div class="form-group">
                    <label>Police</label>
                    <select id="editFontFamily">
                        <option value="helvetica" ${el.fontFamily === 'helvetica' || el.fontFamily === 'arial' || el.fontFamily === 'dejavusans' ? 'selected' : ''}>Helvetica</option>
                        <option value="times" ${el.fontFamily === 'times' ? 'selected' : ''}>Times</option>
                        <option value="courier" ${el.fontFamily === 'courier' ? 'selected' : ''}>Courier</option>
                        <option value="symbol" ${el.fontFamily === 'symbol' ? 'selected' : ''}>Symbol</option>
                        <option value="zapfdingbats" ${el.fontFamily === 'zapfdingbats' ? 'selected' : ''}>ZapfDingbats</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Style</label>
                    <select id="editFontStyle">
                        <option value="" ${el.fontStyle === '' ? 'selected' : ''}>Normal</option>
                        <option value="B" ${el.fontStyle === 'B' ? 'selected' : ''}>Gras</option>
                        <option value="I" ${el.fontStyle === 'I' ? 'selected' : ''}>Italique</option>
                        <option value="U" ${el.fontStyle === 'U' ? 'selected' : ''}>Souligné</option>
                        <option value="BI" ${el.fontStyle === 'BI' ? 'selected' : ''}>Gras Italique</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Alignement</label>
                    <select id="editAlign">
                        <option value="L" ${el.align === 'L' ? 'selected' : ''}>Gauche</option>
                        <option value="C" ${el.align === 'C' ? 'selected' : ''}>Centre</option>
                        <option value="R" ${el.align === 'R' ? 'selected' : ''}>Droite</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Couleur</label>
                <input type="color" id="editColor" value="${el.color || '#000000'}">
            </div>
            <div class="form-group">
                <label>Rotation (degrés)</label>
                <input type="number" id="editRotation" value="${el.rotation || 0}" min="-360" max="360" step="15">
                <small style="display: block; margin-top: 5px; color: #666;">Rotation dans le sens horaire</small>
            </div>
        `;
    },

    getTextCellEditForm(el) {
        return `
            <div class="form-group">
                <label>Texte</label>
                <textarea id="editContent" rows="3">${el.content || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur (mm)</label>
                    <input type="number" id="editWidth" value="${el.width || 50}" step="0.1" min="10" max="200">
                </div>
                <div class="form-group">
                    <label>Hauteur (mm)</label>
                    <input type="number" id="editHeight" value="${el.height || 20}" step="0.1" min="5" max="300">
                </div>
            </div>
            ${this.getFontControls(el)}
            <div class="form-row">
                <div class="form-group">
                    <label>Alignement H</label>
                    <select id="editAlign">
                        <option value="L" ${el.align === 'L' ? 'selected' : ''}>Gauche</option>
                        <option value="C" ${el.align === 'C' ? 'selected' : ''}>Centre</option>
                        <option value="R" ${el.align === 'R' ? 'selected' : ''}>Droite</option>
                        <option value="J" ${el.align === 'J' ? 'selected' : ''}>Justifié</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Alignement V</label>
                    <select id="editVAlign">
                        <option value="T" ${el.valign === 'T' ? 'selected' : ''}>Haut</option>
                        <option value="M" ${el.valign === 'M' ? 'selected' : ''}>Milieu</option>
                        <option value="B" ${el.valign === 'B' ? 'selected' : ''}>Bas</option>
                    </select>
                </div>
            </div>
            ${this.getBorderControls(el)}
        `;
    },

    getMultiCellEditForm(el) {
        return `
            <div class="form-group">
                <label>Texte</label>
                <textarea id="editContent" rows="4" style="width: 100%; resize: vertical;">${el.content || ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur (mm)</label>
                    <input type="number" id="editWidth" value="${el.width || 150}" step="0.1" min="10" max="200">
                </div>
                <div class="form-group">
                    <label>Hauteur min. (mm)</label>
                    <input type="number" id="editHeight" value="${el.minHeight || 30}" step="0.1" min="5" max="300">
                </div>
            </div>
            
            ${this.getFontControls(el)}
            
            <div class="form-row">
                <div class="form-group">
                    <label>Alignement</label>
                    <select id="editAlign">
                        <option value="L" ${el.align === 'L' ? 'selected' : ''}>Gauche</option>
                        <option value="C" ${el.align === 'C' ? 'selected' : ''}>Centre</option>
                        <option value="R" ${el.align === 'R' ? 'selected' : ''}>Droite</option>
                        <option value="J" ${el.align === 'J' ? 'selected' : ''}>Justifié</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Hauteur de ligne (pt)</label>
                    <input type="number" id="editLineHeight" value="${el.lineHeight || (el.fontSize * 1.2)}" step="0.1" min="6" max="50">
                    <small style="display: block; margin-top: 5px; color: #666;">Espacement entre les lignes</small>
                </div>
            </div>
            
            ${this.getBorderControls(el)}
        `;
    },

    getRectEditForm(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur (mm)</label>
                    <input type="number" id="editWidth" value="${el.width || 50}" step="0.1" min="1" max="200">
                </div>
                <div class="form-group">
                    <label>Hauteur (mm)</label>
                    <input type="number" id="editHeight" value="${el.height || 30}" step="0.1" min="1" max="300">
                </div>
            </div>
            ${this.getBorderControls(el)}
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editRounded" ${el.rounded ? 'checked' : ''}>
                    Coins arrondis
                </label>
            </div>
            <div class="form-group" id="radiusGroup" style="display: ${el.rounded ? 'block' : 'none'}">
                <label>Rayon (mm)</label>
                <input type="number" id="editRadius" value="${el.radius || 5}" step="0.1" min="0" max="50">
            </div>
            <div class="form-group">
                <label>Rotation (degrés)</label>
                <input type="number" id="editRotation" value="${el.rotation || 0}" min="-360" max="360" step="15">
                <small style="display: block; margin-top: 5px; color: #666;">Rotation dans le sens horaire</small>
            </div>
            <script>
                document.getElementById('editRounded').addEventListener('change', (e) => {
                    document.getElementById('radiusGroup').style.display = e.target.checked ? 'block' : 'none';
                });
            </script>
        `;
    },

    getLineEditForm(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>X1 (mm)</label>
                    <input type="number" id="editX1" value="${el.x1 || 10}" step="0.1">
                </div>
                <div class="form-group">
                    <label>Y1 (mm)</label>
                    <input type="number" id="editY1" value="${el.y1 || 10}" step="0.1">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>X2 (mm)</label>
                    <input type="number" id="editX2" value="${el.x2 || 60}" step="0.1">
                </div>
                <div class="form-group">
                    <label>Y2 (mm)</label>
                    <input type="number" id="editY2" value="${el.y2 || 10}" step="0.1">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Couleur</label>
                    <input type="color" id="editColor" value="${el.color || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Épaisseur</label>
                    <input type="number" id="editWidth" value="${el.width || 0.5}" step="0.1">
                </div>
            </div>
            <div class="form-group">
                <label>Style</label>
                <select id="editStyle">
                    <option value="solid" ${el.style === 'solid' ? 'selected' : ''}>Solide</option>
                    <option value="dashed" ${el.style === 'dashed' ? 'selected' : ''}>Pointillés</option>
                </select>
            </div>
        `;
    },

    getCircleEditForm(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>Position X (mm)</label>
                    <input type="number" id="editX" value="${el.x || 50}" step="0.1" min="-100" max="310">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord gauche, 210 = bord droit</small>
                </div>
                <div class="form-group">
                    <label>Position Y (mm)</label>
                    <input type="number" id="editY" value="${el.y || 50}" step="0.1" min="-100" max="397">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord haut, 297 = bord bas</small>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Rayon X (mm)</label>
                    <input type="number" id="editRadiusX" value="${el.radiusX || el.radius || 15}" step="0.1" min="1" max="100">
                </div>
                <div class="form-group">
                    <label>Rayon Y (mm)</label>
                    <input type="number" id="editRadiusY" value="${el.radiusY || el.radius || 15}" step="0.1" min="1" max="100">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Couleur bordure</label>
                    <input type="color" id="editBorderColor" value="${el.borderColor || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Épaisseur bordure (mm)</label>
                    <input type="number" id="editBorderWidth" value="${el.borderWidth || 0.1}" step="0.1" min="0" max="5">
                    <small style="display: block; margin-top: 5px; color: #666;">Valeur recommandée: 0.1 à 1.0 mm</small>
                </div>
            </div>
            <div class="form-group">
                <label>Couleur de fond</label>
                <input type="color" id="editFillColor" value="${el.fillColor === 'transparent' ? '#ffffff' : (el.fillColor || '#ffffff')}">
                <label style="display: inline-block; margin-left: 10px;">
                    <input type="checkbox" id="editTransparent" ${el.fillColor === 'transparent' ? 'checked' : ''}>
                    Transparent
                </label>
            </div>
            <div class="form-group">
                <label>Rotation (degrés - sens horaire ⟳)</label>
                <input type="number" id="editRotation" value="${el.rotation || 0}" min="0" max="360" step="15">
            </div>
            <script>
                document.getElementById('editTransparent').addEventListener('change', (e) => {
                    document.getElementById('editFillColor').disabled = e.target.checked;
                });
                document.getElementById('editFillColor').disabled = ${el.fillColor === 'transparent' ? 'true' : 'false'};
            </script>
        `;
    },

    getImageEditForm(el) {
        return `
            <div class="form-group">
                <button type="button" id="fitToPage" class="btn btn-info" style="width: 100%; margin-bottom: 15px;" onclick="fitToPage()">
                    📄 Adapter à la page (0,0 - 210x297mm)
                </button>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Position X (mm)</label>
                    <input type="number" id="editX" value="${el.x || 50}" step="0.1" min="-100" max="310">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord gauche, 210 = bord droit</small>
                </div>
                <div class="form-group">
                    <label>Position Y (mm)</label>
                    <input type="number" id="editY" value="${el.y || 50}" step="0.1" min="-100" max="397">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord haut, 297 = bord bas</small>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur (mm)</label>
                    <input type="number" id="editWidth" value="${el.width || 100}" step="0.1" min="1" max="400">
                </div>
                <div class="form-group">
                    <label>Hauteur (mm)</label>
                    <input type="number" id="editHeight" value="${el.height || 100}" step="0.1" min="1" max="400">
                </div>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editKeepAspectRatio" ${el.keepAspectRatio ? 'checked' : ''}>
                    Conserver les proportions (recommandé)
                </label>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Rotation (degrés - sens horaire ⟳)</label>
                    <input type="number" id="editRotation" value="${el.rotation || 0}" min="0" max="360" step="15">
                </div>
                <div class="form-group">
                    <label>Opacité (%)</label>
                    <input type="number" id="editOpacity" value="${el.opacity || 100}" min="0" max="100" step="10">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Bordure</label>
                    <select id="editBorder">
                        <option value="0" ${el.border === 0 ? 'selected' : ''}>Aucune</option>
                        <option value="1" ${el.border === 1 ? 'selected' : ''}>Avec bordure</option>
                    </select>
                </div>
                <div class="form-group" id="borderWidthGroup" style="display: ${el.border === 1 ? 'block' : 'none'}">
                    <label>Épaisseur (mm)</label>
                    <input type="number" id="editBorderWidth" value="${el.borderWidth || 0.1}" step="0.1" min="0.1" max="5">
                </div>
            </div>
            
            <div class="form-group" id="borderColorGroup" style="display: ${el.border === 1 ? 'block' : 'none'}">
                <label>Couleur de bordure</label>
                <input type="color" id="editBorderColor" value="${el.borderColor || '#000000'}">
            </div>
            
            <div class="form-group">
                <label>Lien (URL) - optionnel</label>
                <input type="text" id="editLink" value="${el.link || ''}" placeholder="https://...">
                <small style="display: block; margin-top: 5px; color: #666;">L'image sera cliquable dans le PDF</small>
            </div>
            
            ${el.serverPath ? `
            <div class="form-group">
                <label>📁 Chemin serveur</label>
                <input type="text" value="${el.serverPath}" disabled style="background: #f0f0f0; font-family: monospace; font-size: 11px;">
            </div>
            ` : ''}
            
            <div class="form-group">
                <label>📷 Format</label>
                <input type="text" value="${el.format || 'JPG'}" disabled style="background: #f0f0f0;">
            </div>
            
            <script>
                document.getElementById('editBorder').addEventListener('change', (e) => {
                    const show = e.target.value === '1';
                    document.getElementById('borderWidthGroup').style.display = show ? 'block' : 'none';
                    document.getElementById('borderColorGroup').style.display = show ? 'block' : 'none';
                });
            </script>
        `;
    },

    
    getHeaderFooterEditForm(el) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label>Position X (mm)</label>
                    <input type="number" id="editX" value="${el.x || 0}" step="0.1" min="-100" max="310">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord gauche, 210 = bord droit</small>
                </div>
                <div class="form-group">
                    <label>Position Y (mm)</label>
                    <input type="number" id="editY" value="${el.y || 0}" step="0.1" min="-100" max="397">
                    <small style="display: block; margin-top: 5px; color: #666;">0 = bord haut, 297 = bord bas</small>
                </div>
            </div>
            <div class="form-group">
                <label>Contenu ({nb} = numéro de page)</label>
                <input type="text" id="editContent" value="${el.content || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur (mm)</label>
                    <input type="number" id="editWidth" value="${el.width || 210}">
                </div>
                <div class="form-group">
                    <label>Hauteur (mm)</label>
                    <input type="number" id="editHeight" value="${el.height || 10}">
                </div>
            </div>
            ${this.getFontControls(el)}
            <div class="form-group">
                <label>Alignement</label>
                <select id="editAlign">
                    <option value="L" ${el.align === 'L' ? 'selected' : ''}>Gauche</option>
                    <option value="C" ${el.align === 'C' ? 'selected' : ''}>Centre</option>
                    <option value="R" ${el.align === 'R' ? 'selected' : ''}>Droite</option>
                </select>
            </div>
            <div class="form-group">
                <label>Couleur de fond</label>
                <input type="color" id="editFillColor" value="${el.fillColor || '#ffffff'}">
            </div>
        `;
    }
};

