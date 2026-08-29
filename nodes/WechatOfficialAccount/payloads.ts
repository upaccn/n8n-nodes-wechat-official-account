import type { IDataObject } from 'n8n-workflow';

export interface ArticleFields {
	article_type?: 'news';
	title: string;
	author?: string;
	digest?: string;
	content: string;
	content_source_url?: string;
	thumb_media_id: string;
	show_cover_pic?: boolean | number;
	need_open_comment?: boolean | number;
	only_fans_can_comment?: boolean | number;
	pic_crop_235_1?: string;
	pic_crop_1_1?: string;
}

function optionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeArticle(input: ArticleFields): IDataObject {
	const article: IDataObject = {
		article_type: 'news',
		title: input.title,
		content: input.content,
		thumb_media_id: input.thumb_media_id,
		show_cover_pic: input.show_cover_pic === true || input.show_cover_pic === 1 ? 1 : 0,
		need_open_comment: input.need_open_comment === true || input.need_open_comment === 1 ? 1 : 0,
		only_fans_can_comment:
			input.only_fans_can_comment === true || input.only_fans_can_comment === 1 ? 1 : 0,
	};

	const author = optionalString(input.author);
	const digest = optionalString(input.digest);
	const sourceUrl = optionalString(input.content_source_url);
	const crop235 = optionalString(input.pic_crop_235_1);
	const crop11 = optionalString(input.pic_crop_1_1);
	if (author) article.author = author;
	if (digest) article.digest = digest;
	if (sourceUrl) article.content_source_url = sourceUrl;
	if (crop235) article.pic_crop_235_1 = crop235;
	if (crop11) article.pic_crop_1_1 = crop11;

	return article;
}

export function normalizeArticleCollection(value: unknown): IDataObject[] {
	if (!value || typeof value !== 'object') return [];
	const collection = value as { article?: ArticleFields[] };
	return Array.isArray(collection.article) ? collection.article.map(normalizeArticle) : [];
}

