// Fabrique d'éléments

class ElementFactory {
    static createText() {
        return {
            id: Date.now(),
            type: 'text',
            x: 50,
            y: 50,
            content: 'Texte par défaut',
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#000000',
            fontStyle: '',
            align: 'left',
            rotation: 0
        };
    }

    static createImage() {
        return {
            id: Date.now(),
            type: 'image',
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            src: 'https://via.placeholder.com/150',
            rotation: 0,
            opacity: 100
        };
    }

    static createLine() {
        return {
            id: Date.now(),
            type: 'line',
            x1: 50,
            y1: 50,
            x2: 150,
            y2: 50,
            width: 1,
            color: '#000000'
        };
    }

    static createRectangle() {
        return {
            id: Date.now(),
            type: 'rect',
            x: 50,
            y: 50,
            width: 100,
            height: 50,
            borderColor: '#000000',
            borderWidth: 1,
            fillColor: '#FFFFFF',
            rounded: false,
            radius: 0
        };
    }

    static createCircle() {
        return {
            id: Date.now(),
            type: 'circle',
            x: 100,
            y: 100,
            radiusX: 25,
            radiusY: 25,
            borderColor: '#000000',
            borderWidth: 1,
            fillColor: '#FFFFFF'
        };
    }

    static createTextCell() {
        return {
            id: Date.now(),
            type: 'textcell',
            x: 50,
            y: 50,
            width: 50,
            height: 20,
            content: 'Cellule de texte',
            fontSize: 10,
            fontFamily: 'Arial',
            color: '#000000',
            borderColor: '#000000',
            borderWidth: 1,
            fillColor: '#FFFFFF',
            align: 'center'
        };
    }

    static createMultiCell() {
        return {
            id: Date.now(),
            type: 'multicell',
            x: 50,
            y: 50,
            width: 50,
            minHeight: 20,
            content: 'Contenu de\nmulti-cellule',
            fontSize: 10,
            fontFamily: 'Arial',
            color: '#000000',
            borderColor: '#000000',
            borderWidth: 1,
            fillColor: '#FFFFFF',
            align: 'center',
            lineHeight: 12
        };
    }

    static createBarcode() {
        return {
            id: Date.now(),
            type: 'barcode',
            x: 50,
            y: 50,
            width: 50,
            height: 20,
            code: '123456789',
            barcodeType: 'C128'
        };
    }

    static createHeader() {
        return {
            id: Date.now(),
            type: 'header',
            x: 0,
            y: 0,
            width: 210,
            height: 50,
            content: 'En-tête',
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#000000',
            fillColor: '#FFFFFF',
            borderColor: '#000000',
            borderWidth: 1,
            align: 'center'
        };
    }

    static createFooter() {
        return {
            id: Date.now(),
            type: 'footer',
            x: 0,
            y: 297 - 50,
            width: 210,
            height: 50,
            content: 'Pied de page',
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#000000',
            fillColor: '#FFFFFF',
            borderColor: '#000000',
            borderWidth: 1,
            align: 'center'
        };
    }
}