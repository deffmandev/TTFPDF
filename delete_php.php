<?php
// delete_pdf.php - Supprime le fichier PDF généré après ouverture

header('Content-Type: application/json');

// Recevoir les données JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['phpPath'])) { // ✅ Correction: 'phpPath' au lieu de 'pdfPath'
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Chemin du fichier manquant']);
    exit;
}

$phpPath = $data['phpPath']; // ✅ Correction: $phpPath au lieu de $pdfPath
$fullPath = __DIR__ . '/generated/' . basename($phpPath); // ✅ PHP dans generated/

if (file_exists($fullPath)) {
    if (unlink($fullPath)) {
        echo json_encode(['success' => true, 'message' => 'Fichier supprimé']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Fichier non trouvé']);
}
?>