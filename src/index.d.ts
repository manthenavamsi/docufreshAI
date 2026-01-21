/**
 * DocuFresh-AI TypeScript Declarations
 */

export interface WikipediaSummary {
  title: string;
  description: string;
  extract: string;
  extractShort: string;
  thumbnail: string | null;
  url: string | null;
  timestamp: string;
  error?: boolean;
}

export interface WikipediaSearchResult {
  title: string;
  description: string;
  url: string;
}

export interface WikipediaClientOptions {
  cacheTTL?: number;
}

/**
 * Predefined model keys
 */
export type ModelKey = 'small' | 'base' | 'large';

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  quality: 'good' | 'better' | 'best';
  description: string;
}

export declare class WikipediaClient {
  constructor(options?: WikipediaClientOptions);
  getSummary(topic: string): Promise<WikipediaSummary>;
  getFact(topic: string): Promise<string>;
  /** Get fact with search fallback - searches Wikipedia if direct lookup fails */
  getFactWithFallback(topic: string): Promise<string>;
  getDescription(topic: string): Promise<string>;
  search(query: string, limit?: number): Promise<WikipediaSearchResult[]>;
  normalizeTopic(topic: string): string;
  clearCache(): void;
}

export interface AIEngineOptions {
  model?: ModelKey | string;
  /** Temperature for AI output: 0 (deterministic) to 1 (creative). Default: 0 */
  temperature?: number;
  onProgress?: (progress: any) => void;
}

export declare class AIEngine {
  /**
   * Get list of available model keys
   */
  static getAvailableModels(): ModelKey[];

  /**
   * Get information about a specific model
   */
  static getModelInfo(modelKey: ModelKey): ModelInfo | null;

  constructor(options?: AIEngineOptions);
  init(): Promise<void>;
  rewriteSentence(fact: string, template: string, options?: { useAI?: boolean }): Promise<string>;
  generateParagraph(topic: string, facts: string): Promise<string>;
  summarize(text: string, maxLength?: number): Promise<string>;
  answerQuestion(question: string, context: string): Promise<string>;
  answerSimple(question: string): Promise<string>;
  extractKeyFact(text: string): Promise<string>;
  generateDescription(topic: string, context: string): Promise<string>;
  rewriteWithFacts(sentence: string, facts: string): Promise<string>;
  isReady(): boolean;
  getModel(): string;
  /** Get the current temperature setting */
  getTemperature(): number;
  /** Set the temperature (0 = deterministic, 1 = creative) */
  setTemperature(temp: number): void;
  setModel(modelName: ModelKey | string): Promise<void>;
  resolveModel(modelInput: ModelKey | string): string;
}

export interface AIMarkers {
  /** AI extracts the most important fact from Wikipedia */
  ai_fact: (topic: string) => Promise<string>;
  /** AI generates a concise description */
  ai_describe: (topic: string) => Promise<string>;
  /** AI fully rewrites sentence with Wikipedia facts */
  ai_rewrite: (topic: string, sentence: string) => Promise<string>;
  /** Fill placeholders while preserving sentence structure (supports nested markers) */
  ai_complete: (content: string) => Promise<string>;
  /** AI generates an informative paragraph */
  ai_paragraph: (topic: string) => Promise<string>;
  /** AI creates a condensed summary */
  ai_summary: (topic: string) => Promise<string>;
  /** AI answers a question (with optional topic for context) */
  ai_answer: (topicOrQuestion: string, question?: string) => Promise<string>;
  /** Returns Wikipedia URL (no AI) */
  ai_link: (topic: string) => Promise<string>;
  /** Returns article timestamp (no AI) */
  ai_updated: (topic: string) => Promise<string>;
}

export interface CreateAIMarkersOptions {
  /** Use search fallback if direct Wikipedia lookup fails. Default: true */
  searchFallback?: boolean;
}

export declare function createAIMarkers(
  wikipedia: WikipediaClient,
  ai: AIEngine,
  options?: CreateAIMarkersOptions
): AIMarkers;

export declare function registerAIMarkers(
  docufresh: any,
  wikipedia: WikipediaClient,
  ai: AIEngine
): AIMarkers;

export interface DocuFreshAIOptions {
  /** Model to use: 'small' (default), 'base', 'large', or custom model ID */
  model?: ModelKey | string;
  /** Temperature for AI output: 0 (deterministic) to 1 (creative). Default: 0 */
  temperature?: number;
  /** Search Wikipedia if direct article lookup fails. Default: true */
  searchFallback?: boolean;
  cacheTTL?: number;
  onProgress?: (progress: any) => void;
}

export declare class DocuFreshAI {
  /**
   * Get list of available model keys
   */
  static getAvailableModels(): ModelKey[];

  /**
   * Get information about a specific model
   */
  static getModelInfo(modelKey: ModelKey): ModelInfo | null;

  constructor(options?: DocuFreshAIOptions);

  /**
   * Initialize the AI engine (downloads model on first run)
   */
  init(): Promise<void>;

  /**
   * Process text with AI markers
   * @param text - Text containing {{ai_*}} markers
   * @param customData - Optional custom data for variable replacement
   */
  process(text: string, customData?: Record<string, string | number>): Promise<string>;

  /**
   * Process text with both docufresh and AI markers
   * Requires docufresh to be installed
   */
  processWithDocufresh(text: string, customData?: Record<string, string | number>): Promise<string>;

  /**
   * Get a fact from Wikipedia
   */
  getFact(topic: string): Promise<string>;

  /**
   * Get a summary from Wikipedia
   */
  getSummary(topic: string): Promise<WikipediaSummary>;

  /**
   * Search Wikipedia
   */
  search(query: string, limit?: number): Promise<WikipediaSearchResult[]>;

  /**
   * Rewrite text using AI
   */
  rewrite(fact: string, template: string): Promise<string>;

  /**
   * Generate a paragraph using AI
   */
  generateParagraph(topic: string, context: string): Promise<string>;

  /**
   * Check if the AI engine is ready
   */
  isReady(): boolean;

  /**
   * Get the current AI model name
   */
  getModel(): string;

  /**
   * Clear the Wikipedia cache
   */
  clearCache(): void;
}

export default DocuFreshAI;
