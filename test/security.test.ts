import { describe, expect, it } from 'vitest';

import { WechatOfficialAccountPlatformApi } from '../credentials/WechatOfficialAccountPlatformApi.credentials';
import {
	getWechatErrorHint,
	isWechatTokenError,
	redactSensitiveText,
} from '../nodes/WechatOfficialAccount/transport/WechatError';

describe('credential scope', () => {
	it('restricts the credential to the package node short name', () => {
		const credential = new WechatOfficialAccountPlatformApi();
		expect(credential.restrictToSupportedNodes).toBe(true);
		expect(credential.supportedNodes).toEqual(['wechatOfficialAccount']);
	});
});

describe('security helpers', () => {
	it('recognizes token failures returned in HTTP 200 bodies', () => {
		expect(isWechatTokenError(40001)).toBe(true);
		expect(isWechatTokenError(42001)).toBe(true);
		expect(isWechatTokenError(48001)).toBe(false);
	});

	it('provides actionable hints for common permission, whitelist, and quota errors', () => {
		expect(getWechatErrorHint(40164)).toMatch(/whitelist/i);
		expect(getWechatErrorHint(48001)).toMatch(/not authorized/i);
		expect(getWechatErrorHint(45009)).toMatch(/quota/i);
		expect(getWechatErrorHint(45011)).toMatch(/frequently/i);
		expect(getWechatErrorHint(40003)).toBeUndefined();
	});

	it('redacts access tokens and secrets from text', () => {
		const text = 'https://api.weixin.qq.com/cgi-bin/test?access_token=abc123&x=1 secret=verysecret';
		const redacted = redactSensitiveText(text);
		expect(redacted).not.toContain('abc123');
		expect(redacted).not.toContain('verysecret');
		expect(redacted).toContain('[REDACTED]');
	});
});
