// Export vers PHP/FPDF

function generatePHPCode(editor) {
    let phpCode = `<?php
// Encodage UTF-8 pour les caractères spéciaux
header('Content-Type: text/html; charset=utf-8');

// Fonction pour convertir UTF-8 en ISO-8859-1
function utf8_to_iso8859_1($string) {
    if (function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($string, 'ISO-8859-1', 'UTF-8');
    } else {
        // Fallback si mbstring n'est pas disponible
        return utf8_decode($string);
    }
}

require(__DIR__ . '/../fpdf/fpdf.php');

`;

    // Vérifier si on a besoin de la classe AlphaPDF (opacité sur les images)
    const needsAlpha = editor.elements.some(el => 
        el.type === 'image' && el.opacity !== undefined && el.opacity < 100
    );

    // Vérifier si on a besoin des méthodes Circle/Ellipse
    const needsCircle = editor.elements.some(el => el.type === 'circle');

    // Vérifier si on a besoin de RoundedRect
    const needsRoundedRect = editor.elements.some(el => 
        el.type === 'rect' && el.rounded && el.radius > 0
    );

    // Vérifier si on a besoin de la méthode Rotate
    const needsRotate = editor.elements.some(el => 
        (el.type === 'image' && el.rotation !== undefined && el.rotation !== 0) ||
        (el.type === 'text' && el.rotation !== undefined && el.rotation !== 0) ||
        (el.type === 'textcell' && el.rotation !== undefined && el.rotation !== 0) ||
        (el.type === 'multicell' && el.rotation !== undefined && el.rotation !== 0) ||
        (el.type === 'rect' && el.rotation !== undefined && el.rotation !== 0) ||
        (el.type === 'circle' && el.rotation !== undefined && el.rotation !== 0)
    );

    if (needsAlpha) {
        phpCode += `
// Classe pour gérer la transparence (opacité)
class AlphaPDF extends FPDF
{
    protected $extgstates = array();

    // alpha: real value from 0 (transparent) to 1 (opaque)
    // bm:    blend mode, one of the following:
    //          Normal, Multiply, Screen, Overlay, Darken, Lighten, ColorDodge, ColorBurn,
    //          HardLight, SoftLight, Difference, Exclusion, Hue, Saturation, Color, Luminosity
    function SetAlpha($alpha, $bm='Normal')
    {
        // set alpha for stroking (CA) and non-stroking (ca) operations
        $gs = $this->AddExtGState(array('ca'=>$alpha, 'CA'=>$alpha, 'BM'=>'/'.$bm));
        $this->SetExtGState($gs);
    }

    function AddExtGState($parms)
    {
        $n = count($this->extgstates)+1;
        $this->extgstates[$n]['parms'] = $parms;
        return $n;
    }

    function SetExtGState($gs)
    {
        $this->_out(sprintf('/GS%d gs', $gs));
    }

    function _enddoc()
    {
        if(!empty($this->extgstates) && $this->PDFVersion<'1.4')
            $this->PDFVersion='1.4';
        parent::_enddoc();
    }

    function _putextgstates()
    {
        for ($i = 1; $i <= count($this->extgstates); $i++)
        {
            $this->_newobj();
            $this->extgstates[$i]['n'] = $this->n;
            $this->_put('<</Type /ExtGState');
            $parms = $this->extgstates[$i]['parms'];
            $this->_put(sprintf('/ca %.3F', $parms['ca']));
            $this->_put(sprintf('/CA %.3F', $parms['CA']));
            $this->_put('/BM '.$parms['BM']);
            $this->_put('>>');
            $this->_put('endobj');
        }
    }

    function _putresourcedict()
    {
        parent::_putresourcedict();
        $this->_put('/ExtGState <<');
        foreach($this->extgstates as $k=>$extgstate)
            $this->_put('/GS'.$k.' '.$extgstate['n'].' 0 R');
        $this->_put('>>');
    }

    function _putresources()
    {
        $this->_putextgstates();
        parent::_putresources();
    }
}

`;
    }

    // Classe PDF
    phpCode += `
class PDF extends ${needsAlpha ? 'AlphaPDF' : 'FPDF'} {
    function Header() {
        // Pas d'en-tête
    }
    
    function Footer() {
        // Pas de pied de page
    }
    `;

    // Ajouter RoundedRect seulement si nécessaire
    if (needsRoundedRect) {
        phpCode += `
    // ✅ Fonction RoundedRect ajoutée
    function RoundedRect($x, $y, $w, $h, $r, $style = '') {
        $k = $this->k;
        $hp = $this->h;
        if($style=='F')
            $op='f';
        elseif($style=='FD' or $style=='DF')
            $op='B';
        else
            $op='S';
        $MyArc = 4/3 * (sqrt(2) - 1);
        $this->_out(sprintf('%.2f %.2f m', ($x+$r)*$k, ($hp-$y)*$k ));
        $xc = $x+$w-$r ;
        $yc = $y+$r;
        $this->_out(sprintf('%.2f %.2f l', $xc*$k, ($hp-$y)*$k ));
        $this->_Arc($xc + $r*$MyArc, $yc - $r, $xc + $r, $yc - $r*$MyArc, $xc + $r, $yc);
        $xc = $x+$w-$r ;
        $yc = $y+$h-$r;
        $this->_out(sprintf('%.2f %.2f l', ($x+$w)*$k, ($hp-$yc)*$k));
        $this->_Arc($xc + $r, $yc + $r*$MyArc, $xc + $r*$MyArc, $yc + $r, $xc, $yc + $r);
        $xc = $x+$r ;
        $yc = $y+$h-$r;
        $this->_out(sprintf('%.2f %.2f l', $xc*$k, ($hp-($y+$h))*$k));
        $this->_Arc($xc - $r*$MyArc, $yc + $r, $xc - $r, $yc + $r*$MyArc, $xc - $r, $yc);
        $xc = $x+$r ;
        $yc = $y+$r;
        $this->_out(sprintf('%.2f %.2f l', ($x)*$k, ($hp-$yc)*$k ));
        $this->_Arc($xc - $r, $yc - $r*$MyArc, $xc - $r*$MyArc, $yc - $r, $xc, $yc - $r);
        $this->_out($op);
    }
    
    function _Arc($x1, $y1, $x2, $y2, $x3, $y3) {
        $h = $this->h;
        $this->_out(sprintf('%.2f %.2f %.2f %.2f %.2f %.2f c ', $x1*$this->k, ($h-$y1)*$this->k,
            $x2*$this->k, ($h-$y2)*$this->k, $x3*$this->k, ($h-$y3)*$this->k));
    }
`;
    }

    // Ajouter les méthodes Circle et Ellipse si nécessaire
    if (needsCircle) {
        phpCode += `
    // Méthode pour dessiner un cercle
    function Circle($x, $y, $r, $style='D')
    {
        $this->Ellipse($x, $y, $r, $r, $style);
    }
    
    // Méthode pour dessiner une ellipse
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
`;
    }

    // Ajouter la méthode Rotate si nécessaire
    if (needsRotate) {
        phpCode += `
    // Méthode pour faire pivoter le système de coordonnées
    var $angle=0;

    function Rotate($angle,$x=-1,$y=-1)
    {
        if($x==-1)
            $x=$this->x;
        if($y==-1)
            $y=$this->y;
        if($this->angle!=0)
            $this->_out('Q');
        $this->angle=$angle;
        if($angle!=0)
        {
            $angle*=M_PI/180;
            $c=cos($angle);
            $s=sin($angle);
            $cx=$x*$this->k;
            $cy=($this->h-$y)*$this->k;
            $this->_out(sprintf('q %.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm',$c,$s,-$s,$c,$cx,$cy,-$cx,-$cy));
        }
    }

    function _endpage()
    {
        if($this->angle!=0)
        {
            $this->angle=0;
            $this->_out('Q');
        }
        parent::_endpage();
    }
`;
    }

    phpCode += `}

$pdf = new PDF('${editor.pageSettings.orientation}', '${editor.pageSettings.unit}', '${editor.pageSettings.format}');
// Marges définies à 0 - les éléments se positionnent directement sur la page
$pdf->SetMargins(0, 0, 0, 0);
// Désactiver le saut de page automatique
$pdf->SetAutoPageBreak(false);
$pdf->SetTitle('Outil création PDF par PHP', true);
$pdf->SetAuthor('DUSSERRE Frédéric', true);
$pdf->SetCreator('Version 1.0', true);
$pdf->SetKeywords('FPDF, PDF, document, PHP, TTFPDF', true);
$pdf->SetSubject('creation rapide php pour FPDF', true);
$pdf->AddPage();

`;

    const others = editor.elements.filter(e => e.type !== 'header' && e.type !== 'footer');
    others.forEach(el => {
        phpCode += generateElementPHP(el);
    });

    phpCode += `
$pdf->Output('I', 'document.pdf');
?>`;

    return phpCode;
}

