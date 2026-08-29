export const WECHAT_API_BASE_URL = 'https://api.weixin.qq.com';

export interface WechatCredentials {
	appId: string;
	appSecret: string;
}

export interface WechatApiEnvelope {
	errcode?: number;
	errmsg?: string;
	[key: string]: unknown;
}

export interface StableTokenResponse extends WechatApiEnvelope {
	access_token?: string;
	expires_in?: number;
}

export interface JsonRequestOptions {
	path: string;
	body?: Record<string, unknown>;
	qs?: Record<string, string | number | boolean>;
	operation: string;
}
