import { createHash } from 'node:crypto';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { redactSensitiveText } from './WechatError';
import type { StableTokenResponse, WechatCredentials } from './types';
import { WECHAT_API_BASE_URL } from './types';

interface CachedToken {
	token: string;
	expiresAt: number;
}

const recoveredTokenCache = new Map<string, CachedToken>();
const inFlightRecovery = new Map<string, Promise<string>>();
const lastForcedRefreshAt = new Map<string, number>();
const DEFAULT_TTL_SECONDS = 7200;
const REFRESH_MARGIN_SECONDS = 300;
const FORCE_REFRESH_COOLDOWN_MS = 30_000;

function cacheKey(credentials: WechatCredentials): string {
	return createHash('sha256')
		.update(`${credentials.appId}\0${credentials.appSecret}`)
		.digest('hex');
}

export function clearTokenCache(): void {
	recoveredTokenCache.clear();
	inFlightRecovery.clear();
	lastForcedRefreshAt.clear();
}

async function recoverStableAccessToken(
	context: IExecuteFunctions,
	credentials: WechatCredentials,
	key: string,
	forceRefresh: boolean,
): Promise<string> {
	let response: StableTokenResponse;
	try {
		response = (await context.helpers.httpRequest({
			method: 'POST',
			url: `${WECHAT_API_BASE_URL}/cgi-bin/stable_token`,
			body: {
				grant_type: 'client_credential',
				appid: credentials.appId,
				secret: credentials.appSecret,
				force_refresh: forceRefresh,
			},
			json: true,
		})) as StableTokenResponse;
	} catch {
		throw new NodeOperationError(context.getNode(), 'Could not refresh the WeChat stable access token');
	}

	if (!response.access_token) {
		const code = response.errcode !== undefined ? ` ${response.errcode}` : '';
		const message = redactSensitiveText(response.errmsg ?? 'No access token returned');
		throw new NodeOperationError(
			context.getNode(),
			`WeChat authentication failed${code}: ${message}`,
		);
	}

	const ttl = Math.max(60, (response.expires_in ?? DEFAULT_TTL_SECONDS) - REFRESH_MARGIN_SECONDS);
	recoveredTokenCache.set(key, {
		token: response.access_token,
		expiresAt: Date.now() + ttl * 1000,
	});
	if (forceRefresh) lastForcedRefreshAt.set(key, Date.now());

	return response.access_token;
}

export async function getStableAccessToken(
	context: IExecuteFunctions,
	credentials: WechatCredentials,
	forceRefresh = false,
): Promise<string> {
	const key = cacheKey(credentials);
	const now = Date.now();
	const recovered = recoveredTokenCache.get(key);

	if (!forceRefresh) {
		if (recovered && recovered.expiresAt > now) return recovered.token;
		if (credentials.accessToken) return credentials.accessToken;
		throw new NodeOperationError(context.getNode(), 'WeChat credential did not provide an access token');
	}

	const inFlight = inFlightRecovery.get(key);
	if (inFlight) return await inFlight;

	const lastForced = lastForcedRefreshAt.get(key) ?? 0;
	const effectiveForceRefresh = now - lastForced >= FORCE_REFRESH_COOLDOWN_MS;
	const request = recoverStableAccessToken(context, credentials, key, effectiveForceRefresh).finally(() => {
		inFlightRecovery.delete(key);
	});
	inFlightRecovery.set(key, request);
	return await request;
}
