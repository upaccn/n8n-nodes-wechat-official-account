import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { WechatApiEnvelope } from './types';

const ERROR_HINTS = new Map<number, string>([
	[
		40164,
		'The calling server IP is not in the WeChat Official Account API whitelist. Add the production egress IP in the WeChat developer settings.',
	],
	[
		45009,
		'The API call quota has been exceeded. Check the account API quota before retrying or clearing quota.',
	],
	[
		45011,
		'The API is being called too frequently. Reduce concurrency or retry later instead of replaying writes immediately.',
	],
	[
		48001,
		'This API is not authorized for the account. Check the account type, verification status, and the interface permissions shown in the WeChat Official Account backend.',
	],
]);

export function getWechatErrorHint(code: number | undefined): string | undefined {
	return code === undefined ? undefined : ERROR_HINTS.get(code);
}

export function redactSensitiveText(value: string): string {
	return value
		.replace(/([?&]access_token=)[^&\s]+/gi, '$1[REDACTED]')
		.replace(/("?(?:appsecret|app_secret|secret|access_token|token)"?\s*[:=]\s*["']?)[^"'&\s,}]+/gi, '$1[REDACTED]');
}

export function createWechatApiError(
	node: INode,
	operation: string,
	response: WechatApiEnvelope,
): NodeOperationError {
	const code = response.errcode;
	const message = redactSensitiveText(response.errmsg ?? 'Unknown WeChat API error');
	const hint = getWechatErrorHint(code);
	const description = [`Operation: ${operation}`, hint].filter(Boolean).join('. ');
	return new NodeOperationError(
		node,
		`WeChat API error${code !== undefined ? ` ${code}` : ''}: ${message}`,
		{ description },
	);
}

export function createWechatTransportError(node: INode, operation: string): NodeOperationError {
	return new NodeOperationError(
		node,
		`Network request failed while calling WeChat for ${operation}; the node did not retry the request`,
	);
}
