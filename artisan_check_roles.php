<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=cooling_tower_db;port=3306','root','', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare('SELECT role_id, role_name FROM roles WHERE role_name = :name OR LOWER(role_name)=:lower');
    $stmt->execute([':name' => 'Customer', ':lower' => strtolower('Customer')]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
