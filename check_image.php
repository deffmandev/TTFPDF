<?php
// filepath: d:\DEV\TTpdf\check_image.php
// Script pour vérifier l'état des images

header('Content-Type: application/json');

$imagesDir = __DIR__ . '/images/';
$images = [];

// Fonction alternative pour obtenir le type MIME
function getMimeType($filepath) {
    $extension = strtolower(pathinfo($filepath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'bmp' => 'image/bmp',
        'webp' => 'image/webp'
    ];
    return isset($mimeTypes[$extension]) ? $mimeTypes[$extension] : 'unknown';
}

if (is_dir($imagesDir)) {
    $files = scandir($imagesDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..' && $file !== '.gitkeep') {
            $filepath = $imagesDir . $file;
            $images[] = [
                'filename' => $file,
                'size' => filesize($filepath),
                'size_formatted' => round(filesize($filepath) / 1024, 2) . ' KB',
                'path' => 'images/' . $file,
                'readable' => is_readable($filepath),
                'type' => getMimeType($filepath),
                'extension' => pathinfo($filepath, PATHINFO_EXTENSION),
                'modified' => date('Y-m-d H:i:s', filemtime($filepath))
            ];
        }
    }
}

echo json_encode([
    'success' => true,
    'count' => count($images),
    'images' => $images,
    'directory' => $imagesDir,
    'exists' => is_dir($imagesDir),
    'writable' => is_writable($imagesDir),
    'php_version' => PHP_VERSION
], JSON_PRETTY_PRINT);
?>