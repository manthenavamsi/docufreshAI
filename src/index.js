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
   * @param {number} options.temperature - AI temperature: 0 (deterministic) to 1 (creative). Default: 0
   * @param {boolean} options.searchFallback - Search Wikipedia if direct lookup fails. Default: true
   * @param {number} options.cacheTTL - Wikipedia cache TTL in ms (default: 1 hour)
   * @param {function} options.onProgress - Callback for model download progress
   */
  constructor(options = {}) {
    this.options = options;
    this.temperature = options.temperature ?? 0;
    this.searchFallback = options.searchFallback ?? true;
    this.wikipedia = new WikipediaClient({
      cacheTTL: options.cacheTTL
    });
    this.ai = new AIEngine({
      model: options.model,
      temperature: this.temperature,
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

    // Create markers with options
    this.markers = createAIMarkers(this.wikipedia, this.ai, {
      searchFallback: this.searchFallback
    });

    this.ready = true;
    console.log('DocuFresh-AI ready!');
  }

  /**
   * Process text with AI markers (supports nested markers)
   * Uses recursive parsing: processes innermost markers first, then outer ones
   *
   * @param {string} text - Text containing {{ai_*}} markers (can be nested)
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
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    // Recursive processing: find and process innermost markers first
    // Pattern matches markers with NO {{ inside their params (innermost only)
    const maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // Find innermost markers (no {{ inside params)
      // Matches: {{ai_name:params}} where params has no {{ or }}
      const innerPattern = /\{\{(ai_\w+):([^{}]*)\}\}/g;
      const matches = [...result.matchAll(innerPattern)];

      // Also find simple markers without params: {{ai_name}}
      const simplePattern = /\{\{(ai_\w+)\}\}/g;
      const simpleMatches = [...result.matchAll(simplePattern)];

      // No more markers to process
      if (matches.length === 0 && simpleMatches.length === 0) {
        break;
      }

      // Process markers with params
      for (const match of matches) {
        const fullMarker = match[0];
        const markerName = match[1];
        const paramsString = match[2];

        const replacement = await this.processMarker(markerName, paramsString);
        result = result.replace(fullMarker, replacement);
      }

      // Process simple markers
      for (const match of simpleMatches) {
        const fullMarker = match[0];
        const markerName = match[1];

        const replacement = await this.processMarker(markerName, '');
        result = result.replace(fullMarker, replacement);
      }
    }

    return result;
  }

  /**
   * Process a single marker
   * @param {string} markerName - The marker name (e.g., 'ai_fact')
   * @param {string} paramsString - The parameters string
   * @returns {Promise<string>} - The replacement text
   */
  async processMarker(markerName, paramsString) {
    const markerFn = this.markers[markerName];

    if (!markerFn) {
      console.warn(`Unknown marker: ${markerName}`);
      return `{{${markerName}:${paramsString}}}`;
    }

    try {
      if (paramsString) {
        // Split parameters by first colon only for markers that take topic:content
        // This preserves colons within the content
        const colonIndex = paramsString.indexOf(':');
        let params;

        if (colonIndex !== -1 && ['ai_rewrite', 'ai_answer', 'ai_complete'].includes(markerName)) {
          // For these markers, split only on first colon: topic:rest_of_content
          params = [
            paramsString.slice(0, colonIndex).trim(),
            paramsString.slice(colonIndex + 1).trim()
          ];
        } else {
          // For other markers, simple split
          params = paramsString.split(':').map(p => p.trim());
        }

        return await markerFn(...params);
      } else {
        return await markerFn();
      }
    } catch (error) {
      console.error(`Error processing ${markerName}:`, error.message);
      return `{{${markerName}:${paramsString}}}`; // Return original on error
    }
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
