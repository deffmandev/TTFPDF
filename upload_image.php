<?php
// filepath: d:\DEV\TTpdf\upload_image.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['imageData']) && isset($input['filename'])) {
        $imageData = $input['imageData'];
        $filename = $input['filename'];
        
        // Créer le dossier images si nécessaire
        $uploadDir = __DIR__ . '/images/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Nettoyer le nom de fichier
        $filename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);
        $filepath = $uploadDir . $filename;
        
        // Extraire les données base64
        if (preg_match('/^data:image\/(\w+);base64,(.+)$/', $imageData, $matches)) {
            $imageType = $matches[1];
            $base64Data = $matches[2];
            $decodedData = base64_decode($base64Data);
            
            if ($decodedData !== false) {
                // Convertir en JPG si ce n'est pas déjà du JPG
                if (strtolower($imageType) !== 'jpg' && strtolower($imageType) !== 'jpeg') {
                    // Créer une image temporaire à partir des données selon le format
                    $tempImage = null;
                    
                    switch (strtolower($imageType)) {
                        case 'png':
                            $tempImage = imagecreatefrompng('data://text/plain;base64,' . base64_encode($decodedData));
                            break;
                        case 'gif':
                            $tempImage = imagecreatefromgif('data://text/plain;base64,' . base64_encode($decodedData));
                            break;
                        case 'webp':
                            if (function_exists('imagecreatefromwebp')) {
                                $tempImage = imagecreatefromwebp('data://text/plain;base64,' . base64_encode($decodedData));
                            }
                            break;
                        default:
                            // Essayer avec imagecreatefromstring
                            $tempImage = imagecreatefromstring($decodedData);
                    }
                    
                    if ($tempImage !== false) {
                        // Convertir en JPG
                        $jpgFilename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';
                        $jpgFilepath = $uploadDir . $jpgFilename;
                        
                        // Activer la gestion des transparences pour PNG
                        if (strtolower($imageType) === 'png') {
                            // Créer un fond blanc
                            $whiteBackground = imagecreatetruecolor(imagesx($tempImage), imagesy($tempImage));
                            $white = imagecolorallocate($whiteBackground, 255, 255, 255);
                            imagefill($whiteBackground, 0, 0, $white);
                            
                            // Copier l'image PNG sur le fond blanc
                            imagecopy($whiteBackground, $tempImage, 0, 0, 0, 0, imagesx($tempImage), imagesy($tempImage));
                            imagedestroy($tempImage);
                            $tempImage = $whiteBackground;
                        }
                        
                        // Sauvegarder en JPG avec qualité 90%
                        if (imagejpeg($tempImage, $jpgFilepath, 90)) {
                            // Libérer la mémoire
                            imagedestroy($tempImage);
                            
                            // Mettre à jour les variables pour la réponse
                            $filepath = $jpgFilepath;
                            $filename = $jpgFilename;
                            $imageType = 'JPG';
                            
                            echo json_encode([
                                'success' => true,
                                'message' => 'Image convertie en JPG et téléchargée avec succès',
                                'filepath' => $filepath,
                                'filename' => $filename,
                                'url' => 'images/' . $filename,
                                'type' => $imageType,
                                'converted' => true,
                                'original_format' => $matches[1]
                            ]);
                        } else {
                            // Libérer la mémoire
                            imagedestroy($tempImage);
                            
                            http_response_code(500);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Erreur lors de la sauvegarde du JPG converti'
                            ]);
                        }
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Format d\'image non supporté: ' . $imageType,
                            'supported_formats' => ['png', 'gif', 'webp', 'jpg', 'jpeg']
                        ]);
                    }
                } else {
                    // C'est déjà du JPG, sauvegarder directement
                    if (file_put_contents($filepath, $decodedData)) {
                        echo json_encode([
                            'success' => true,
                            'message' => 'Image JPG téléchargée avec succès',
                            'filepath' => $filepath,
                            'filename' => $filename,
                            'url' => 'images/' . $filename,
                            'type' => strtoupper($imageType)
                        ]);
                    } else {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Erreur lors de la sauvegarde de l\'image'
                        ]);
                    }
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Erreur de décodage base64'
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Format d\'image invalide'
            ]);
        }
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Données manquantes'
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
}
?>