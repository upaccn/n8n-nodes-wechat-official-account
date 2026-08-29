import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { normalizeArticleCollection } from './payloads';
import { WechatClient } from './transport/WechatClient';
import type { WechatCredentials } from './transport/types';

const CREDENTIAL_TYPE = 'wechatOfficialAccountPlatformApi';

const articleFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Author',
		name: 'author',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Digest',
		name: 'digest',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		required: true,
		description: 'HTML content. Article images should first be uploaded with Media → Upload Article Image.',
	},
	{
		displayName: 'Content Source URL',
		name: 'content_source_url',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Thumb Media ID',
		name: 'thumb_media_id',
		type: 'string',
		default: '',
		required: true,
		description: 'Permanent image media_id to use as the article cover',
	},
	{
		displayName: 'Show Cover in Content',
		name: 'show_cover_pic',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Open Comments',
		name: 'need_open_comment',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Only Fans Can Comment',
		name: 'only_fans_can_comment',
		type: 'boolean',
		default: false,
		description: 'Whether only followers can comment when comments are enabled',
	},
	{
		displayName: 'Cover Crop 2.35:1',
		name: 'pic_crop_235_1',
		type: 'string',
		default: '',
		placeholder: '0_0_1_0.425532',
		description: 'Optional normalized crop coordinates X1_Y1_X2_Y2 for the wide cover',
	},
	{
		displayName: 'Cover Crop 1:1',
		name: 'pic_crop_1_1',
		type: 'string',
		default: '',
		placeholder: '0_0_1_1',
		description: 'Optional normalized crop coordinates X1_Y1_X2_Y2 for the square cover',
	},
];

const operationProperty = (
	resource: string,
	options: Array<{ name: string; value: string; description?: string; action?: string }>,
	defaultValue: string,
): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [resource] } },
	options,
	default: defaultValue,
});

