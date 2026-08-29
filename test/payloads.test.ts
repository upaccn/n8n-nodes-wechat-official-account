import { describe, expect, it } from 'vitest';

import { normalizeArticle, normalizeArticleCollection } from '../nodes/WechatOfficialAccount/payloads';


describe('article payloads', () => {
	it('maps legacy-compatible article fields to the WeChat payload', () => {
		expect(
			normalizeArticle({
				title: 'Title',
				author: 'Author',
				digest: 'Digest',
				content: '<p>Hello</p>',
				content_source_url: 'https://example.com/source',
				thumb_media_id: 'media-1',
				show_cover_pic: true,
			}),
		).toEqual({
			article_type: 'news',
			title: 'Title',
			author: 'Author',
			digest: 'Digest',
			content: '<p>Hello</p>',
			content_source_url: 'https://example.com/source',
			thumb_media_id: 'media-1',
			show_cover_pic: 1,
			need_open_comment: 0,
			only_fans_can_comment: 0,
		});
	});

	it('passes through optional cover crop coordinates', () => {
		const article = normalizeArticle({
			title: 'Title',
			content: '<p>Hello</p>',
			thumb_media_id: 'media-1',
			pic_crop_235_1: '0_0_1_0.425532',
			pic_crop_1_1: '0_0_1_1',
		});
		expect(article.pic_crop_235_1).toBe('0_0_1_0.425532');
		expect(article.pic_crop_1_1).toBe('0_0_1_1');
	});

	it('supports multi-article fixed collections', () => {
		const articles = normalizeArticleCollection({
			article: [
				{ title: 'One', content: '1', thumb_media_id: 'a', show_cover_pic: false },
				{ title: 'Two', content: '2', thumb_media_id: 'b', show_cover_pic: true },
			],
		});
		expect(articles).toHaveLength(2);
		expect(articles[1].article_type).toBe('news');
		expect(articles[1].show_cover_pic).toBe(1);
	});
});