// Fonction pour échapper les caractères spéciaux dans les chaînes PHP
function escapeString(str) {
    if (!str) return '';
    // Échapper les caractères qui peuvent casser le code PHP
    return str.replace(/\\/g, '\\\\')  // Backslash
              .replace(/\$/g, '\\$')    // Dollar (pour éviter l'interpolation de variables)
              .replace(/"/g, '\\"')     // Guillemet double (si on utilise des guillemets doubles)
              .replace(/\n/g, '\\n')    // Saut de ligne
              .replace(/\r/g, '');      // Retour chariot
}

// Fonction pour convertir HEX en RGB (format chaîne pour PHP)
function hexToRGB(hex) {
    const rgb = hexToRgb(hex);
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

// Fonction pour convertir HEX en RGB (format objet)
function hexToRgb(hex) {
    // Valeur par défaut si hex est invalide
    if (!hex || typeof hex !== 'string') {
        console.warn('⚠️ Couleur invalide:', hex, '- Utilisation de noir');
        return { r: 0, g: 0, b: 0 };
    }
    
    // Supprimer le # si présent
    hex = hex.replace('#', '');
    
    // Gérer les formats courts (ex: #FFF)
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Convertir en RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Vérifier que les valeurs sont valides
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn('⚠️ Conversion RGB échouée pour:', hex);
        return { r: 0, g: 0, b: 0 };
    }
    
    return { r, g, b };
}

// Fonction pour obtenir le nom du type d'élément
function getElementTypeName(type) {
    const names = {
        'text': 'Texte',
        'textcell': 'Cellule de texte',
        'multicell': 'Texte multiligne',
        'rect': 'Rectangle',
        'line': 'Ligne',
        'circle': 'Cercle',
        'image': 'Image',
        'barcode': 'Code-barres',
        'header': 'En-tête',
        'footer': 'Pied de page'
    };
    return names[type] || type;
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
            const adjustedY = el.y + (el.fontSize / 8);
            
            if (el.rotation && el.rotation !== 0) {
                // Calculer la largeur exacte du texte avec FPDF
                code += `// Calculer la largeur exacte du texte pour la rotation\n`;
                code += `$textWidth = $pdf->GetStringWidth(utf8_to_iso8859_1("${escapeString(el.content)}"));\n`;
                code += `$textHeight = ${el.fontSize} * 0.25; // Hauteur approximative basée sur la taille de police\n`;
                
                // Centre du texte non-rotaté
                code += `$centerX = ${el.x} + ($textWidth / 2);\n`;
                code += `$centerY = ${el.y} + (${el.fontSize} / 8);\n`; // Centre plus haut
                
                code += `// Positionner le texte à sa position normale\n`;
                code += `$pdf->SetXY(${el.x}, ${adjustedY});\n`;
                code += `// Rotation autour du centre du texte\n`;
                code += `$pdf->Rotate(${el.rotation}, $centerX, $centerY);\n`;
            } else {
                code += `$pdf->SetXY(${el.x}, ${adjustedY});\n`;
            }
            
            code += `$pdf->Write(0, utf8_to_iso8859_1("${escapeString(el.content)}"));\n`;
            
            if (el.rotation && el.rotation !== 0) {
                code += `$pdf->Rotate(0);\n`;
            }
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
            
            if (el.rotation && el.rotation !== 0) {
                const centerX = el.x + (el.width / 2);
                const centerY = el.y + (el.height / 2);
                code += `$pdf->Rotate(${el.rotation}, ${centerX}, ${centerY});\n`;
            }
            
            code += `$pdf->SetXY(${el.x}, ${el.y});\n`;
            // Pour les cellules de texte : utiliser Cell() (une seule ligne)
            code += `$pdf->Cell(${el.width}, ${el.height}, utf8_to_iso8859_1("${escapeString(el.content)}"), ${el.border}, 0, '${el.align}', ${el.fillColor !== 'transparent' ? 'true' : 'false'});\n`;
            
            if (el.rotation && el.rotation !== 0) {
                code += `$pdf->Rotate(0);\n`;
            }
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
            
            if (el.rotation && el.rotation !== 0) {
                const centerX = el.x + (el.width / 2);
                const centerY = el.y + ((el.minHeight || el.height || 20) / 2);
                code += `$pdf->Rotate(${el.rotation}, ${centerX}, ${centerY});\n`;
            }
            
            code += `$pdf->SetXY(${el.x}, ${el.y});\n`;
            // Utiliser la hauteur de ligne appropriée pour correspondre à l'éditeur
            const lineHeight = el.lineHeight || (el.fontSize * 1.2);
            // Préserver les sauts de ligne du textarea - utiliser des sauts de ligne réels dans le code PHP
            const contentWithLineBreaks = el.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            // Pour MultiCell, utiliser des sauts de ligne réels dans le code PHP au lieu de \n
            const escapedContent = escapeString(contentWithLineBreaks);
            code += `$pdf->MultiCell(${el.width}, ${lineHeight}, utf8_to_iso8859_1("${escapedContent.replace(/\\n/g, '\n')}"), ${el.border}, '${el.align}', ${el.fillColor !== 'transparent' ? 'true' : 'false'});\n`;
            
            if (el.rotation && el.rotation !== 0) {
                code += `$pdf->Rotate(0);\n`;
            }
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
                if (el.rotation && el.rotation !== 0) {
                    const centerX = el.x + (el.width / 2);
                    const centerY = el.y + (el.height / 2);
                    code += `$pdf->Rotate(${el.rotation}, ${centerX}, ${centerY});\n`;
                }
                code += `$pdf->RoundedRect(${el.x}, ${el.y}, ${el.width}, ${el.height}, ${el.radius}, '${el.fillColor !== 'transparent' ? 'DF' : 'D'}');\n`;
                if (el.rotation && el.rotation !== 0) {
                    code += `$pdf->Rotate(0);\n`;
                }
            } else {
                if (el.rotation && el.rotation !== 0) {
                    const centerX = el.x + (el.width / 2);
                    const centerY = el.y + (el.height / 2);
                    code += `$pdf->Rotate(${el.rotation}, ${centerX}, ${centerY});\n`;
                }
                code += `$pdf->Rect(${el.x}, ${el.y}, ${el.width}, ${el.height}, '${el.fillColor !== 'transparent' ? 'DF' : 'D'}');\n`;
                if (el.rotation && el.rotation !== 0) {
                    code += `$pdf->Rotate(0);\n`;
                }
            }
            break;

        case 'line':
            code += `$pdf->SetDrawColor(${hexToRGB(el.color)});\n`;
            code += `$pdf->SetLineWidth(${el.width});\n`;
            code += `$pdf->Line(${el.x1}, ${el.y1}, ${el.x2}, ${el.y2});\n`;
            break;

        case 'circle':
            const circleBorderRGB = hexToRgb(el.borderColor || '#000000');
            
            code += `$pdf->SetDrawColor(${circleBorderRGB.r}, ${circleBorderRGB.g}, ${circleBorderRGB.b});\n`;
            code += `$pdf->SetLineWidth(${el.borderWidth || 0.1});\n`;
            
            // Couleur de remplissage
            if (el.fillColor && el.fillColor !== 'transparent') {
                const circleFillRGB = hexToRgb(el.fillColor);
                code += `$pdf->SetFillColor(${circleFillRGB.r}, ${circleFillRGB.g}, ${circleFillRGB.b});\n`;
            }
            
            // Calculer le centre et les rayons
            const centerX = parseFloat(el.x) + parseFloat(el.radiusX || el.radius || 15);
            const centerY = parseFloat(el.y) + parseFloat(el.radiusY || el.radius || 15);
            const radiusX = parseFloat(el.radiusX || el.radius || 15);
            const radiusY = parseFloat(el.radiusY || el.radius || 15);
            
            // Appliquer la rotation si nécessaire
            if (el.rotation && el.rotation !== 0) {
                code += `$pdf->Rotate(${el.rotation}, ${centerX}, ${centerY});\n`;
            }
            
            // Déterminer le style
            const circleHasFill = el.fillColor && el.fillColor !== 'transparent';
            const circleStyle = circleHasFill ? 'FD' : 'D';
            
            // Vérifier si c'est un cercle parfait ou une ellipse
            if (Math.abs(radiusX - radiusY) < 0.01) {
                code += `$pdf->Circle(${centerX}, ${centerY}, ${radiusX}, '${circleStyle}');\n`;
            } else {
                code += `$pdf->Ellipse(${centerX}, ${centerY}, ${radiusX}, ${radiusY}, '${circleStyle}');\n`;
            }
            
            // Restaurer la rotation
            if (el.rotation && el.rotation !== 0) {
                code += `$pdf->Rotate(0);\n`;
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
                    code += `    $pdf->Link(${el.x}, ${el.y}, ${el.width}, ${el.height}, "${escapeString(el.link)}");\n`;
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
            code += `$pdf->Cell(${el.width}, ${el.height}, utf8_to_iso8859_1("${escapeString(el.barcodeType || 'C128')}: ${escapeString(el.code || '123456789')}"), 1, 0, 'C');\n`;
            break;
    }

    return code;
}