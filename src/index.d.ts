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
  getDescription(topic: string): Promise<string>;
  search(query: string, limit?: number): Promise<WikipediaSearchResult[]>;
  normalizeTopic(topic: string): string;
  clearCache(): void;
}

export interface AIEngineOptions {
  model?: ModelKey | string;
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
  rewriteSentence(fact: string, template: string): Promise<string>;
  generateParagraph(topic: string, facts: string): Promise<string>;
  summarize(text: string, maxLength?: number): Promise<string>;
  answerQuestion(question: string, context: string): Promise<string>;
  isReady(): boolean;
  getModel(): string;
  setModel(modelName: ModelKey | string): Promise<void>;
  resolveModel(modelInput: ModelKey | string): string;
}

export interface AIMarkers {
  ai_fact: (topic: string) => Promise<string>;
  ai_describe: (topic: string) => Promise<string>;
  ai_rewrite: (topic: string, template: string) => Promise<string>;
  ai_paragraph: (topic: string) => Promise<string>;
  ai_summary: (topic: string) => Promise<string>;
  ai_answer: (topic: string, question: string) => Promise<string>;
  ai_link: (topic: string) => Promise<string>;
  ai_updated: (topic: string) => Promise<string>;
}

export declare function createAIMarkers(
  wikipedia: WikipediaClient,
  ai: AIEngine
): AIMarkers;

export declare function registerAIMarkers(
  docufresh: any,
  wikipedia: WikipediaClient,
  ai: AIEngine
): AIMarkers;

export interface DocuFreshAIOptions {
  /** Model to use: 'small' (default), 'base', 'large', or custom model ID */
  model?: ModelKey | string;
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
