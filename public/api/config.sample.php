<?php
// Copy to config.php on the server and add your Aligno API key.
// config.php is blocked from web access via .htaccess.
return [
	'ALIGNO_USER_API_KEY' => 'your_aligno_api_key_here',
	'ALIGNO_LEAD_WEBHOOK_URL' => 'https://alignocrm.com/api/webhooks/lead',
	// Lead notification email (Hostinger PHP mail)
	'LEAD_NOTIFY_TO' => 'rpearson@raypearsonlawgroup.com',
	'LEAD_NOTIFY_BCC' => 'aki.b@pentridgemedia.com',
	'LEAD_NOTIFY_FROM' => 'contact@raypearsonlawgroup.com',
	'LEAD_NOTIFY_FROM_NAME' => 'Law Office of Ray L. Pearson',
];
