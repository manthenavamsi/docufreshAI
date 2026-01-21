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
    this.temperature = options.temperature ?? 0; // 0 = deterministic, 0-1 = creative
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
   * Replaces X placeholder with key information extracted from the fact
   * @param {string} fact - The fact to incorporate
   * @param {string} template - Template sentence (X marks where fact goes)
   * @param {object} options - Options for rewriting
   * @param {boolean} options.useAI - Whether to use AI for creative rewriting (default: false)
   * @returns {Promise<string>} - Rewritten sentence
   */
  async rewriteSentence(fact, template, options = {}) {
    // Extract key info from fact
    const keyInfo = this.extractKeyInfo(fact);

    // Replace X placeholder with the key info
    let result = template;
    if (template.includes('X') || template.includes('x')) {
      result = template.replace(/\bX\b/gi, keyInfo);
    }

    // If AI rewriting is requested (opt-in for creativity)
    if (options.useAI) {
      await this.init();

      const prompt = `Slightly polish this sentence while keeping its structure: "${result}"
Keep the same meaning. Output only the polished sentence:`;

      try {
        const aiResult = await this.generator(prompt, {
          max_new_tokens: 100,
          temperature: 0.3,  // Lower temperature for more controlled output
          do_sample: true
        });

        const output = aiResult[0]?.generated_text?.trim();
        // Only use AI output if it's similar length (not a complete rewrite)
        if (output && output.length > result.length * 0.5 && output.length < result.length * 2) {
          return output;
        }
      } catch (error) {
        console.error('AI rewrite error:', error.message);
      }
    }

    return result;
  }

  /**
   * Generate a paragraph about a topic using facts
   * @param {string} topic - The topic name
   * @param {string} facts - Facts about the topic
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - Generated paragraph
   */
  async generateParagraph(topic, facts, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Write a brief, informative paragraph about ${topic} based on these facts:
${facts.slice(0, 800)}

Write a 2-3 sentence summary:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: temp,
        do_sample: temp > 0
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
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - Summary
   */
  async summarize(text, maxLength = 100, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Summarize this in one sentence: ${text.slice(0, 1000)}`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: maxLength,
        temperature: temp,
        do_sample: temp > 0
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
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - Answer
   */
  async answerQuestion(question, context, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Answer this question based on the context.
Context: ${context.slice(0, 800)}
Question: ${question}
Answer:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 100,
        temperature: temp,
        do_sample: temp > 0
      });

      return result[0]?.generated_text?.trim() || 'Unable to answer';
    } catch (error) {
      console.error('AI answer error:', error.message);
      return 'Unable to answer';
    }
  }

  /**
   * Extract key information from a fact (prioritizes numbers/statistics, then first sentence)
   */
  extractKeyInfo(fact) {
    // First, try to find meaningful numbers with context (e.g., "100 million users", "8.1 billion people")
    const patterns = [
      /\d[\d,]*(\.\d+)?\s*(million|billion|trillion)\s*(users|people|dollars|downloads)?/gi,
      /\d[\d,]*(\.\d+)?\s*(percent|%)/gi,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi,
      /\d{4}/g  // Year as last resort
    ];

    for (const pattern of patterns) {
      const matches = fact.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].trim();
      }
    }

    // Get first sentence as fallback
    const firstSentence = fact.split(/[.!?]/)[0];

    // If it's short enough, use it
    if (firstSentence.length <= 100) {
      return firstSentence.trim();
    }

    // Fallback to truncated first sentence
    return firstSentence.slice(0, 100).trim() + '...';
  }

  /**
   * Extract the most important fact from text using AI
   * @param {string} text - The full text (e.g., Wikipedia extract)
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - The key fact extracted by AI
   */
  async extractKeyFact(text, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Extract the single most important fact from this text. Output only the fact in one sentence:
${text.slice(0, 800)}

Most important fact:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 100,
        temperature: temp,
        do_sample: temp > 0
      });

      const output = result[0]?.generated_text?.trim();
      return output || text.split('.')[0];
    } catch (error) {
      console.error('AI extract fact error:', error.message);
      return text.split('.')[0]; // Return first sentence as fallback
    }
  }

  /**
   * Generate a concise description of a topic using AI
   * @param {string} topic - The topic name
   * @param {string} context - Context/facts about the topic
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - A concise description (1-2 sentences)
   */
  async generateDescription(topic, context, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Write a brief, one-sentence description of ${topic} based on this information:
${context.slice(0, 600)}

One-sentence description:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 60,
        temperature: temp,
        do_sample: temp > 0
      });

      const output = result[0]?.generated_text?.trim();
      return output || context.split('.')[0];
    } catch (error) {
      console.error('AI description error:', error.message);
      return context.split('.')[0];
    }
  }

  /**
   * Fully rewrite a sentence incorporating facts using AI
   * @param {string} sentence - The original sentence to rewrite
   * @param {string} facts - Facts to incorporate
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - The AI-rewritten sentence
   */
  async rewriteWithFacts(sentence, facts, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Rewrite this sentence to be more informative using the provided facts.

Original sentence: ${sentence}

Facts to use: ${facts.slice(0, 600)}

Write a new, improved sentence that incorporates relevant facts:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: temp,
        do_sample: temp > 0
      });

      const output = result[0]?.generated_text?.trim();
      return output || sentence;
    } catch (error) {
      console.error('AI rewrite error:', error.message);
      return sentence;
    }
  }

  /**
   * Answer a simple question using AI knowledge (no context needed)
   * @param {string} question - The question to answer
   * @param {object} options - Options
   * @param {number} options.temperature - Override instance temperature
   * @returns {Promise<string>} - The answer
   */
  async answerSimple(question, options = {}) {
    await this.init();

    const temp = options.temperature ?? this.temperature;
    const prompt = `Answer this question briefly and accurately:
Question: ${question}
Answer:`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 50,
        temperature: temp,
        do_sample: temp > 0
      });

      return result[0]?.generated_text?.trim() || 'Unable to answer';
    } catch (error) {
      console.error('AI simple answer error:', error.message);
      return 'Unable to answer';
    }
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
   * Get the current temperature setting
   * @returns {number} Current temperature (0-1)
   */
  getTemperature() {
    return this.temperature;
  }

  /**
   * Set the temperature
   * @param {number} temp - Temperature value (0 = deterministic, 1 = creative)
   */
  setTemperature(temp) {
    this.temperature = Math.max(0, Math.min(1, temp));
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
