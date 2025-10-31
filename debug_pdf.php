<?php
// Script de debug pour tester la génération de PDF avec image

require('fpdf/fpdf.php');

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Debug PDF</title>";
echo "<style>body{font-family:Arial;padding:20px;} .success{color:green;} .error{color:red;} .info{color:blue;}</style></head><body>";
echo "<h1>Test de génération PDF</h1>";

// Vérifier FPDF
if (class_exists('FPDF')) {
    echo "<p class='success'>✅ FPDF chargé</p>";
} else {
    echo "<p class='error'>❌ FPDF non trouvé</p>";
    exit;
}

// Vérifier le dossier images
$imagesDir = __DIR__ . '/images/';
echo "<h2>Vérification du dossier images</h2>";
echo "<p class='info'>Chemin: $imagesDir</p>";

if (is_dir($imagesDir)) {
    echo "<p class='success'>✅ Dossier images existe</p>";
    
    $files = scandir($imagesDir);
    $imageFiles = array_filter($files, function($file) {
        return !in_array($file, ['.', '..', '.gitkeep']);
    });
    
    echo "<p class='info'>Fichiers trouvés: " . count($imageFiles) . "</p>";
    
    if (count($imageFiles) > 0) {
        echo "<table border='1' cellpadding='5' cellspacing='0'>";
        echo "<tr><th>Fichier</th><th>Taille</th><th>Extension</th><th>Test PDF</th></tr>";
        
        foreach ($imageFiles as $file) {
            $filepath = $imagesDir . $file;
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            $filesize = round(filesize($filepath) / 1024, 2);
            
            echo "<tr>";
            echo "<td>$file</td>";
            echo "<td>$filesize KB</td>";
            echo "<td>$extension</td>";
            echo "<td>";
            
            // Tester la création d'un PDF avec cette image
            try {
                $pdf = new FPDF();
                $pdf->AddPage();
                
                // Essayer d'ajouter l'image
                $pdf->Image($filepath, 10, 10, 50, 50);
                
                $outputDir = __DIR__ . '/output/';
                if (!is_dir($outputDir)) {
                    mkdir($outputDir, 0755, true);
                }
                
                $outputPath = $outputDir . 'test_' . pathinfo($file, PATHINFO_FILENAME) . '.pdf';
                $pdf->Output('F', $outputPath);
                
                if (file_exists($outputPath) && filesize($outputPath) > 0) {
                    $pdfSize = round(filesize($outputPath) / 1024, 2);
                    echo "<span class='success'>✅ PDF créé ($pdfSize KB)</span> ";
                    echo "<a href='output/test_" . pathinfo($file, PATHINFO_FILENAME) . ".pdf' target='_blank'>Ouvrir</a>";
                } else {
                    echo "<span class='error'>❌ PDF non créé</span>";
                }
            } catch (Exception $e) {
                echo "<span class='error'>❌ Erreur: " . htmlspecialchars($e->getMessage()) . "</span>";
            }
            
            echo "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "<p class='error'>❌ Aucune image trouvée dans le dossier</p>";
        echo "<p class='info'>Pour tester, ajoutez des images via l'éditeur ou copiez manuellement des images dans le dossier 'images/'</p>";
    }
} else {
    echo "<p class='error'>❌ Dossier images n'existe pas</p>";
}

// Vérifier le dossier output
echo "<h2>Vérification du dossier output</h2>";
$outputDir = __DIR__ . '/output/';
if (is_dir($outputDir)) {
    echo "<p class='success'>✅ Dossier output existe</p>";
    echo "<p class='info'>Writable: " . (is_writable($outputDir) ? 'Oui' : 'Non') . "</p>";
} else {
    echo "<p class='error'>❌ Dossier output n'existe pas</p>";
}

// Vérifier FPDF
echo "<h2>Information FPDF</h2>";
echo "<p class='info'>Version PHP: " . PHP_VERSION . "</p>";
echo "<p class='info'>Classe FPDF: " . (class_exists('FPDF') ? 'Disponible' : 'Non disponible') . "</p>";

echo "</body></html>";
?>