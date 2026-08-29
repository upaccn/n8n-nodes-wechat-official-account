import { describe, expect, it } from 'vitest';

import { WechatOfficialAccountPlatformApi } from '../credentials/WechatOfficialAccountPlatformApi.credentials';
import { WechatOfficialAccountPlatform } from '../nodes/WechatOfficialAccount/WechatOfficialAccountPlatform.node';
import { getWechatErrorHint, redactSensitiveText } from '../nodes/WechatOfficialAccount/transport/WechatError';

describe('node and credential identity', () => {
	it('uses the persisted unique node identity', () => {
		const node = new WechatOfficialAccountPlatform();
		expect(node.description.name).toBe('wechatOfficialAccountPlatform');
		expect(node.description.displayName).toBe('WeChat Official Account');
	});

	it('stores only App ID and App Secret in the credential', () => {
		const credential = new WechatOfficialAccountPlatformApi();
		expect(credential.restrictToSupportedNodes).toBe(true);
		expect(credential.supportedNodes).toEqual(['wechatOfficialAccountPlatform']);
		expect(credential.properties.map((property) => property.name)).toEqual(['appId', 'appSecret']);
		expect(credential.test.request.url).toBe('/cgi-bin/stable_token');
	});
});

describe('security helpers', () => {
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
