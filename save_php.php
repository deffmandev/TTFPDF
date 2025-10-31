<?php
// filepath: d:\DEV\TTpdf\save_php.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['code']) && isset($input['filename'])) {
        $code = $input['code'];
        $filename = $input['filename'];
        
        // Nettoyer le nom de fichier
        $filename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $filename);
        $phpFilepath = __DIR__ . '/generated/' . $filename . '.php';
        $pdfFilename = $filename . '.pdf';
        $pdfFilepath = __DIR__ . '/output/' . $pdfFilename;
        
        // Créer les dossiers si nécessaire
        if (!is_dir(__DIR__ . '/generated')) {
            mkdir(__DIR__ . '/generated', 0755, true);
        }
        if (!is_dir(__DIR__ . '/output')) {
            mkdir(__DIR__ . '/output', 0755, true);
        }
        
        // Vérifier si tFPDF est disponible, sinon utiliser FPDF
        if (file_exists(__DIR__ . '/tfpdf/tfpdf.php')) {
            // tFPDF est disponible, garder le code tel quel
        } else {
            // FPDF standard utilisé
        }
        
        // Remplacer le chemin de sortie dans le code PHP
        $code = str_replace(
            "\$pdf->Output('I', 'document.pdf');",
            "\$pdf->Output('F', '" . $pdfFilepath . "');",
            $code
        );
        
        // Sauvegarder le fichier PHP
        if (file_put_contents($phpFilepath, $code)) {
            // Exécuter le fichier PHP pour générer le PDF
            ob_start();
            
            // Sauvegarder et changer le répertoire de travail
            $oldDir = getcwd();
            chdir(__DIR__);
            
            try {
                // Inclure le fichier PHP généré
                include $phpFilepath;
                
                $output = ob_get_clean();
                chdir($oldDir);
                
                // Vérifier si le PDF a été créé
                if (file_exists($pdfFilepath) && filesize($pdfFilepath) > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'PDF généré avec succès',
                        'phpFile' => $filename . '.php',
                        'pdfFile' => $pdfFilename,
                        'pdfUrl' => 'output/' . $pdfFilename,
                        'phpPath' => $phpFilepath,
                        'pdfPath' => $pdfFilepath,
                        'pdfSize' => filesize($pdfFilepath)
                    ]);
                } else {
                    ob_end_clean();
                    chdir($oldDir);
                    
                    throw new Exception('Le PDF n\'a pas été créé');
                }
            } catch (Exception $e) {
                ob_end_clean();
                chdir($oldDir);
                
                // Log l'erreur
                error_log('Erreur génération PDF: ' . $e->getMessage());
                
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Erreur lors de la génération du PDF: ' . $e->getMessage(),
                    'phpFile' => $filename . '.php',
                    'phpPath' => $phpFilepath,
                    'error' => $e->getMessage(),
                    'line' => $e->getLine(),
                    'file' => $e->getFile()
                ]);
            }
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Erreur lors de la sauvegarde du fichier PHP'
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