const WEBHOOK_URL =
	process.env.ALIGNO_LEAD_WEBHOOK_URL ||
	'https://alignocrm.com/api/webhooks/lead';

function splitName(fullName) {
	const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return { first_name: '', last_name: '' };
	if (parts.length === 1) return { first_name: parts[0], last_name: '' };
	return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function normalizePhone(phone) {
	const digits = String(phone).replace(/\D/g, '');
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	return String(phone).trim();
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST');
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const apiKey = process.env.ALIGNO_USER_API_KEY;
	if (!apiKey) {
		return res.status(500).json({ error: 'Lead form is not configured' });
	}

	const body = req.body ?? {};
	let first_name = String(body.first_name ?? '').trim();
	let last_name = String(body.last_name ?? '').trim();
	const phone = normalizePhone(body.phone ?? '');
	const email = String(body.email ?? '').trim();
	const message = String(body.message ?? '').trim();

	if (!first_name && body.name) {
		({ first_name, last_name } = splitName(body.name));
	}

	if (!first_name || !phone || !email) {
		return res.status(400).json({ error: 'First name, phone, and email are required' });
	}

	if (!isValidEmail(email)) {
		return res.status(400).json({ error: 'Please enter a valid email address' });
	}

	const payload = {
		first_name,
		last_name: last_name || '—',
		phone,
		email,
	};

	if (message) {
		payload.message = message;
	}

	try {
		const response = await fetch(WEBHOOK_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
			},
			body: JSON.stringify(payload),
		});

		const responseText = await response.text();
		let responseData;
		try {
			responseData = responseText ? JSON.parse(responseText) : {};
		} catch {
			responseData = { raw: responseText };
		}

		if (!response.ok) {
			return res.status(response.status).json({
				error: 'Unable to submit your request. Please try again or call us directly.',
				details: responseData,
			});
		}

		return res.status(200).json({ success: true, data: responseData });
	} catch {
		return res.status(502).json({
			error: 'Unable to reach our system. Please try again or call (404) 719-9561.',
		});
	}
}
