import type { Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

const API_BASE_URL = 'https://api.weixin.qq.com';

export class WechatOfficialAccountPlatformApi implements ICredentialType {
	name = 'wechatOfficialAccountPlatformApi';

	displayName = 'WeChat Official Account API';

	icon: Icon = {
		light: 'file:../icons/wechat-official-account.svg',
		dark: 'file:../icons/wechat-official-account.dark.svg',
	};

	documentationUrl =
		'https://developers.weixin.qq.com/doc/subscription/api/base/api_getstableaccesstoken.html';

	restrictToSupportedNodes = true as const;

	supportedNodes = ['wechatOfficialAccountPlatform'];

	properties: INodeProperties[] = [
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: API_BASE_URL,
			url: '/cgi-bin/stable_token',
			method: 'POST',
			body: {
				grant_type: 'client_credential',
				appid: '={{$credentials.appId}}',
				secret: '={{$credentials.appSecret}}',
				force_refresh: false,
			},
			json: true,
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: { key: 'errcode', value: 40013, message: 'Invalid App ID' },
			},
			{
				type: 'responseSuccessBody',
				properties: { key: 'errcode', value: 40125, message: 'Invalid App Secret' },
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'errcode',
					value: 40164,
					message: 'The calling server IP is not in the WeChat API whitelist',
				},
			},
		],
	};
}
