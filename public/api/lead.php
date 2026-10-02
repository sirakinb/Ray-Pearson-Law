<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	http_response_code(405);
	header('Allow: POST');
	echo json_encode(['error' => 'Method not allowed']);
	exit;
}

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
	http_response_code(500);
	echo json_encode(['error' => 'Lead form is not configured']);
	exit;
}

$config = require $configPath;
$apiKey = $config['ALIGNO_USER_API_KEY'] ?? '';
$webhookUrl = $config['ALIGNO_LEAD_WEBHOOK_URL'] ?? 'https://alignocrm.com/api/webhooks/lead';

if ($apiKey === '') {
	http_response_code(500);
	echo json_encode(['error' => 'Lead form is not configured']);
	exit;
}

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
if (!is_array($body)) {
	$body = [];
}

function split_name(string $fullName): array {
	$parts = preg_split('/\s+/', trim($fullName)) ?: [];
	$parts = array_values(array_filter($parts, static fn($p) => $p !== ''));
	if (count($parts) === 0) {
		return ['first_name' => '', 'last_name' => ''];
	}
	if (count($parts) === 1) {
		return ['first_name' => $parts[0], 'last_name' => ''];
	}
	return [
		'first_name' => $parts[0],
		'last_name' => implode(' ', array_slice($parts, 1)),
	];
}

function normalize_phone(string $phone): string {
	$digits = preg_replace('/\D+/', '', $phone) ?? '';
	if (strlen($digits) === 10) {
		return '+1' . $digits;
	}
	if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
		return '+' . $digits;
	}
	return trim($phone);
}

function is_valid_email(string $email): bool {
	return (bool) filter_var(trim($email), FILTER_VALIDATE_EMAIL);
}

function format_mailbox(string $name, string $email): string {
	$safeName = str_replace(['"', "\r", "\n"], '', $name);
	$safeEmail = trim($email);
	return $safeName !== '' ? "\"{$safeName}\" <{$safeEmail}>" : $safeEmail;
}

function build_lead_notification_body(array $lead): string {
	$lastName = trim((string) ($lead['last_name'] ?? ''));
	if ($lastName === '—') {
		$lastName = '';
	}

	$caseDetails = trim((string) ($lead['message'] ?? ''));

	$lines = [
		'New website lead from raypearsonlaw.com',
		'',
		'First Name: ' . trim((string) ($lead['first_name'] ?? '')),
		'Last Name: ' . $lastName,
		'Email Address: ' . trim((string) ($lead['email'] ?? '')),
		'Phone Number: ' . trim((string) ($lead['display_phone'] ?? $lead['phone'] ?? '')),
		'',
		'Case Details:',
		$caseDetails !== '' ? $caseDetails : '(not provided)',
		'',
		'Submitted at: ' . gmdate('F j, Y g:i A') . ' UTC',
	];

	return implode("\n", $lines);
}

function send_lead_notification(array $config, array $lead): bool {
	$to = trim((string) ($config['LEAD_NOTIFY_TO'] ?? ''));
	if ($to === '') {
		return true;
	}

	$bcc = trim((string) ($config['LEAD_NOTIFY_BCC'] ?? ''));
	$from = trim((string) ($config['LEAD_NOTIFY_FROM'] ?? 'contact@raypearsonlawgroup.com'));
	$fromName = trim((string) ($config['LEAD_NOTIFY_FROM_NAME'] ?? 'Law Office of Ray L. Pearson'));

	$fullName = trim($lead['first_name'] . ' ' . $lead['last_name']);
	$subject = 'New website lead: ' . ($fullName !== '' ? $fullName : 'Unknown');
	$body = build_lead_notification_body($lead);

	$headers = [
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'From: ' . format_mailbox($fromName, $from),
		'Reply-To: ' . $lead['email'],
	];

	if ($bcc !== '') {
		$headers[] = 'Bcc: ' . $bcc;
	}

	return mail($to, $subject, $body, implode("\r\n", $headers));
}

$firstName = trim((string) ($body['first_name'] ?? ''));
$lastName = trim((string) ($body['last_name'] ?? ''));
$phone = normalize_phone((string) ($body['phone'] ?? ''));
$email = trim((string) ($body['email'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));

if ($firstName === '' && !empty($body['name'])) {
	$split = split_name((string) $body['name']);
	$firstName = $split['first_name'];
	$lastName = $split['last_name'];
}

if ($firstName === '' || $phone === '' || $email === '') {
	http_response_code(400);
	echo json_encode(['error' => 'First name, phone, and email are required']);
	exit;
}

if (!is_valid_email($email)) {
	http_response_code(400);
	echo json_encode(['error' => 'Please enter a valid email address']);
	exit;
}

$payload = [
	'first_name' => $firstName,
	'last_name' => $lastName !== '' ? $lastName : '—',
	'phone' => $phone,
	'email' => $email,
];

if ($message !== '') {
	$payload['message'] = $message;
}

$ch = curl_init($webhookUrl);
curl_setopt_array($ch, [
	CURLOPT_POST => true,
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_HTTPHEADER => [
		'Content-Type: application/json',
		'x-api-key: ' . $apiKey,
	],
	CURLOPT_POSTFIELDS => json_encode($payload),
	CURLOPT_TIMEOUT => 20,
]);

$responseBody = curl_exec($ch);
$curlError = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($responseBody === false) {
	http_response_code(502);
	echo json_encode([
		'error' => 'Unable to reach our system. Please try again or call (404) 719-9561.',
		'details' => $curlError,
	]);
	exit;
}

$responseData = json_decode($responseBody, true);
if (!is_array($responseData)) {
	$responseData = ['raw' => $responseBody];
}

if ($status < 200 || $status >= 300) {
	http_response_code($status > 0 ? $status : 502);
	echo json_encode([
		'error' => 'Unable to submit your request. Please try again or call us directly.',
		'details' => $responseData,
	]);
	exit;
}

$emailSent = send_lead_notification($config, [
	...$payload,
	'display_phone' => trim((string) ($body['phone'] ?? '')),
]);

http_response_code(200);
echo json_encode([
	'success' => true,
	'data' => $responseData,
	'notification_sent' => $emailSent,
]);
