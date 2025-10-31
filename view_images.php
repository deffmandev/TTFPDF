<?php
// filepath: d:\DEV\TTpdf\view_images.php
// Page pour visualiser toutes les images uploadées
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Images uploadées</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .image-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            background: #fafafa;
        }
        .image-card img {
            width: 100%;
            height: 200px;
            object-fit: contain;
            background: white;
            border-radius: 4px;
        }
        .image-info {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
        }
        .image-info strong {
            color: #333;
        }
        .no-images {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        .actions {
            margin-top: 10px;
        }
        .btn {
            display: inline-block;
            padding: 5px 10px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 5px;
        }
        .btn-danger {
            background: #ef4444;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📸 Images uploadées</h1>
        
        <?php
        $imagesDir = __DIR__ . '/images/';
        
        if (is_dir($imagesDir)) {
            $files = scandir($imagesDir);
            $imageFiles = array_filter($files, function($file) {
                return !in_array($file, ['.', '..', '.gitkeep']);
            });
            
            if (count($imageFiles) > 0) {
                echo "<p>Nombre d'images: <strong>" . count($imageFiles) . "</strong></p>";
                echo "<div class='images-grid'>";
                
                foreach ($imageFiles as $file) {
                    $filepath = $imagesDir . $file;
                    $filesize = round(filesize($filepath) / 1024, 2);
                    $modified = date('d/m/Y H:i', filemtime($filepath));
                    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    
                    echo "<div class='image-card'>";
                    echo "<img src='images/$file' alt='$file' loading='lazy'>";
                    echo "<div class='image-info'>";
                    echo "<strong>$file</strong><br>";
                    echo "Taille: $filesize KB<br>";
                    echo "Type: $extension<br>";
                    echo "Modifié: $modified<br>";
                    echo "</div>";
                    echo "<div class='actions'>";
                    echo "<a href='images/$file' target='_blank' class='btn'>Voir</a>";
                    echo "</div>";
                    echo "</div>";
                }
                
                echo "</div>";
            } else {
                echo "<div class='no-images'>";
                echo "<p>❌ Aucune image trouvée</p>";
                echo "<p>Utilisez l'éditeur PDF pour uploader des images</p>";
                echo "</div>";
            }
        } else {
            echo "<div class='no-images'>";
            echo "<p>❌ Le dossier 'images/' n'existe pas</p>";
            echo "</div>";
        }
        ?>
        
        <hr style="margin: 30px 0;">
        
        <div style="text-align: center;">
            <a href="index.html" class="btn">🔙 Retour à l'éditeur</a>
            <a href="check_image.php" target="_blank" class="btn">🔍 JSON Info</a>
            <a href="debug_pdf.php" target="_blank" class="btn">🐛 Test PDF</a>
        </div>
    </div>
</body>
</html>