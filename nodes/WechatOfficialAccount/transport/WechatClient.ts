import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

import { getStableAccessToken } from './TokenManager';
import {
	createWechatApiError,
	createWechatTransportError,
	isWechatTokenError,
} from './WechatError';
import type {
	JsonRequestOptions,
	WechatApiEnvelope,
	WechatCredentials,
} from './types';
import { WECHAT_API_BASE_URL } from './types';

const READ_RETRY_DELAYS_MS = [300, 800];
const TRANSIENT_ERROR_CODES = new Set([
	'ECONNRESET',
	'ETIMEDOUT',
	'ECONNREFUSED',
	'EAI_AGAIN',
	'ENOTFOUND',
	'EPIPE',
	'UND_ERR_CONNECT_TIMEOUT',
]);

function normalizeResponse(response: unknown): WechatApiEnvelope {
	if (typeof response === 'string') {
		try {
			return JSON.parse(response) as WechatApiEnvelope;
		} catch {
			return { raw: response };
		}
	}
	if (response && typeof response === 'object') return response as WechatApiEnvelope;
	return { value: response };
}

export function isTransientTransportError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const candidate = error as {
		code?: unknown;
		statusCode?: unknown;
		response?: { status?: unknown; statusCode?: unknown };
		cause?: { code?: unknown };
	};
	const status =
		typeof candidate.response?.status === 'number'
			? candidate.response.status
			: typeof candidate.response?.statusCode === 'number'
				? candidate.response.statusCode
				: typeof candidate.statusCode === 'number'
					? candidate.statusCode
					: undefined;
	if (status !== undefined) return status === 429 || status >= 500;

	const code =
		typeof candidate.code === 'string'
			? candidate.code
			: typeof candidate.cause?.code === 'string'
				? candidate.cause.code
				: undefined;
	return code !== undefined && TRANSIENT_ERROR_CODES.has(code);
}

export class WechatClient {
	constructor(
		private readonly context: IExecuteFunctions,
		private readonly credentials: WechatCredentials,
	) {}

	async requestJson(options: JsonRequestOptions): Promise<WechatApiEnvelope> {
		return await this.requestWithTokenRecovery(options, async (token) => {
			const request: IHttpRequestOptions = {
				method: 'POST',
				url: `${WECHAT_API_BASE_URL}${options.path}`,
				qs: {
					...options.qs,
					access_token: token,
				},
				json: true,
			};
			if (options.body !== undefined) request.body = options.body;
			return await this.requestTransport(request, options.operation, options.safeToRetry ?? false);
		});
	}

	async uploadMedia(options: {
		path: string;
		operation: string;
		buffer: Buffer;
		fileName: string;
		mimeType: string;
		qs?: Record<string, string | number | boolean>;
	}): Promise<WechatApiEnvelope> {
		const boundary = `----n8nWechat${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
		const prefix = Buffer.from(
			`--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${options.fileName.replace(/["\r\n]/g, '_')}"\r\nContent-Type: ${options.mimeType}\r\n\r\n`,
			'utf8',
		);
		const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
		const body = Buffer.concat([prefix, options.buffer, suffix]);

		return await this.requestWithTokenRecovery(
			{
				path: options.path,
				operation: options.operation,
				safeToRetry: false,
			},
			async (token) => {
				const request: IHttpRequestOptions = {
					method: 'POST',
					url: `${WECHAT_API_BASE_URL}${options.path}`,
					qs: {
						...options.qs,
						access_token: token,
					},
					headers: {
						'Content-Type': `multipart/form-data; boundary=${boundary}`,
						'Content-Length': String(body.length),
					},
					body,
					json: true,
				};
				return await this.requestTransport(request, options.operation, false);
			},
		);
	}

	private async requestWithTokenRecovery(
		options: JsonRequestOptions,
		request: (token: string) => Promise<WechatApiEnvelope>,
	): Promise<WechatApiEnvelope> {
		let token = await getStableAccessToken(this.context, this.credentials, false);
		let response = await request(token);

		if (response.errcode !== undefined && isWechatTokenError(response.errcode)) {
			token = await getStableAccessToken(this.context, this.credentials, true);
			response = await request(token);
		}

		if (response.errcode !== undefined && response.errcode !== 0) {
			throw createWechatApiError(this.context.getNode(), options.operation, response);
		}
		return response;
	}

	private async requestTransport(
		request: IHttpRequestOptions,
		operation: string,
		safeToRetry: boolean,
	): Promise<WechatApiEnvelope> {
		const attempts = safeToRetry ? READ_RETRY_DELAYS_MS.length + 1 : 1;
		for (let attempt = 0; attempt < attempts; attempt++) {
			try {
				return normalizeResponse(await this.context.helpers.httpRequest(request));
			} catch (error) {
				const transient = isTransientTransportError(error);
				if (!safeToRetry || !transient || attempt === attempts - 1) {
					throw createWechatTransportError(
						this.context.getNode(),
						operation,
						safeToRetry,
						transient,
					);
				}
				await sleep(READ_RETRY_DELAYS_MS[attempt]);
			}
		}
		throw createWechatTransportError(this.context.getNode(), operation, safeToRetry, true);
	}
}
