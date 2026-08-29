import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { WechatOfficialAccount } from './WechatOfficialAccount.node';

const implementation = new WechatOfficialAccount();

// This node intentionally isn't exposed as an AI tool. Use a controlled workflow as the tool boundary.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class WechatOfficialAccountPlatform implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeChat Official Account',
		name: 'wechatOfficialAccountPlatform',
		icon: {
			light: 'file:../../icons/wechat-official-account.svg',
			dark: 'file:../../icons/wechat-official-account.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage WeChat Official Account media, drafts, and publishing',
		defaults: { name: 'WeChat Official Account' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'wechatOfficialAccountPlatformApi', required: true }],
		properties: implementation.description.properties,
	};

	execute = implementation.execute;
}
