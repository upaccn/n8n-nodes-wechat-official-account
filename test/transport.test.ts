import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearTokenCache, getStableAccessToken } from '../nodes/WechatOfficialAccount/transport/TokenManager';
import {
	isTransientTransportError,
	WechatClient,
} from '../nodes/WechatOfficialAccount/transport/WechatClient';

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
	accessToken: 'credential-token',
};

beforeEach(() => clearTokenCache());

describe('stable token manager', () => {
	it('uses the token already managed by the n8n credential', async () => {
		const httpRequest = vi.fn();
		const context = makeContext(httpRequest);

		expect(await getStableAccessToken(context, credentials)).toBe('credential-token');
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('forces a stable-token refresh only for explicit recovery', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ access_token: 'token-b', expires_in: 7200 });
		const context = makeContext(httpRequest);

		expect(await getStableAccessToken(context, credentials, true)).toBe('token-b');
		expect(httpRequest).toHaveBeenCalledTimes(1);
		expect(httpRequest.mock.calls[0][0].body.force_refresh).toBe(true);
	});

	it('does not force-refresh twice inside the 30 second recovery cooldown', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce({ access_token: 'token-b', expires_in: 7200 })
			.mockResolvedValueOnce({ access_token: 'token-c', expires_in: 7200 });
		const context = makeContext(httpRequest);

		await getStableAccessToken(context, credentials, true);
		expect(await getStableAccessToken(context, credentials, true)).toBe('token-c');
		expect(httpRequest.mock.calls[0][0].body.force_refresh).toBe(true);
		expect(httpRequest.mock.calls[1][0].body.force_refresh).toBe(false);
	});
});

describe('transport retry classification', () => {
	it('retries only network, 429, and server-side failures', () => {
		expect(isTransientTransportError({ code: 'ECONNRESET' })).toBe(true);
		expect(isTransientTransportError({ response: { status: 429 } })).toBe(true);
		expect(isTransientTransportError({ response: { status: 503 } })).toBe(true);
		expect(isTransientTransportError({ response: { status: 400 } })).toBe(false);
		expect(isTransientTransportError({ response: { status: 403 } })).toBe(false);
	});
});

describe('request safety', () => {
	it('refreshes and retries once after an explicit token error', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce({ errcode: 40001, errmsg: 'invalid credential' })
			.mockResolvedValueOnce({ access_token: 'token-b', expires_in: 7200 })
			.mockResolvedValueOnce({ errcode: 0, media_id: 'ok' });
		const context = makeContext(httpRequest);
		const client = new WechatClient(context, credentials);

		const result = await client.requestJson({
			path: '/cgi-bin/draft/add',
			operation: 'draft.create',
			body: { articles: [] },
		});

		expect(result.media_id).toBe('ok');
		expect(httpRequest).toHaveBeenCalledTimes(3);
		expect(httpRequest.mock.calls[1][0].body.force_refresh).toBe(true);
	});

	it('retries a safe read after a transient transport failure', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }))
			.mockResolvedValueOnce({ total_count: 1, item_count: 0, item: [] });
		const context = makeContext(httpRequest);
		const client = new WechatClient(context, credentials);

		const result = await client.requestJson({
			path: '/cgi-bin/draft/batchget',
			operation: 'draft.getMany',
			body: { offset: 0, count: 20, no_content: 1 },
			safeToRetry: true,
		});
		expect(result.total_count).toBe(1);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('does not retry a safe read after a non-transient HTTP failure', async () => {
		const httpRequest = vi.fn().mockRejectedValueOnce({ response: { status: 403 } });
		const context = makeContext(httpRequest);
		const client = new WechatClient(context, credentials);

		await expect(
			client.requestJson({
				path: '/cgi-bin/draft/batchget',
				operation: 'draft.getMany',
				body: { offset: 0, count: 20, no_content: 1 },
				safeToRetry: true,
			}),
		).rejects.toThrow('not classified as transient');
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});

	it('does not replay a write after an unknown transport failure', async () => {
		const httpRequest = vi.fn().mockRejectedValueOnce(new Error('socket reset'));
		const context = makeContext(httpRequest);
		const client = new WechatClient(context, credentials);

		await expect(
			client.requestJson({
				path: '/cgi-bin/draft/add',
				operation: 'draft.create',
				body: { articles: [] },
			}),
		).rejects.toThrow('request was not replayed');

		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});
