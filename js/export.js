// Export vers PHP/FPDF

function generatePHPCode(editor) {
    // Vérifier si des fonctionnalités avancées sont utilisées
    const needsExtended = editor.elements.some(el => {
        return (el.type === 'image' && (el.rotation || el.opacity < 100)) ||
               (el.type === 'rect' && el.rounded);
    });
    
    // Vérifier si des cercles sont utilisés
    const hasCircles = editor.elements.some(el => el.type === 'circle');
    
    const fpdfRequire = needsExtended ? 
        "require('fpdf/fpdf.php');" : 
        "require('fpdf/fpdf.php');";
    
    const className = hasCircles ? 'PDF_Ellipse' : 'FPDF';
    
    let code = `<?php
// Encodage UTF-8 pour les caractères spéciaux
header('Content-Type: text/html; charset=utf-8');

// Fonction pour convertir UTF-8 en ISO-8859-1
function utf8_to_iso8859_1($string) {
    return mb_convert_encoding($string, 'ISO-8859-1', 'UTF-8');
}

${fpdfRequire}

${hasCircles ? `class PDF_Ellipse extends FPDF
{
    function Circle($x, $y, $r, $style='D')
    {
        $this->Ellipse($x,$y,$r,$r,$style);
    }

    function Ellipse($x, $y, $rx, $ry, $style='D')
    {
        if($style=='F')
            $op='f';
        elseif($style=='FD' || $style=='DF')
            $op='B';
        else
            $op='S';
        $lx=4/3*(M_SQRT2-1)*$rx;
        $ly=4/3*(M_SQRT2-1)*$ry;
        $k=$this->k;
        $h=$this->h;
        $this->_out(sprintf('%.2F %.2F m %.2F %.2F %.2F %.2F %.2F %.2F c',
            ($x+$rx)*$k,($h-$y)*$k,
            ($x+$rx)*$k,($h-($y-$ly))*$k,
            ($x+$lx)*$k,($h-($y-$ry))*$k,
            $x*$k,($h-($y-$ry))*$k));
        $this->_out(sprintf('%.2F %.2F %.2F %.2F %.2F %.2F c',
            ($x-$lx)*$k,($h-($y-$ry))*$k,
            ($x-$rx)*$k,($h-($y-$ly))*$k,
            ($x-$rx)*$k,($h-$y)*$k));
        $this->_out(sprintf('%.2F %.2F %.2F %.2F %.2F %.2F c',
            ($x-$rx)*$k,($h-($y+$ly))*$k,
            ($x-$lx)*$k,($h-($y+$ry))*$k,
            $x*$k,($h-($y+$ry))*$k));
        $this->_out(sprintf('%.2F %.2F %.2F %.2F %.2F %.2F c %s',
            ($x+$lx)*$k,($h-($y+$ry))*$k,
            ($x+$rx)*$k,($h-($y+$ly))*$k,
            ($x+$rx)*$k,($h-$y)*$k,
            $op));
    }
}
` : ''}

class PDF extends ${className} {
    function Header() {
${generateHeaderCode(editor)}
    }
    
    function Footer() {
${generateFooterCode(editor)}
    }
}

$pdf = new PDF('${editor.pageSettings.orientation}', 'mm', '${editor.pageSettings.format}');
// Marges définies à 0 - les éléments se positionnent directement sur la page
$pdf->SetMargins(0, 0, 0, 0);
// Désactiver le saut de page automatique
$pdf->SetAutoPageBreak(false);
$pdf->SetTitle('Document PDF créé avec PHP');
$pdf->AddPage();

`;

    const others = editor.elements.filter(e => e.type !== 'header' && e.type !== 'footer');
    others.forEach(el => {
        code += generateElementPHP(el);
    });

    code += `
$pdf->Output('I', 'document.pdf');
?>`;

    return code;
}

function generateHeaderCode(editor) {
    const headers = editor.elements.filter(e => e.type === 'header');
    if (headers.length === 0) return '        // Pas d\'en-tête';
    
    let code = '';
    headers.forEach(el => {
        code += `        $this->SetFont('${el.fontFamily}', '${el.fontStyle}', ${el.fontSize});\n`;
        code += `        $this->SetTextColor(${hexToRGB(el.color)});\n`;
        if (el.fillColor !== 'transparent') {
            code += `        $this->SetFillColor(${hexToRGB(el.fillColor)});\n`;
        }
        code += `        $this->Cell(0, ${el.height}, utf8_to_iso8859_1('${el.content}'), 0, 0, '${el.align}', ${el.fillColor !== 'transparent' ? 'true' : 'false'});\n`;
        code += `        $this->Ln();\n`;
    });
    return code;
}

