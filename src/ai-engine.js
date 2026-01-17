/**
 * AI Engine
 * Uses Transformers.js for browser-based text generation
 * No API keys required - models run locally!
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for both Node.js and browser
env.allowLocalModels = false;  // Always download from Hugging Face

/**
 * Supported models with metadata
 */
const SUPPORTED_MODELS = {
  'small': {
    id: 'Xenova/flan-t5-small',
    name: 'FLAN-T5 Small',
    size: '250MB',
    quality: 'good',
    description: 'Fast, lightweight model for simple tasks'
  },
  'base': {
    id: 'Xenova/flan-t5-base',
    name: 'FLAN-T5 Base',
    size: '900MB',
    quality: 'better',
    description: 'Balanced model for most use cases'
  },
  'large': {
    id: 'Xenova/flan-t5-large',
    name: 'FLAN-T5 Large',
    size: '3GB',
    quality: 'best',
    description: 'Highest quality, requires more memory'
  }
};

// Only enable browser cache in browser environment
if (typeof window !== 'undefined') {
  env.useBrowserCache = true;
}

class AIEngine {
  /**
   * Get list of available model keys
   * @returns {string[]} Array of model keys ('small', 'base', 'large')
   */
  static getAvailableModels() {
    return Object.keys(SUPPORTED_MODELS);
  }

  /**
   * Get information about a specific model
   * @param {string} modelKey - Model key ('small', 'base', 'large')
   * @returns {object|null} Model info object or null if not found
   */
  static getModelInfo(modelKey) {
    return SUPPORTED_MODELS[modelKey] || null;
  }

  constructor(options = {}) {
    // Default to 'small' model - users can switch to 'base' or 'large' for better quality
    this.model = this.resolveModel(options.model || 'small');
    this.generator = null;
    this.initialized = false;
    this.initializing = false;
    this.onProgress = options.onProgress || null;
  }

  /**
   * Resolve a model input to a full Hugging Face model ID
   * - 'small' (default), 'base', 'large' -> resolves to predefined model
   * - Custom model ID (e.g., 'facebook/bart-large-cnn') -> used as-is
   * @param {string} modelInput - Model key or custom model ID
   * @returns {string} Full Hugging Face model ID
   */
  resolveModel(modelInput) {
    // Check if it's a predefined model key
    if (SUPPORTED_MODELS[modelInput]) {
      return SUPPORTED_MODELS[modelInput].id;
    }
    // Otherwise, treat as custom model ID
    return modelInput;
  }

  /**
   * Initialize the AI model
   * Downloads and loads the model (first time may take a while)
   */
  async init() {
    if (this.initialized) return;
    if (this.initializing) {
      // Wait for existing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;

    try {
      console.log(`Loading AI model: ${this.model}...`);

      // Create text2text-generation pipeline
      this.generator = await pipeline('text2text-generation', this.model, {
        progress_callback: (progress) => {
          if (this.onProgress) {
            this.onProgress(progress);
          }
          if (progress.status === 'progress') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`Downloading model: ${percent}%`);
          }
        }
      });

      this.initialized = true;
      console.log('AI model loaded successfully!');
    } catch (error) {
      console.error('Failed to initialize AI engine:', error.message);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Rewrite a sentence incorporating a fact
   * @param {string} fact - The fact to incorporate
   * @param {string} template - Template sentence (X marks where fact goes)
   * @returns {Promise<string>} - Rewritten sentence
   */
  async rewriteSentence(fact, template) {
    await this.init();

    // If template has X placeholder, do simple replacement first
    let baseText = template;
    if (template.includes('X') || template.includes('x')) {
      // Extract key info from fact (first sentence or first 100 chars)
      const keyInfo = this.extractKeyInfo(fact);
      baseText = template.replace(/\bX\b/gi, keyInfo);
    }

    // Use AI to polish the sentence
    const prompt = `Rewrite this sentence to be more natural and informative: "${baseText}"
Based on this fact: ${fact.slice(0, 500)}
Output only the rewritten sentence:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 100,
        temperature: 0.7,
        do_sample: true
      });

      const output = result[0]?.generated_text?.trim();
      return output || baseText;
    } catch (error) {
      console.error('AI rewrite error:', error.message);
      return baseText; // Return template with placeholder filled
    }
  }

  /**
   * Generate a paragraph about a topic using facts
   * @param {string} topic - The topic name
   * @param {string} facts - Facts about the topic
   * @returns {Promise<string>} - Generated paragraph
   */
  async generateParagraph(topic, facts) {
    await this.init();

    const prompt = `Write a brief, informative paragraph about ${topic} based on these facts:
${facts.slice(0, 800)}

Write a 2-3 sentence summary:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        do_sample: true
      });

      const output = result[0]?.generated_text?.trim();
      return output || facts.slice(0, 200);
    } catch (error) {
      console.error('AI generate error:', error.message);
      return facts.slice(0, 200); // Return truncated facts as fallback
    }
  }

  /**
   * Summarize text
   * @param {string} text - Text to summarize
   * @param {number} maxLength - Max length of summary
   * @returns {Promise<string>} - Summary
   */
  async summarize(text, maxLength = 100) {
    await this.init();

    const prompt = `Summarize this in one sentence: ${text.slice(0, 1000)}`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: maxLength,
        temperature: 0.5
      });

      return result[0]?.generated_text?.trim() || text.slice(0, maxLength);
    } catch (error) {
      console.error('AI summarize error:', error.message);
      return text.slice(0, maxLength);
    }
  }

  /**
   * Answer a question based on context
   * @param {string} question - The question
   * @param {string} context - Context to answer from
   * @returns {Promise<string>} - Answer
   */
  async answerQuestion(question, context) {
    await this.init();

    const prompt = `Answer this question based on the context.
Context: ${context.slice(0, 800)}
Question: ${question}
Answer:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 100,
        temperature: 0.3
      });

      return result[0]?.generated_text?.trim() || 'Unable to answer';
    } catch (error) {
      console.error('AI answer error:', error.message);
      return 'Unable to answer';
    }
  }

  /**
   * Extract key information from a fact (first sentence or key phrase)
   */
  extractKeyInfo(fact) {
    // Get first sentence
    const firstSentence = fact.split(/[.!?]/)[0];

    // If it's short enough, use it
    if (firstSentence.length <= 100) {
      return firstSentence.trim();
    }

    // Otherwise extract key numbers or phrases
    const numbers = fact.match(/[\d,]+(\.\d+)?(\s*(million|billion|trillion|percent|%|years|days))?/gi);
    if (numbers && numbers.length > 0) {
      return numbers[0];
    }

    // Fallback to truncated first sentence
    return firstSentence.slice(0, 100).trim() + '...';
  }

  /**
   * Check if the engine is ready
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Get the current model name
   */
  getModel() {
    return this.model;
  }

  /**
   * Change the model (requires re-initialization)
   * @param {string} modelName - 'small', 'base', 'large', or custom model ID
   */
  async setModel(modelName) {
    this.model = this.resolveModel(modelName);
    this.initialized = false;
    this.generator = null;
    await this.init();
  }
}

export { AIEngine };
export default AIEngine;
