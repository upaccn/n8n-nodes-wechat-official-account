import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { WechatClient } from '../nodes/WechatOfficialAccount/transport/WechatClient';

const testNode: INode = {
	id: 'test',
	name: 'Test',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function makeContext(httpRequest: ReturnType<typeof vi.fn>): IExecuteFunctions {
	return {
		helpers: { httpRequest },
		getNode: () => testNode,
	} as unknown as IExecuteFunctions;
}

const credentials = {
	appId: 'wx-test',
	appSecret: 'secret-test',
};

describe('stable token lifecycle', () => {
	it('gets the current stable token once per client and reuses it', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce({ access_token: 'token-a', expires_in: 7200 })
			.mockResolvedValueOnce({ total_count: 1 })
			.mockResolvedValueOnce({ total_count: 2 });
		const client = new WechatClient(makeContext(httpRequest), credentials);

		await client.requestJson({
			path: '/cgi-bin/draft/batchget',
			operation: 'draft.getMany',
			body: { offset: 0, count: 20 },
		});
		await client.requestJson({
			path: '/cgi-bin/freepublish/batchget',
			operation: 'publish.getMany',
			body: { offset: 0, count: 20 },
		});

		expect(httpRequest).toHaveBeenCalledTimes(3);
		expect(httpRequest.mock.calls[0][0].url).toMatch(/\/cgi-bin\/stable_token$/);
		expect(httpRequest.mock.calls[0][0].body.force_refresh).toBe(false);
		expect(httpRequest.mock.calls[1][0].qs.access_token).toBe('token-a');
		expect(httpRequest.mock.calls[2][0].qs.access_token).toBe('token-a');
	});

	it('surfaces a stable-token API error without retrying', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ errcode: 40125, errmsg: 'invalid appsecret' });
		const client = new WechatClient(makeContext(httpRequest), credentials);

		await expect(
			client.requestJson({
				path: '/cgi-bin/draft/batchget',
				operation: 'draft.getMany',
				body: { offset: 0, count: 20 },
			}),
		).rejects.toThrow('40125');
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});

describe('request policy', () => {
	it('does not recover or replay after a WeChat token error', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce({ access_token: 'token-a', expires_in: 7200 })
			.mockResolvedValueOnce({ errcode: 40001, errmsg: 'invalid credential' });
		const client = new WechatClient(makeContext(httpRequest), credentials);

		await expect(
			client.requestJson({
				path: '/cgi-bin/draft/add',
				operation: 'draft.create',
				body: { articles: [] },
			}),
		).rejects.toThrow('40001');
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('does not retry a transport failure', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce({ access_token: 'token-a', expires_in: 7200 })
			.mockRejectedValueOnce(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }));
		const client = new WechatClient(makeContext(httpRequest), credentials);

		await expect(
			client.requestJson({
				path: '/cgi-bin/draft/add',
				operation: 'draft.create',
				body: { articles: [] },
			}),
		).rejects.toThrow('did not retry');
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});
});
