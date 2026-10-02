function splitName(fullName) {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return { first_name: '', last_name: '' };
	if (parts.length === 1) return { first_name: parts[0], last_name: '' };
	return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function getFormPayload(form) {
	const data = new FormData(form);
	const firstName = String(data.get('firstName') || '').trim();
	const lastName = String(data.get('lastName') || '').trim();
	const name = String(data.get('name') || '').trim();
	const phone = String(data.get('phone') || '').trim();
	const email = String(data.get('email') || '').trim();
	const message = String(data.get('message') || '').trim();

	if (firstName) {
		return {
			first_name: firstName,
			last_name: lastName,
			phone,
			email,
			message,
		};
	}

	if (name) {
		const split = splitName(name);
		return {
			first_name: split.first_name,
			last_name: split.last_name,
			phone,
			email,
			message,
		};
	}

	return { first_name: '', last_name: lastName, phone, email, message };
}

function ensureStatusElement(form) {
	let status = form.querySelector('[data-lead-form-status]');
	if (!status) {
		status = document.createElement('p');
		status.dataset.leadFormStatus = 'true';
		status.className = 'text-sm mt-4 hidden';
		form.appendChild(status);
	}
	return status;
}

function showStatus(status, message, type, form) {
	status.textContent = message;
	status.classList.remove(
		'hidden',
		'text-green-600',
		'text-red-500',
		'text-green-400',
		'text-red-400',
	);
	const isDark = form?.dataset.leadFormTheme === 'dark';
	if (type === 'success') {
		status.classList.add(isDark ? 'text-green-400' : 'text-green-600');
	} else {
		status.classList.add(isDark ? 'text-red-400' : 'text-red-500');
	}
}

function initLeadForms() {
	document.querySelectorAll('[data-lead-form]').forEach((form) => {
		form.addEventListener('submit', async (event) => {
			event.preventDefault();

			const submitButton = form.querySelector('[type="submit"]');
			const status = ensureStatusElement(form);
			const payload = getFormPayload(form);

			if (!payload.first_name || !payload.phone || !payload.email) {
				showStatus(status, 'Please complete all required fields.', 'error', form);
				return;
			}

			const originalLabel = submitButton?.innerHTML;
			if (submitButton) {
				submitButton.disabled = true;
				submitButton.setAttribute('aria-busy', 'true');
			}

			showStatus(status, 'Submitting…', 'success', form);

			try {
				const response = await fetch('/api/lead', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});

				const result = await response.json().catch(() => ({}));

				if (!response.ok) {
					showStatus(
						status,
						result.error || 'Something went wrong. Please call (404) 719-9561.',
						'error',
						form,
					);
					return;
				}

				try {
					window.rayAnalytics?.capture('lead_form_submitted', {
						form_location: form.dataset.leadFormTheme === 'dark' ? 'hero' : 'contact',
					});
				} catch { /* Analytics must not affect the form. */ }

				form.reset();
				showStatus(
					status,
					'Thank you — we received your request and will contact you shortly.',
					'success',
					form,
				);
			} catch {
				showStatus(
					status,
					'Unable to submit right now. Please call (404) 719-9561.',
					'error',
					form,
				);
			} finally {
				if (submitButton) {
					submitButton.disabled = false;
					submitButton.removeAttribute('aria-busy');
					if (originalLabel) submitButton.innerHTML = originalLabel;
				}
			}
		});
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initLeadForms);
} else {
	initLeadForms();
}
