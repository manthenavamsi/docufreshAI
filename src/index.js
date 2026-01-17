/**
 * DocuFresh-AI
 * AI-powered content freshening using Wikipedia + browser-based AI
 * No API keys required!
 *
 * @version 0.1.0
 */

import { WikipediaClient } from './wikipedia.js';
import { AIEngine } from './ai-engine.js';
import { registerAIMarkers, createAIMarkers } from './markers.js';

/**
 * DocuFreshAI - Main class for AI-powered content freshening
 */
class DocuFreshAI {
  /**
   * Get list of available model keys
   * @returns {string[]} Array of model keys ('small', 'base', 'large')
   * @example
   * DocuFreshAI.getAvailableModels(); // ['small', 'base', 'large']
   */
  static getAvailableModels() {
    return AIEngine.getAvailableModels();
  }

  /**
   * Get information about a specific model
   * @param {string} modelKey - Model key ('small', 'base', 'large')
   * @returns {object|null} Model info with id, name, size, quality, description
   * @example
   * DocuFreshAI.getModelInfo('base');
   * // { id: 'Xenova/flan-t5-base', name: 'FLAN-T5 Base', size: '900MB', ... }
   */
  static getModelInfo(modelKey) {
    return AIEngine.getModelInfo(modelKey);
  }

  /**
   * Create a DocuFreshAI instance
   * @param {object} options - Configuration options
   * @param {string} options.model - Model to use: 'small' (default), 'base', 'large', or custom model ID
   * @param {number} options.cacheTTL - Wikipedia cache TTL in ms (default: 1 hour)
   * @param {function} options.onProgress - Callback for model download progress
   */
  constructor(options = {}) {
    this.options = options;
    this.wikipedia = new WikipediaClient({
      cacheTTL: options.cacheTTL
    });
    this.ai = new AIEngine({
      model: options.model,
      onProgress: options.onProgress
    });
    this.markers = null;
    this.ready = false;
    this.docufresh = null;
  }

  /**
   * Initialize the AI engine
   * This downloads and loads the AI model (may take time on first run)
   * @returns {Promise<void>}
   */
  async init() {
    if (this.ready) return;

    console.log('Initializing DocuFresh-AI...');

    // Initialize AI engine (downloads model)
    await this.ai.init();

    // Create markers
    this.markers = createAIMarkers(this.wikipedia, this.ai);

    this.ready = true;
    console.log('DocuFresh-AI ready!');
  }

  /**
   * Process text with AI markers
   * Handles async markers that fetch from Wikipedia and generate with AI
   *
   * @param {string} text - Text containing {{ai_*}} markers
   * @param {object} customData - Optional custom data for basic markers
   * @returns {Promise<string>} - Processed text
   */
  async process(text, customData = {}) {
    if (!this.ready) {
      await this.init();
    }

    let result = text;

    // Replace custom data first (simple sync replacement)
    for (const [key, value] of Object.entries(customData)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(pattern, String(value));
    }

    // Find all AI markers
    const markerPattern = /{{(ai_\w+):([^}]*)}}/g;
    const matches = [...result.matchAll(markerPattern)];

    // Process each AI marker
    for (const match of matches) {
      const fullMarker = match[0];
      const markerName = match[1];
      const paramsString = match[2];

      // Split parameters by : (but not within the params themselves)
      const params = paramsString.split(':').map(p => p.trim());

      const markerFn = this.markers[markerName];

      if (markerFn) {
        try {
          const replacement = await markerFn(...params);
          result = result.replace(fullMarker, replacement);
        } catch (error) {
          console.error(`Error processing ${markerName}:`, error.message);
          // Leave marker unchanged on error
        }
      }
    }

    // Also handle simple ai_* markers without params
    const simplePattern = /{{(ai_\w+)}}/g;
    const simpleMatches = [...result.matchAll(simplePattern)];

    for (const match of simpleMatches) {
      const fullMarker = match[0];
      const markerName = match[1];

      const markerFn = this.markers[markerName];

      if (markerFn) {
        try {
          const replacement = await markerFn();
          result = result.replace(fullMarker, replacement);
        } catch (error) {
          console.error(`Error processing ${markerName}:`, error.message);
        }
      }
    }

    return result;
  }

  /**
   * Process text and also use base docufresh markers
   * Requires docufresh to be installed
   *
   * @param {string} text - Text with both regular and AI markers
   * @param {object} customData - Custom data
   * @returns {Promise<string>} - Processed text
   */
  async processWithDocufresh(text, customData = {}) {
    // Lazy load docufresh
    if (!this.docufresh) {
      try {
        const docufreshModule = await import('docufresh');
        this.docufresh = docufreshModule.default || docufreshModule;
      } catch (error) {
        console.warn('docufresh not installed, skipping basic markers');
        return this.process(text, customData);
      }
    }

    // First process with base docufresh (sync markers)
    let result = this.docufresh.process(text, customData);

    // Then process AI markers (async)
    result = await this.process(result, {});

    return result;
  }

  /**
   * Get a fact from Wikipedia
   * Convenience method for direct access
   *
   * @param {string} topic - Wikipedia topic
   * @returns {Promise<string>} - Fact text
   */
  async getFact(topic) {
    return this.wikipedia.getFact(topic);
  }

  /**
   * Get a summary from Wikipedia
   * @param {string} topic - Wikipedia topic
   * @returns {Promise<object>} - Summary object
   */
  async getSummary(topic) {
    return this.wikipedia.getSummary(topic);
  }

  /**
   * Search Wikipedia
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Search results
   */
  async search(query, limit = 5) {
    return this.wikipedia.search(query, limit);
  }

  /**
   * Rewrite text using AI
   * @param {string} fact - Fact to incorporate
   * @param {string} template - Template with X placeholder
   * @returns {Promise<string>} - Rewritten text
   */
  async rewrite(fact, template) {
    if (!this.ready) await this.init();
    return this.ai.rewriteSentence(fact, template);
  }

  /**
   * Generate a paragraph using AI
   * @param {string} topic - Topic name
   * @param {string} context - Context/facts
   * @returns {Promise<string>} - Generated paragraph
   */
  async generateParagraph(topic, context) {
    if (!this.ready) await this.init();
    return this.ai.generateParagraph(topic, context);
  }

  /**
   * Check if the AI engine is ready
   * @returns {boolean}
   */
  isReady() {
    return this.ready;
  }

  /**
   * Get the current AI model name
   * @returns {string}
   */
  getModel() {
    return this.ai.getModel();
  }

  /**
   * Clear the Wikipedia cache
   */
  clearCache() {
    this.wikipedia.clearCache();
  }
}

// Export everything
export { DocuFreshAI, WikipediaClient, AIEngine, registerAIMarkers, createAIMarkers };
export default DocuFreshAI;