const properties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Draft', value: 'draft' },
			{ name: 'Media', value: 'media' },
			{ name: 'Publish', value: 'publish' },
		],
		default: 'draft',
	},
	operationProperty(
		'media',
		[
			{
				name: 'Upload Article Image',
				value: 'uploadArticleImage',
				description: 'Upload an image used inside article HTML',
				action: 'Upload an article image',
			},
			{
				name: 'Upload Permanent Image',
				value: 'uploadPermanentImage',
				description: 'Upload a permanent image material such as a cover',
				action: 'Upload a permanent image',
			},
		],
		'uploadArticleImage',
	),
	operationProperty(
		'draft',
		[
			{ name: 'Create', value: 'create', action: 'Create a draft' },
			{ name: 'Delete', value: 'delete', action: 'Delete a draft' },
			{ name: 'Get', value: 'get', action: 'Get a draft' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many drafts' },
			{ name: 'Update', value: 'update', action: 'Update a draft article' },
		],
		'create',
	),
	operationProperty(
		'publish',
		[
			{ name: 'Delete', value: 'delete', action: 'Delete a published article' },
			{ name: 'Get', value: 'get', action: 'Get a published article' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many published articles' },
			{ name: 'Get Status', value: 'getStatus', action: 'Get a publish status' },
			{ name: 'Submit', value: 'submit', action: 'Submit a draft for publishing' },
		],
		'submit',
	),
	{
		displayName:
			'Publish API permission depends on the WeChat account type and verification status. Draft/material access does not guarantee freepublish access; error 48001 means the account is not authorized for that API.',
		name: 'publishPermissionNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['publish'] } },
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['uploadArticleImage', 'uploadPermanentImage'],
			},
		},
		description: 'Name of the input binary property containing the image',
	},
	{
		displayName: 'Articles',
		name: 'articles',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		required: true,
		displayOptions: { show: { resource: ['draft'], operation: ['create'] } },
		options: [{ displayName: 'Article', name: 'article', values: articleFields }],
	},
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: { resource: ['draft'], operation: ['get', 'delete', 'update'] },
		},
	},
	{
		displayName: 'Article Index',
		name: 'index',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['draft'], operation: ['update'] } },
	},
	{
		displayName: 'Article',
		name: 'articleFields',
		type: 'fixedCollection',
		default: {},
		required: true,
		displayOptions: { show: { resource: ['draft'], operation: ['update'] } },
		options: [{ displayName: 'Article', name: 'article', values: articleFields }],
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		displayOptions: {
			show: {
				resource: ['draft', 'publish'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 20 },
		default: 20,
		displayOptions: {
			show: {
				resource: ['draft', 'publish'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Return Content',
		name: 'returnContent',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['draft', 'publish'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Publish ID',
		name: 'publishId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['publish'], operation: ['getStatus'] } },
	},
	{
		displayName: 'Draft Media ID',
		name: 'draftMediaId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['publish'], operation: ['submit'] } },
	},
	{
		displayName: 'Article ID',
		name: 'articleId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['publish'], operation: ['get', 'delete'] } },
	},
	{
		displayName: 'Article Index',
		name: 'publishDeleteIndex',
		type: 'number',
		typeOptions: { minValue: -1 },
		default: -1,
		displayOptions: { show: { resource: ['publish'], operation: ['delete'] } },
		description: 'Set to -1 to omit the index and delete the whole published article',
	},
];

function getCredentials(
	context: IExecuteFunctions,
	raw: ICredentialDataDecryptedObject,
): WechatCredentials {
	const appId = raw.appId;
	const appSecret = raw.appSecret;
	const accessToken = raw.accessToken;
	if (typeof appId !== 'string' || !appId || typeof appSecret !== 'string' || !appSecret) {
		throw new NodeOperationError(context.getNode(), 'App ID and App Secret are required');
	}
	if (typeof accessToken !== 'string' || !accessToken) {
		throw new NodeOperationError(context.getNode(), 'WeChat credential did not provide an access token');
	}
	return { appId, appSecret, accessToken };
}

function getSingleArticle(context: IExecuteFunctions, value: unknown): IDataObject {
	const articles = normalizeArticleCollection(value);
	if (articles.length !== 1) {
		throw new NodeOperationError(context.getNode(), 'Exactly one article is required for this operation');
	}
	return articles[0];
}

async function executeOperation(
	context: IExecuteFunctions,
	client: WechatClient,
	itemIndex: number,
): Promise<IDataObject> {
	const resource = context.getNodeParameter('resource', itemIndex) as string;
	const operation = context.getNodeParameter('operation', itemIndex) as string;

	if (resource === 'media') {
		const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const binary = context.getInputData()[itemIndex].binary?.[binaryPropertyName];
		if (!binary) {
			throw new NodeOperationError(
				context.getNode(),
				`Binary property "${binaryPropertyName}" was not found`,
			);
		}
		if (!binary.mimeType.startsWith('image/')) {
			throw new NodeOperationError(context.getNode(), 'Media upload requires an image binary');
		}
		const buffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		const fileName = binary.fileName || 'image';

		if (operation === 'uploadArticleImage') {
			if (!['image/jpeg', 'image/png'].includes(binary.mimeType)) {
				throw new NodeOperationError(context.getNode(), 'Article images must be JPG or PNG');
			}
			if (buffer.length > 1024 * 1024) {
				throw new NodeOperationError(context.getNode(), 'Article images must be smaller than 1 MB');
			}
			return (await client.uploadMedia({
				path: '/cgi-bin/media/uploadimg',
				operation: 'media.uploadArticleImage',
				buffer,
				fileName,
				mimeType: binary.mimeType,
			})) as IDataObject;
		}
		if (operation === 'uploadPermanentImage') {
			if (!['image/bmp', 'image/gif', 'image/jpeg', 'image/png'].includes(binary.mimeType)) {
				throw new NodeOperationError(
					context.getNode(),
					'Permanent images must be BMP, GIF, JPG, or PNG',
				);
			}
			if (buffer.length > 10 * 1024 * 1024) {
				throw new NodeOperationError(context.getNode(), 'Permanent images must be 10 MB or smaller');
			}
			return (await client.uploadMedia({
				path: '/cgi-bin/material/add_material',
				operation: 'media.uploadPermanentImage',
				buffer,
				fileName,
				mimeType: binary.mimeType,
				qs: { type: 'image' },
			})) as IDataObject;
		}
	}

	if (resource === 'draft') {
		if (operation === 'create') {
			const articles = normalizeArticleCollection(context.getNodeParameter('articles', itemIndex));
			if (articles.length === 0) {
				throw new NodeOperationError(context.getNode(), 'At least one article is required');
			}
			return (await client.requestJson({
				path: '/cgi-bin/draft/add',
				operation: 'draft.create',
				body: { articles },
			})) as IDataObject;
		}

		if (operation === 'get') {
			const mediaId = context.getNodeParameter('mediaId', itemIndex) as string;
			return (await client.requestJson({
				path: '/cgi-bin/draft/get',
				operation: 'draft.get',
				body: { media_id: mediaId },
				safeToRetry: true,
			})) as IDataObject;
		}

		if (operation === 'getMany') {
			const offset = context.getNodeParameter('offset', itemIndex) as number;
			const count = context.getNodeParameter('count', itemIndex) as number;
			const returnContent = context.getNodeParameter('returnContent', itemIndex) as boolean;
			return (await client.requestJson({
				path: '/cgi-bin/draft/batchget',
				operation: 'draft.getMany',
				body: { offset, count, no_content: returnContent ? 0 : 1 },
				safeToRetry: true,
			})) as IDataObject;
		}

		if (operation === 'update') {
			const mediaId = context.getNodeParameter('mediaId', itemIndex) as string;
			const index = context.getNodeParameter('index', itemIndex) as number;
			const article = getSingleArticle(
				context,
				context.getNodeParameter('articleFields', itemIndex),
			);
			return (await client.requestJson({
				path: '/cgi-bin/draft/update',
				operation: 'draft.update',
				body: { media_id: mediaId, index, articles: article },
			})) as IDataObject;
		}

		if (operation === 'delete') {
			const mediaId = context.getNodeParameter('mediaId', itemIndex) as string;
			return (await client.requestJson({
				path: '/cgi-bin/draft/delete',
				operation: 'draft.delete',
				body: { media_id: mediaId },
			})) as IDataObject;
		}
	}

	if (resource === 'publish') {
		if (operation === 'submit') {
			const mediaId = context.getNodeParameter('draftMediaId', itemIndex) as string;
			return (await client.requestJson({
				path: '/cgi-bin/freepublish/submit',
				operation: 'publish.submit',
				body: { media_id: mediaId },
			})) as IDataObject;
		}

		if (operation === 'getStatus') {
			const publishId = context.getNodeParameter('publishId', itemIndex) as string;
			return (await client.requestJson({
				path: '/cgi-bin/freepublish/get',
				operation: 'publish.getStatus',
				body: { publish_id: publishId },
				safeToRetry: true,
			})) as IDataObject;
		}

		if (operation === 'get') {
			const articleId = context.getNodeParameter('articleId', itemIndex) as string;
			return (await client.requestJson({
				path: '/cgi-bin/freepublish/getarticle',
				operation: 'publish.get',
				body: { article_id: articleId },
				safeToRetry: true,
			})) as IDataObject;
		}

		if (operation === 'getMany') {
			const offset = context.getNodeParameter('offset', itemIndex) as number;
			const count = context.getNodeParameter('count', itemIndex) as number;
			const returnContent = context.getNodeParameter('returnContent', itemIndex) as boolean;
			return (await client.requestJson({
				path: '/cgi-bin/freepublish/batchget',
				operation: 'publish.getMany',
				body: { offset, count, no_content: returnContent ? 0 : 1 },
				safeToRetry: true,
			})) as IDataObject;
		}

		if (operation === 'delete') {
			const articleId = context.getNodeParameter('articleId', itemIndex) as string;
			const index = context.getNodeParameter('publishDeleteIndex', itemIndex) as number;
			const body: IDataObject = { article_id: articleId };
			if (index >= 0) body.index = index;
			return (await client.requestJson({
				path: '/cgi-bin/freepublish/delete',
				operation: 'publish.delete',
				body,
			})) as IDataObject;
		}
	}

	throw new NodeOperationError(context.getNode(), `Unsupported operation: ${resource}.${operation}`);
}

// This node intentionally isn't exposed as an AI tool. Use a controlled workflow as the tool boundary.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class WechatOfficialAccount implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeChat Official Account',
		name: 'wechatOfficialAccount',
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
		credentials: [{ name: CREDENTIAL_TYPE, required: true }],
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const input = this.getInputData();
		const rawCredentials = await this.getCredentials(CREDENTIAL_TYPE);
		const client = new WechatClient(this, getCredentials(this, rawCredentials));
		const output: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < input.length; itemIndex++) {
			try {
				const result = await executeOperation(this, client, itemIndex);
				output.push({
					json: { ...input[itemIndex].json, wechat: result },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					const nodeError =
						error instanceof NodeOperationError
							? error
							: new NodeOperationError(this.getNode(), 'Unknown WeChat Official Account error', {
								itemIndex,
							});
					output.push({
						json: {
							...input[itemIndex].json,
							wechatError: { message: nodeError.message },
						},
						error: nodeError,
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(
					this.getNode(),
					error instanceof Error ? error.message : 'Unknown WeChat Official Account error',
					{ itemIndex },
				);
			}
		}

		return [output];
	}
}
