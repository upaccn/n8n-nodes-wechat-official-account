import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createWechatApiError, createWechatTransportError } from './WechatError';
import type {
	JsonRequestOptions,
	StableTokenResponse,
	WechatApiEnvelope,
	WechatCredentials,
} from './types';
import { WECHAT_API_BASE_URL } from './types';

export class WechatClient {
	private accessToken?: string;

	constructor(
		private readonly context: IExecuteFunctions,
		private readonly credentials: WechatCredentials,
	) {}

	async requestJson(options: JsonRequestOptions): Promise<WechatApiEnvelope> {
		const token = await this.getAccessToken();
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

		const response = await this.request(request, options.operation);
		if (response.errcode !== undefined && response.errcode !== 0) {
			throw createWechatApiError(this.context.getNode(), options.operation, response);
		}
		return response;
	}

	async uploadMedia(options: {
		path: string;
		operation: string;
		buffer: Buffer;
		fileName: string;
		mimeType: string;
		qs?: Record<string, string | number | boolean>;
	}): Promise<WechatApiEnvelope> {
		const token = await this.getAccessToken();
		const boundary = `----n8nWechat${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
		const prefix = Buffer.from(
			`--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${options.fileName.replace(/["\r\n]/g, '_')}"\r\nContent-Type: ${options.mimeType}\r\n\r\n`,
			'utf8',
		);
		const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
		const body = Buffer.concat([prefix, options.buffer, suffix]);
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

		const response = await this.request(request, options.operation);
		if (response.errcode !== undefined && response.errcode !== 0) {
			throw createWechatApiError(this.context.getNode(), options.operation, response);
		}
		return response;
	}

	private async getAccessToken(): Promise<string> {
		if (this.accessToken) return this.accessToken;

		const response = (await this.request(
			{
				method: 'POST',
				url: `${WECHAT_API_BASE_URL}/cgi-bin/stable_token`,
				body: {
					grant_type: 'client_credential',
					appid: this.credentials.appId,
					secret: this.credentials.appSecret,
					force_refresh: false,
				},
				json: true,
			},
			'auth.stableToken',
		)) as StableTokenResponse;

		if (response.errcode !== undefined && response.errcode !== 0) {
			throw createWechatApiError(this.context.getNode(), 'auth.stableToken', response);
		}
		if (!response.access_token) {
			throw new NodeOperationError(
				this.context.getNode(),
				'WeChat stable token response did not contain an access token',
			);
		}

		this.accessToken = response.access_token;
		return this.accessToken;
	}

	private async request(
		request: IHttpRequestOptions,
		operation: string,
	): Promise<WechatApiEnvelope> {
		let response: unknown;
		try {
			response = await this.context.helpers.httpRequest(request);
		} catch {
			throw createWechatTransportError(this.context.getNode(), operation);
		}
		if (!response || typeof response !== 'object') {
			throw new NodeOperationError(this.context.getNode(), `WeChat returned a non-JSON response for ${operation}`);
		}
		return response as WechatApiEnvelope;
	}
}
