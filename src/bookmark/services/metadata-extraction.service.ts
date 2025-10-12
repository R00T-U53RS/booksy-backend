import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { CacheService } from './cache.service';

export interface WebsiteMetadata {
  title?: string;
  description?: string;
  thumbnail?: string;
  favicon?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  [key: string]: unknown;
}

@Injectable()
export class MetadataExtractionService {
  private readonly logger = new Logger(MetadataExtractionService.name);

  constructor(private readonly cacheService: CacheService) {}

  async extractMetadata(url: string): Promise<WebsiteMetadata> {
    try {
      this.logger.log(`Extracting metadata for URL: ${url}`);

      // Check cache first
      const cacheKey = `metadata:${url}`;
      const cachedMetadata = this.cacheService.get<WebsiteMetadata>(cacheKey);

      if (cachedMetadata) {
        this.logger.log(`Using cached metadata for URL: ${url}`);
        return cachedMetadata;
      }

      const response = await this.fetchPageContent(url);
      const $ = cheerio.load(response.data as string);
      const metadata = this.parseMetadataFromHtml($, url);

      this.logger.log(`Successfully extracted metadata for ${url}`);

      // Cache the metadata for 24 hours
      const CACHE_TTL_24_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      this.cacheService.set(cacheKey, metadata, CACHE_TTL_24_HOURS);

      return metadata;
    } catch (error) {
      this.logger.error(
        `Failed to extract metadata for ${url}:`,
        error instanceof Error ? error.message : String(error),
      );

      return this.createFallbackMetadata(url);
    }
  }

  private fetchPageContent(url: string) {
    return axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BooksyBot/1.0; +https://booksy.com/bot)',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
      },
      maxRedirects: 5,
    });
  }

  private parseMetadataFromHtml($: cheerio.Root, url: string): WebsiteMetadata {
    const metadata: WebsiteMetadata = {};

    this.extractBasicMetadata($, metadata);
    this.extractSocialMetadata($, metadata);
    this.extractTimeMetadata($, metadata);
    this.extractFaviconAndTags($, url, metadata);
    this.applyMetadataFallbacks($, metadata);

    return metadata;
  }

  private extractBasicMetadata(
    $: cheerio.Root,
    metadata: WebsiteMetadata,
  ): void {
    metadata.title = this.extractMetaContent($, [
      'og:title',
      'twitter:title',
      'title',
    ]);

    metadata.description = this.extractMetaContent($, [
      'og:description',
      'twitter:description',
      'description',
    ]);
  }

  private extractSocialMetadata(
    $: cheerio.Root,
    metadata: WebsiteMetadata,
  ): void {
    metadata.thumbnail = this.extractMetaContent($, [
      'og:image',
      'twitter:image',
      'twitter:image:src',
    ]);

    metadata.siteName = this.extractMetaContent($, [
      'og:site_name',
      'twitter:site',
    ]);

    metadata.author = this.extractMetaContent($, [
      'og:author',
      'twitter:creator',
      'author',
    ]);
  }

  private extractTimeMetadata(
    $: cheerio.Root,
    metadata: WebsiteMetadata,
  ): void {
    metadata.publishedTime = this.extractMetaContent($, [
      'og:published_time',
      'article:published_time',
    ]);

    metadata.modifiedTime = this.extractMetaContent($, [
      'og:modified_time',
      'article:modified_time',
    ]);
  }

  private extractFaviconAndTags(
    $: cheerio.Root,
    url: string,
    metadata: WebsiteMetadata,
  ): void {
    // Extract favicon
    metadata.favicon = this.extractFavicon($, url);

    // Extract tags/keywords
    const keywords = this.extractMetaContent($, ['keywords']);
    if (keywords) {
      metadata.tags = keywords
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
  }

  private applyMetadataFallbacks(
    $: cheerio.Root,
    metadata: WebsiteMetadata,
  ): void {
    // If no title found, use the page title
    metadata.title ??= $('title').text().trim();

    // If no description found, try to extract from content
    metadata.description ??= this.extractDescriptionFromContent($);
  }

  private createFallbackMetadata(url: string): WebsiteMetadata {
    return {
      title: this.extractDomainFromUrl(url),
      description: `Link to ${this.extractDomainFromUrl(url)}`,
      favicon: this.generateFaviconUrl(url),
    };
  }

  private extractMetaContent(
    $: cheerio.Root,
    selectors: string[],
  ): string | undefined {
    for (const selector of selectors) {
      const content = $(
        `meta[property="${selector}"], meta[name="${selector}"]`,
      ).attr('content');
      if (content?.trim()) {
        return content.trim();
      }
    }
    return undefined;
  }

  private extractFavicon($: cheerio.Root, baseUrl: string): string | undefined {
    // Try different favicon selectors
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];

    for (const selector of faviconSelectors) {
      const href = $(selector).attr('href');
      if (href) {
        return this.resolveUrl(href, baseUrl);
      }
    }

    // Fallback to default favicon location
    return this.generateFaviconUrl(baseUrl);
  }

  private extractDescriptionFromContent($: cheerio.Root): string | undefined {
    // Try to extract description from paragraph content
    const MAX_PARAGRAPHS = 3;
    const MIN_TEXT_LENGTH = 20;
    const MAX_TEXT_LENGTH = 300;
    const MAX_DESCRIPTION_LENGTH = 300;

    const paragraphs = $('p').slice(0, MAX_PARAGRAPHS);
    let description = '';

    paragraphs.each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > MIN_TEXT_LENGTH && text.length < MAX_TEXT_LENGTH) {
        description += `${text} `;
      }
    });

    return description.trim().substring(0, MAX_DESCRIPTION_LENGTH) || undefined;
  }

  private extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  private generateFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch {
      return '';
    }
  }

  private resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  async extractFaviconOnly(url: string): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `favicon:${url}`;
      const cachedFavicon = this.cacheService.get<string>(cacheKey);

      if (cachedFavicon) {
        this.logger.log(`Using cached favicon for URL: ${url}`);
        return cachedFavicon;
      }

      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; BooksyBot/1.0; +https://booksy.com/bot)',
        },
      });

      const $ = cheerio.load(response.data as string);
      const favicon =
        this.extractFavicon($, url) ?? this.generateFaviconUrl(url);

      // Cache the favicon for 7 days
      const CACHE_TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      this.cacheService.set(cacheKey, favicon, CACHE_TTL_7_DAYS);

      return favicon;
    } catch (error) {
      this.logger.warn(
        `Failed to extract favicon for ${url}:`,
        error instanceof Error ? error.message : String(error),
      );
      return this.generateFaviconUrl(url);
    }
  }
}
