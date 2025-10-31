// Création des éléments pour FPDF

const ElementFactory = {
    createText() {
        return {
            id: Date.now(),
            type: 'text',
            x: 50,
            y: 50,
            content: 'Nouveau texte',
            fontSize: 12,
            fontFamily: 'Arial',
            fontStyle: '',
            color: '#000000',
            align: 'L'
        };
    },

    createTextCell() {
        return {
            id: Date.now(),
            type: 'textcell',
            x: 50,
            y: 50,
            width: 150,
            height: 30,
            content: 'Texte dans cellule',
            fontSize: 12,
            fontFamily: 'Arial',
            fontStyle: '',
            color: '#000000',
            align: 'C',
            borderColor: '#000000',
            borderWidth: 0.1,
            fillColor: 'transparent',
            border: 1
        };
    },

    createMultiCell() {
        return {
            id: Date.now(),
            type: 'multicell',
            x: 50,
            y: 50,
            width: 180,
            minHeight: 60,
            content: 'Texte multiligne qui s\'adapte automatiquement à la hauteur nécessaire.',
            fontSize: 10,
            fontFamily: 'Arial',
            fontStyle: '',
            color: '#000000',
            align: 'L',
            borderColor: '#000000',
            borderWidth: 0.1,
            fillColor: 'transparent',
            border: 1,
            lineHeight: 5
        };
    },

    createRect() {
        return {
            id: Date.now(),
            type: 'rect',
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            borderColor: '#000000',
            borderWidth: 0.1,
            fillColor: 'transparent',
            style: 'D',
            rounded: false,
            radius: 0
        };
    },

    createLine() {
        return {
            id: Date.now(),
            type: 'line',
            x1: 50,
            y1: 50,
            x2: 150,
            y2: 50,
            color: '#000000',
            width: 0.5
        };
    },

    createCircle() {
        return {
            id: Date.now(),
            type: 'circle',
            x: 100,
            y: 100,
            radius: 50,
            borderColor: '#000000',
            borderWidth: 0.1,
            fillColor: 'transparent',
            style: 'D'
        };
    },

    createImage(src, format) {
        return {
            id: Date.now(),
            type: 'image',
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            src: src,
            serverPath: null,
            format: format,
            link: '',
            dpi: 96,
            keepAspectRatio: false,
            opacity: 100,
            rotation: 0,
            border: 0,
            borderColor: '#000000',
            borderWidth: 0.1
        };
    },

    createBarcode() {
        return {
            id: Date.now(),
            type: 'barcode',
            x: 50,
            y: 50,
            width: 120,
            height: 50,
            code: '123456789',
            barcodeType: 'C128',
            color: '#000000'
        };
    },

    createHeader() {
        return {
            id: Date.now(),
            type: 'header',
            x: 0,
            y: 0,
            width: 210,
            height: 15,
            content: 'En-tête du document',
            fontSize: 10,
            fontFamily: 'Arial',
            fontStyle: 'B',
            color: '#000000',
            align: 'C',
            fillColor: '#f0f0f0',
            borderWidth: 0.1
        };
    },

    createFooter() {
        return {
            id: Date.now(),
            type: 'footer',
            x: 0,
            y: 282,
            width: 210,
            height: 15,
            content: 'Page {nb}',
            fontSize: 9,
            fontFamily: 'Arial',
            fontStyle: 'I',
            color: '#666666',
            align: 'C',
            fillColor: '#f0f0f0',
            borderWidth: 0.1
        };
    }
};
