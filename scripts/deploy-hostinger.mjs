#!/usr/bin/env node
/**
 * Deploy the pre-built static zip to Hostinger via the official API flow
 * (upload credentials → TUS upload → deploy trigger).
 *
 * Requires HOSTINGER_API_TOKEN in the environment.
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tus from 'tus-js-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://developers.hostinger.com/';
const DOMAIN = process.env.HOSTINGER_DOMAIN || 'raypearsonlaw.com';
const ZIP_PATH =
	process.env.HOSTINGER_ZIP ||
	path.join(ROOT, 'ray-pearson-hostinger.zip');

function getToken() {
	const token =
		process.env.HOSTINGER_API_TOKEN || process.env.API_TOKEN || '';
	if (!token) {
		throw new Error(
			'Set HOSTINGER_API_TOKEN before running deploy-hostinger.mjs.',
		);
	}
	return token;
}

async function apiRequest(method, apiPath, data) {
	const token = getToken();
	const url = new URL(apiPath, BASE_URL).toString();
	const response = await axios({
		method,
		url,
		data,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'User-Agent': 'ray-pearson-law-deploy/1.0',
		},
		timeout: 120_000,
		validateStatus: (status) => status < 500,
	});

	if (response.status >= 400) {
		throw new Error(
			`${method.toUpperCase()} ${apiPath} failed (${response.status}): ${JSON.stringify(response.data)}`,
		);
	}

	return response.data;
}

async function resolveUsername(domain) {
	const result = await apiRequest(
		'get',
		`api/hosting/v1/websites?domain=${encodeURIComponent(domain)}`,
	);
	const website = result?.data?.[0];
	if (!website?.username) {
		throw new Error(`No Hostinger website found for ${domain}`);
	}
	return website.username;
}

async function fetchUploadCredentials(username, domain) {
	return apiRequest('post', 'api/hosting/v1/files/upload-urls', {
		username,
		domain,
	});
}

function uploadFile(filePath, relativePath, uploadUrl, authRestToken, authToken) {
	return new Promise((resolve, reject) => {
		const stats = fs.statSync(filePath);
		const fileStream = fs.createReadStream(filePath);
		const cleanUploadUrl = uploadUrl.replace(/\/$/, '');
		const uploadUrlWithFile = `${cleanUploadUrl}/${relativePath}?override=true`;
		const requestHeaders = {
			'X-Auth': authToken,
			'X-Auth-Rest': authRestToken,
			'upload-length': stats.size.toString(),
			'upload-offset': '0',
		};

		axios
			.post(uploadUrlWithFile, '', {
				headers: requestHeaders,
				timeout: 120_000,
				validateStatus: (status) => status === 201,
			})
			.then(() => {
				const upload = new tus.Upload(fileStream, {
					uploadUrl: uploadUrlWithFile,
					retryDelays: [1000, 2000, 4000, 8000, 16000, 20000],
					uploadDataDuringCreation: false,
					parallelUploads: 1,
					chunkSize: 10_485_760,
					headers: requestHeaders,
					removeFingerprintOnSuccess: true,
					uploadSize: stats.size,
					metadata: { filename: path.basename(relativePath) },
					onError: (error) =>
						reject(new Error(`Upload failed: ${error.message}`)),
					onSuccess: () =>
						resolve({ filename: relativePath, url: upload.url }),
				});
				upload.start();
			})
			.catch((error) => reject(error));
	});
}

async function triggerDeploy(username, domain, archiveBasename) {
	return apiRequest(
		'post',
		`api/hosting/v1/accounts/${username}/websites/${domain}/deploy`,
		{ archive_path: archiveBasename },
	);
}

async function main() {
	if (!fs.existsSync(ZIP_PATH)) {
		throw new Error(
			`Missing ${ZIP_PATH}. Run scripts/build-hostinger.sh first.`,
		);
	}

	const archiveBasename = path.basename(ZIP_PATH);
	console.log(`Deploying ${archiveBasename} to ${DOMAIN}...`);

	const username = await resolveUsername(DOMAIN);
	console.log(`Resolved Hostinger account: ${username}`);

	const credentials = await fetchUploadCredentials(username, DOMAIN);
	const { url: uploadUrl, auth_key: authToken, rest_auth_key: authRestToken } =
		credentials;

	if (!uploadUrl || !authToken || !authRestToken) {
		throw new Error('Invalid upload credentials from Hostinger API');
	}

	console.log('Uploading archive...');
	await uploadFile(
		ZIP_PATH,
		archiveBasename,
		uploadUrl,
		authRestToken,
		authToken,
	);
	console.log('Upload complete. Triggering deploy...');

	const deployResult = await triggerDeploy(username, DOMAIN, archiveBasename);
	console.log('Deploy triggered successfully.');
	console.log(JSON.stringify(deployResult, null, 2));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
