<?php
// filepath: d:\DEV\TTpdf\test_image_path.php
// Test des chemins d'images

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
echo "<style>body{font-family:Arial;padding:20px;background:#f5f5f5;} ";
echo "h1,h2,h3{color:#333;} pre{background:#fff;padding:15px;border-radius:5px;} ";
echo ".success{color:green;} .error{color:red;}</style></head><body>";

echo "<h1>🔍 Test des chemins d'images</h1>";

// Test 1: Depuis la racine
echo "<h2>📍 Contexte actuel (racine)</h2>";
echo "<pre>";
echo "__FILE__: " . __FILE__ . "\n";
echo "__DIR__: " . __DIR__ . "\n";
echo "</pre>";

// Test 2: Simuler le contexte dans generated/
echo "<h2>📁 Simulation depuis generated/</h2>";
echo "<pre>";
echo "Si on était dans generated/fichier.php:\n";
echo "__DIR__ serait: " . __DIR__ . "/generated\n\n";

echo "Pour accéder aux images:\n";
echo "\$imagePath = __DIR__ . '/../images/image.jpg';\n";
echo "Résultat: " . __DIR__ . "/generated/../images/image.jpg\n";
echo "Simplifié: " . realpath(__DIR__ . "/generated/../images") . "\n";
echo "</pre>";

// Test 3: Vérifier le dossier images
$imagesPath = __DIR__ . '/images';
echo "<h2>🖼️ Dossier images</h2>";
echo "<pre>";
echo "Chemin: $imagesPath\n";
echo "Existe: " . (is_dir($imagesPath) ? '<span class="success">✅ Oui</span>' : '<span class="error">❌ Non</span>') . "\n";
echo "</pre>";

if (is_dir($imagesPath)) {
    $files = scandir($imagesPath);
    $imageFiles = array_filter($files, function($file) {
        return !in_array($file, ['.', '..', '.gitkeep']);
    });
    
    if (count($imageFiles) > 0) {
        echo "<h3>Images trouvées (" . count($imageFiles) . "):</h3>";
        echo "<ul>";
        foreach ($imageFiles as $file) {
            $fullPath = $imagesPath . '/' . $file;
            $size = round(filesize($fullPath) / 1024, 2);
            echo "<li><strong>$file</strong> - $size KB - ";
            echo "<span class='success'>✅ Accessible</span></li>";
        }
        echo "</ul>";
        
        // Test 4: Simuler l'accès depuis generated/
        $firstImage = reset($imageFiles);
        echo "<h2>✅ Test d'accès depuis generated/</h2>";
        echo "<pre>";
        echo "// Code dans generated/fichier.php:\n";
        echo "\$imagePath = __DIR__ . '/../images/$firstImage';\n\n";
        
        $simulatedPath = __DIR__ . '/generated/../images/' . $firstImage;
        echo "Chemin simulé: $simulatedPath\n";
        echo "Existe: " . (file_exists($simulatedPath) ? '<span class="success">✅ Oui</span>' : '<span class="error">❌ Non</span>') . "\n";
        
        if (file_exists($simulatedPath)) {
            echo "\nChemin réel: " . realpath($simulatedPath) . "\n";
        }
        echo "</pre>";
    } else {
        echo "<p class='error'>❌ Aucune image trouvée dans le dossier</p>";
    }
} else {
    echo "<p class='error'>❌ Le dossier images/ n'existe pas ou n'est pas accessible</p>";
}

// Test 5: Vérifier la structure
echo "<h2>📂 Structure des dossiers</h2>";
echo "<ul>";
echo "<li>📁 Racine: " . __DIR__ . "</li>";
echo "<li>📁 images/: " . (is_dir(__DIR__ . '/images') ? '✅' : '❌') . "</li>";
echo "<li>📁 generated/: " . (is_dir(__DIR__ . '/generated') ? '✅' : '❌') . "</li>";
echo "<li>📁 output/: " . (is_dir(__DIR__ . '/output') ? '✅' : '❌') . "</li>";
echo "<li>📁 fpdf/: " . (is_dir(__DIR__ . '/fpdf') ? '✅' : '❌') . "</li>";
echo "</ul>";

echo "</body></html>";
?>