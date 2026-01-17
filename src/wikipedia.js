/**
 * Wikipedia API Client
 * Fetches facts and summaries from Wikipedia (no auth required)
 */

class WikipediaClient {
  constructor(options = {}) {
    this.baseUrl = 'https://en.wikipedia.org/api/rest_v1';
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 1000 * 60 * 60; // 1 hour default
  }

  /**
   * Get a summary/fact about a topic from Wikipedia
   * @param {string} topic - The Wikipedia article title (use underscores for spaces)
   * @returns {Promise<object>} - Summary data with extract, title, description
   */
  async getSummary(topic) {
    const normalizedTopic = this.normalizeTopic(topic);

    // Check cache first
    const cached = this.getFromCache(normalizedTopic);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/page/summary/${encodeURIComponent(normalizedTopic)}`;
      const response = await this.fetch(url);

      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = await response.json();

      const result = {
        title: data.title,
        description: data.description || '',
        extract: data.extract || '',
        extractShort: data.extract_html ? this.stripHtml(data.extract).slice(0, 200) : '',
        thumbnail: data.thumbnail?.source || null,
        url: data.content_urls?.desktop?.page || null,
        timestamp: data.timestamp || new Date().toISOString()
      };

      // Cache the result
      this.setCache(normalizedTopic, result);

      return result;
    } catch (error) {
      console.error(`Wikipedia fetch error for "${topic}":`, error.message);
      return {
        title: topic,
        description: '',
        extract: `Unable to fetch information about ${topic}`,
        extractShort: '',
        thumbnail: null,
        url: null,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  /**
   * Get a specific fact/extract from Wikipedia
   * @param {string} topic - The topic to look up
   * @returns {Promise<string>} - The fact/extract text
   */
  async getFact(topic) {
    const summary = await this.getSummary(topic);
    return summary.extract || `Information about ${topic} not available`;
  }

  /**
   * Get a short description of a topic
   * @param {string} topic - The topic to look up
   * @returns {Promise<string>} - Short description
   */
  async getDescription(topic) {
    const summary = await this.getSummary(topic);
    return summary.description || summary.extractShort || topic;
  }

  /**
   * Search Wikipedia for articles matching a query
   * @param {string} query - Search query
   * @param {number} limit - Max results (default 5)
   * @returns {Promise<Array>} - Array of search results
   */
  async search(query, limit = 5) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&format=json&origin=*`;
      const response = await this.fetch(url);

      if (!response.ok) {
        throw new Error(`Wikipedia search error: ${response.status}`);
      }

      const data = await response.json();
      // OpenSearch returns [query, titles, descriptions, urls]
      const titles = data[1] || [];
      const descriptions = data[2] || [];
      const urls = data[3] || [];

      return titles.map((title, i) => ({
        title,
        description: descriptions[i] || '',
        url: urls[i] || ''
      }));
    } catch (error) {
      console.error(`Wikipedia search error for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Normalize topic string for Wikipedia API
   */
  normalizeTopic(topic) {
    return topic
      .trim()
      .replace(/\s+/g, '_')  // Spaces to underscores
      .replace(/^_+|_+$/g, ''); // Trim underscores
  }

  /**
   * Strip HTML tags from text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Get from cache if not expired
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set cache item
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Fetch wrapper - works in both Node.js and browser
   */
  async fetch(url) {
    // Use global fetch (available in Node 18+ and browsers)
    if (typeof fetch !== 'undefined') {
      return fetch(url, {
        headers: {
          'User-Agent': 'DocuFresh-AI/0.1.0 (https://github.com/manthenavamsi/docufresh-ai)',
          'Accept': 'application/json'
        }
      });
    }

    // Fallback for older Node.js (shouldn't be needed with Node 18+)
    throw new Error('fetch is not available. Please use Node.js 18+ or a browser environment.');
  }
}

export { WikipediaClient };
export default WikipediaClient;
