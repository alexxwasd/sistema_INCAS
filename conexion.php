<?php
// conexion.php
$host = 'localhost';
$dbname = 'sistema_incas';
$username = 'postgres'; // Tu usuario de PostgreSQL
$password = 'software'; // La contraseña de pgAdmin
$port = '5432';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "Error de conexión: " . $e->getMessage()]);
    exit();
}
?>