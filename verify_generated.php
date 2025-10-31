<?php
// filepath: d:\DEV\TTpdf\verify_generated.php
// Vérifier le dernier fichier PHP généré

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
echo "<style>body{font-family:Arial;padding:20px;} pre{background:#f5f5f5;padding:15px;border-radius:5px;overflow-x:auto;}</style></head><body>";
echo "<h1>🔍 Vérification du code généré</h1>";

$generatedDir = __DIR__ . '/generated';

if (is_dir($generatedDir)) {
    $files = scandir($generatedDir);
    $phpFiles = array_filter($files, function($file) {
        return pathinfo($file, PATHINFO_EXTENSION) === 'php';
    });
    
    if (count($phpFiles) > 0) {
        // Trier par date de modification (plus récent en premier)
        usort($phpFiles, function($a, $b) use ($generatedDir) {
            return filemtime($generatedDir . '/' . $b) - filemtime($generatedDir . '/' . $a);
        });
        
        $latestFile = $phpFiles[0];
        $filepath = $generatedDir . '/' . $latestFile;
        
        echo "<h2>📄 Dernier fichier: $latestFile</h2>";
        echo "<p>Date: " . date('d/m/Y H:i:s', filemtime($filepath)) . "</p>";
        
        $content = file_get_contents($filepath);
        
        // Extraire les chemins d'images
        preg_match_all('/\$imagePath = (.+);/', $content, $matches);
        
        if (!empty($matches[1])) {
            echo "<h3>🖼️ Chemins d'images trouvés:</h3>";
            echo "<ul>";
            foreach ($matches[1] as $path) {
                echo "<li><code>$path</code></li>";
            }
            echo "</ul>";
        }
        
        echo "<h3>📝 Contenu du fichier:</h3>";
        echo "<pre>" . htmlspecialchars($content) . "</pre>";
        
        echo "<hr>";
        echo "<a href='generated/$latestFile' target='_blank'>📥 Télécharger le fichier</a>";
    } else {
        echo "<p>❌ Aucun fichier PHP trouvé dans generated/</p>";
    }
} else {
    echo "<p>❌ Le dossier generated/ n'existe pas</p>";
}

echo "</body></html>";
?>