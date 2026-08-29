import type {
	ICredentialDataDecryptedObject,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

const API_BASE_URL = 'https://api.weixin.qq.com';

interface StableTokenResponse {
	access_token?: string;
	expires_in?: number;
	errcode?: number;
	errmsg?: string;
}

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

	supportedNodes = ['wechatOfficialAccount'];

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
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${API_BASE_URL}/cgi-bin/stable_token`,
			body: {
				grant_type: 'client_credential',
				appid: credentials.appId as string,
				secret: credentials.appSecret as string,
				force_refresh: false,
			},
			json: true,
		})) as StableTokenResponse;

		if (!response.access_token) {
			throw new ApplicationError(
				`WeChat authentication failed${response.errcode !== undefined ? ` (${response.errcode})` : ''}`,
			);
		}

		return { accessToken: response.access_token };
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.qs = {
			...requestOptions.qs,
			access_token: credentials.accessToken as string,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: API_BASE_URL,
			url: '/cgi-bin/get_api_domain_ip',
			method: 'GET',
		},
	};
}
