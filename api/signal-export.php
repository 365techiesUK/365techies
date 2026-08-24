<?php
/**
 * signal-export.php - WITHDRAWN.
 *
 * The public CSV download existed for one day (2026-08-23/24). Owner
 * decision 2026-08-24: the crowd data is not self-serve - it is shared
 * with councils, researchers and journalists case by case, on our terms.
 * This file stays so the hash-sync deploy overwrites the live copy with a
 * dead endpoint; do not delete it, and do not resurrect the download
 * without the owner asking for it.
 */
http_response_code(410);
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(['ok' => false,
    'error' => 'This export has been withdrawn. For access to the underlying figures, contact info@365techies.co.uk.']);