function generateFooterCode(editor) {
    const footers = editor.elements.filter(e => e.type === 'footer');
    if (footers.length === 0) return '        // Pas de pied de page';
    
    let code = '';
    footers.forEach(el => {
        code += `        $this->SetY(-${el.height});\n`;
        code += `        $this->SetFont('${el.fontFamily}', '${el.fontStyle}', ${el.fontSize});\n`;
        code += `        $this->SetTextColor(${hexToRGB(el.color)});\n`;
        if (el.fillColor !== 'transparent') {
            code += `        $this->SetFillColor(${hexToRGB(el.fillColor)});\n`;
        }
        const content = el.content.replace('{nb}', '\' . $this->PageNo() . \'');
        code += `        $this->Cell(0, ${el.height}, utf8_to_iso8859_1('${content}'), 0, 0, '${el.align}', ${el.fillColor !== 'transparent' ? 'true' : 'false'});\n`;
    });
    return code;
}

function generateElementPHP(el) {
    let code = `\n// ${getElementTypeName(el.type)} (ID: ${el.id})\n`;
    
    switch(el.type) {
        case 'text':
            // Convertir les polices non supportées par FPDF
            let fontFamily = el.fontFamily;
            if (fontFamily === 'arial') fontFamily = 'helvetica';
            if (fontFamily === 'dejavusans') fontFamily = 'helvetica';
            
            code += `$pdf->SetFont('${fontFamily}', '${el.fontStyle}', ${el.fontSize});\n`;
            code += `$pdf->SetTextColor(${hexToRGB(el.color)});\n`;
            // Ajuster la position Y pour un meilleur alignement du texte
            const adjustedY = el.y + (el.fontSize / 4);
            code += `$pdf->SetXY(${el.x}, ${adjustedY});\n`;
            code += `$pdf->Write(0, utf8_to_iso8859_1('${escapeString(el.content)}'));\n`;
            break;

        case 'textcell':
            // Convertir les polices non supportées par FPDF
            let cellFontFamily = el.fontFamily;
            if (cellFontFamily === 'arial') cellFontFamily = 'helvetica';
            if (cellFontFamily === 'dejavusans') cellFontFamily = 'helvetica';
            
            code += `$pdf->SetFont('${cellFontFamily}', '${el.fontStyle}', ${el.fontSize});\n`;
            code += `$pdf->SetTextColor(${hexToRGB(el.color)});\n`;
            if (el.fillColor !== 'transparent') {
                code += `$pdf->SetFillColor(${hexToRGB(el.fillColor)});\n`;
            }
            code += `$pdf->SetDrawColor(${hexToRGB(el.borderColor)});\n`;
            code += `$pdf->SetLineWidth(${el.borderWidth});\n`;
            code += `$pdf->SetXY(${el.x}, ${el.y});\n`;
            // Pour les cellules de texte : utiliser Cell() (une seule ligne)
            code += `$pdf->Cell(${el.width}, ${el.height}, utf8_to_iso8859_1('${escapeString(el.content)}'), ${el.border}, 0, '${el.align}', ${el.fillColor !== 'transparent' ? 'true' : 'false'});\n`;
            break;

        case 'multicell':
            // Convertir les polices non supportées par FPDF
            let multiFontFamily = el.fontFamily;
            if (multiFontFamily === 'arial') multiFontFamily = 'helvetica';
            if (multiFontFamily === 'dejavusans') multiFontFamily = 'helvetica';
            
            code += `$pdf->SetFont('${multiFontFamily}', '${el.fontStyle}', ${el.fontSize});\n`;
            code += `$pdf->SetTextColor(${hexToRGB(el.color)});\n`;
            if (el.fillColor !== 'transparent') {
                code += `$pdf->SetFillColor(${hexToRGB(el.fillColor)});\n`;
            }
            code += `$pdf->SetDrawColor(${hexToRGB(el.borderColor)});\n`;
            code += `$pdf->SetLineWidth(${el.borderWidth});\n`;
            code += `$pdf->SetXY(${el.x}, ${el.y});\n`;
            // Utiliser la hauteur de ligne appropriée pour correspondre à l'éditeur
            const lineHeight = el.lineHeight || (el.fontSize * 1.2);
            // Préserver les sauts de ligne du textarea
            const contentWithLineBreaks = el.content.replace(/\n/g, '\\n').replace(/\r/g, '');
            code += `$pdf->MultiCell(${el.width}, ${lineHeight}, utf8_to_iso8859_1("${contentWithLineBreaks}"), ${el.border}, '${el.align}', ${el.fillColor !== 'transparent' ? 'true' : 'false'});\n`;
            break;

        case 'rect':
            code += `$pdf->SetDrawColor(${hexToRGB(el.borderColor)});\n`;
            if (el.fillColor !== 'transparent') {
                code += `$pdf->SetFillColor(${hexToRGB(el.fillColor)});\n`;
            }
            code += `$pdf->SetLineWidth(${el.borderWidth});\n`;
            
            if (el.rounded && el.radius > 0) {
                // Rectangle arrondi - nécessite PDF_Extended
                code += `// Rectangle avec coins arrondis\n`;
                code += `$pdf->RoundedRect(${el.x}, ${el.y}, ${el.width}, ${el.height}, ${el.radius}, '${el.fillColor !== 'transparent' ? 'DF' : 'D'}');\n`;
            } else {
                code += `$pdf->Rect(${el.x}, ${el.y}, ${el.width}, ${el.height}, '${el.fillColor !== 'transparent' ? 'DF' : 'D'}');\n`;
            }
            break;

        case 'line':
            code += `$pdf->SetDrawColor(${hexToRGB(el.color)});\n`;
            code += `$pdf->SetLineWidth(${el.width});\n`;
            code += `$pdf->Line(${el.x1}, ${el.y1}, ${el.x2}, ${el.y2});\n`;
            break;

        case 'circle':
            code += `$pdf->SetDrawColor(${hexToRGB(el.borderColor)});\n`;
            if (el.fillColor !== 'transparent') {
                code += `$pdf->SetFillColor(${hexToRGB(el.fillColor)});\n`;
            }
            code += `$pdf->SetLineWidth(${el.borderWidth});\n`;
            // FPDF Ellipse: centre de l'ellipse aux coordonnées spécifiées
            // Dans l'éditeur, l'ellipse est positionnée à x,y avec taille radiusX*2, radiusY*2
            // Donc le centre est à x + radiusX, y + radiusY
            const centerX = el.x + (el.radiusX || el.radius);
            const centerY = el.y + (el.radiusY || el.radius);
            const radiusX = el.radiusX || el.radius;
            const radiusY = el.radiusY || el.radius;
            
            if (radiusX === radiusY) {
                // Cercle
                code += `$pdf->Circle(${centerX}, ${centerY}, ${radiusX}, '${el.fillColor !== 'transparent' ? 'DF' : 'D'}');\n`;
            } else {
                // Ellipse
                code += `$pdf->Ellipse(${centerX}, ${centerY}, ${radiusX}, ${radiusY}, '${el.fillColor !== 'transparent' ? 'DF' : 'D'}');\n`;
            }
            break;

        case 'image':
            if (el.serverPath) {
                code += `// Image depuis serveur\n`;
                code += `$imagePath = __DIR__ . '/../${el.serverPath}';\n`;
                code += `if (file_exists($imagePath)) {\n`;
                
                if (el.rotation && el.rotation !== 0) {
                    // FPDF Rotate: rotation dans le sens horaire
                    // Le point de rotation est le centre de l'image
                    const centerX = el.x + (el.width / 2);
                    const centerY = el.y + (el.height / 2);
                    code += `    // Rotation de ${el.rotation}° (sens horaire)\n`;
                    code += `    $pdf->Rotate(${el.rotation}, ${centerX}, ${centerY});\n`;
                }
                
                if (el.opacity && el.opacity < 100) {
                    code += `    // Opacité ${el.opacity}%\n`;
                    code += `    $pdf->SetAlpha(${el.opacity / 100});\n`;
                }
                
                // Ajouter l'image
                code += `    $pdf->Image($imagePath, ${el.x}, ${el.y}, ${el.width}, ${el.height});\n`;
                
                if (el.link && el.link.trim() !== '') {
                    code += `    $pdf->Link(${el.x}, ${el.y}, ${el.width}, ${el.height}, '${escapeString(el.link)}');\n`;
                }
                
                if (el.border === 1) {
                    code += `    // Bordure autour de l'image\n`;
                    code += `    $pdf->SetDrawColor(${hexToRGB(el.borderColor || '#000000')});\n`;
                    code += `    $pdf->SetLineWidth(${el.borderWidth || 0.1});\n`;
                    code += `    $pdf->Rect(${el.x}, ${el.y}, ${el.width}, ${el.height});\n`;
                }
                
                if (el.opacity && el.opacity < 100) {
                    code += `    $pdf->SetAlpha(1);\n`;
                }
                
                if (el.rotation && el.rotation !== 0) {
                    code += `    $pdf->Rotate(0);\n`;
                }
                
                code += `} else {\n`;
                code += `    // Image introuvable\n`;
                code += `    $pdf->SetFont('Arial', '', 8);\n`;
                code += `    $pdf->SetTextColor(255, 0, 0);\n`;
                code += `    $pdf->SetXY(${el.x}, ${el.y});\n`;
                code += `    $pdf->Cell(${el.width}, ${el.height}, 'Image manquante: ' . basename($imagePath), 1, 0, 'C');\n`;
                code += `}\n`;
            } else {
                code += `// ATTENTION: Image non téléchargée sur le serveur\n`;
                code += `$pdf->Image('path/to/image.${el.format.toLowerCase()}', ${el.x}, ${el.y}, ${el.width}, ${el.height});\n`;
            }
            break;

        case 'barcode':
            code += `$pdf->SetFont('Arial', '', 8);\n`;
            code += `$pdf->SetXY(${el.x}, ${el.y});\n`;
            code += `$pdf->Cell(${el.width}, ${el.height}, utf8_to_iso8859_1('${escapeString(el.barcodeType || 'C128')}: ${escapeString(el.code || '123456789')}'), 1, 0, 'C');\n`;
            break;
    }

    return code;
}

// Fonction pour échapper les caractères spéciaux
function escapeString(str) {
    if (!str) return '';
    // Préserver les sauts de ligne pour les textes multilignes
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}