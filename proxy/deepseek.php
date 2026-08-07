<?php
/**
 * DeepSeek API 反向代理（解决浏览器直连被 CORS 拦截）
 * -------------------------------------------------
 * 用法：
 *   1. 把本文件上传到你个人网站的 proxy/deepseek.php
 *   2. App 设置页 → "DeepSeek 代理地址" 填：
 *      https://你的域名/proxy/deepseek.php
 *   3. 保存即可。
 *
 * 两种安全模式（任选其一）：
 *   A. 前端带 Key：浏览器在设置页填 Key，通过 Authorization 头转发（简单，但Key在浏览器里）
 *   B. 服务器写死 Key（推荐）：把下面 DEEPSEEK_KEY 填上，浏览器无需填Key，Key永不暴露
 *      此模式下 App 设置页的 API Key 留空即可。
 */
define("DEEPSEEK_KEY", "");   // ← 推荐：把你的 DeepSeek Key 填在这里（形如 sk-xxxx），浏览器就不需要填了

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$payload = file_get_contents("php://input");

// 取 Authorization 头（兼容不同服务器配置）
$auth = "";
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (function_exists('getallheaders')) {
    $headers = getallheaders();
    foreach ($headers as $k => $v) {
        if (strtolower($k) === 'authorization') { $auth = $v; break; }
    }
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

// 若前端没带 Key，且服务器已写死 Key，则使用服务器的 Key（更安全）
$finalAuth = $auth;
if (!$finalAuth && defined("DEEPSEEK_KEY") && DEEPSEEK_KEY) {
    $finalAuth = "Bearer " . DEEPSEEK_KEY;
}

$reqHeaders = array("Content-Type: application/json");
if ($finalAuth) $reqHeaders[] = "Authorization: " . $finalAuth;

$ch = curl_init("https://api.deepseek.com/chat/completions");
curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => $reqHeaders,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_SSL_VERIFYPEER => true
));

$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($resp === false) {
    http_response_code(502);
    header("Content-Type: application/json");
    echo json_encode(array("error" => array("message" => "代理转发失败: " . $err)));
    exit;
}

http_response_code($code ? $code : 500);
header("Content-Type: application/json");
echo $resp;
