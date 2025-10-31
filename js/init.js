// Initialisation de l'application

let editor;

// Attendre que tous les scripts soient chargés
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que toutes les dépendances sont chargées
    if (typeof ModalManager === 'undefined') {
        console.error('ModalManager n\'est pas défini. Vérifiez que modal-utils.js est chargé.');
        return;
    }
    
    if (typeof ElementFactory === 'undefined') {
        console.error('ElementFactory n\'est pas défini. Vérifiez que elements.js est chargé.');
        return;
    }
    
    if (typeof FormBuilder === 'undefined') {
        console.error('FormBuilder n\'est pas défini. Vérifiez que forms.js est chargé.');
        return;
    }
    
    if (typeof renderElement !== 'function') {
        console.error('renderElement n\'est pas défini. Vérifiez que rendering.js est chargé.');
        return;
    }
    
    if (typeof generatePHPCode !== 'function') {
        console.error('generatePHPCode n\'est pas défini. Vérifiez que export.js est chargé.');
        return;
    }
    
    // Tout est OK, on peut initialiser l'éditeur
    try {
        editor = new PDFEditor();
        console.log('✅ Éditeur PDF initialisé avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        alert('Erreur lors de l\'initialisation de l\'application.\nConsultez la console (F12) pour plus de détails.');
    }
});
