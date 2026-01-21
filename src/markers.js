/**
 * AI-Powered Markers
 * Extends docufresh with intelligent content generation
 * All ai_* markers use AI processing for intelligent output
 */

/**
 * Create AI marker functions
 * @param {WikipediaClient} wikipedia - Wikipedia client instance
 * @param {AIEngine} ai - AI engine instance
 * @param {object} options - Configuration options
 * @param {boolean} options.searchFallback - Use search fallback if direct lookup fails (default: true)
 * @returns {object} - Marker functions
 */
function createAIMarkers(wikipedia, ai, options = {}) {
  const useSearchFallback = options.searchFallback ?? true;

  // Helper function to get facts with optional fallback
  const getFactsFromWikipedia = async (topic) => {
    if (useSearchFallback) {
      return wikipedia.getFactWithFallback(topic);
    }
    return wikipedia.getFact(topic);
  };

  return {
    /**
     * Get the key fact about a topic (AI extracts the most important fact)
     * Usage: {{ai_fact:topic_name}}
     * Example: {{ai_fact:Albert_Einstein}} → "Einstein developed the theory of relativity"
     */
    ai_fact: async (topic) => {
      const fullText = await getFactsFromWikipedia(topic);
      // Use AI to extract the most important fact
      const keyFact = await ai.extractKeyFact(fullText);
      return keyFact;
    },

    /**
     * Get a concise AI-generated description of a topic
     * Usage: {{ai_describe:topic_name}}
     * Example: {{ai_describe:Python_(programming_language)}} → "A versatile programming language known for readability"
     */
    ai_describe: async (topic) => {
      const summary = await wikipedia.getSummary(topic);
      // Use AI to generate a concise description
      const description = await ai.generateDescription(topic, summary.extract);
      return description;
    },

    /**
     * AI fully rewrites a sentence incorporating Wikipedia facts
     * Usage: {{ai_rewrite:topic:sentence}}
     * Example: {{ai_rewrite:USA_Presidents:Presidents have made big changes}}
     *       → "Throughout American history, presidents have shaped the nation through legislation and reforms"
     */
    ai_rewrite: async (topic, sentence) => {
      // Get facts from Wikipedia (with optional search fallback)
      const facts = await getFactsFromWikipedia(topic);

      // Use AI to fully rewrite the sentence with facts
      const rewritten = await ai.rewriteWithFacts(sentence, facts);
      return rewritten;
    },

    /**
     * Fill in placeholders while preserving sentence structure (supports nested markers)
     * Usage: {{ai_complete:sentence with {{ai_answer:question}} inside}}
     * Example: {{ai_complete:The president is {{ai_answer:Who is the US president}}.}}
     *       → "The president is Joe Biden."
     * Note: Inner markers are processed first by the recursive parser
     */
    ai_complete: async (content) => {
      // The recursive parser already processed inner markers
      // This marker just returns the content as-is (structure preserved)
      return content;
    },

    /**
     * Generate a paragraph about a topic using AI
     * Usage: {{ai_paragraph:topic_name}}
     * Example: {{ai_paragraph:SpaceX}} → "SpaceX, founded by Elon Musk in 2002..."
     */
    ai_paragraph: async (topic) => {
      // Get facts from Wikipedia
      const summary = await wikipedia.getSummary(topic);

      // Use AI to generate a paragraph
      const paragraph = await ai.generateParagraph(summary.title, summary.extract);
      return paragraph;
    },

    /**
     * Get an AI-generated summary of a topic
     * Usage: {{ai_summary:topic_name}}
     * Example: {{ai_summary:Climate_change}} → "Climate change is the long-term shift in temperatures..."
     */
    ai_summary: async (topic) => {
      const summary = await wikipedia.getSummary(topic);

      // Use AI to create a concise summary
      const condensed = await ai.summarize(summary.extract);
      return condensed;
    },

    /**
     * Answer a question (with optional topic for context)
     * Usage: {{ai_answer:question}} or {{ai_answer:topic:question}}
     * Example: {{ai_answer:Who is the current US president}} → "Joe Biden"
     * Example: {{ai_answer:Moon:How far is it from Earth?}} → "384,400 km"
     */
    ai_answer: async (topicOrQuestion, question) => {
      if (question) {
        // Format: {{ai_answer:topic:question}} - use Wikipedia context with fallback
        const context = await getFactsFromWikipedia(topicOrQuestion);
        const answer = await ai.answerQuestion(question, context);
        return answer;
      } else {
        // Format: {{ai_answer:question}} - answer directly
        const answer = await ai.answerSimple(topicOrQuestion);
        return answer;
      }
    },

    /**
     * Get the Wikipedia URL for a topic (no AI needed)
     * Usage: {{ai_link:topic_name}}
     * Example: {{ai_link:JavaScript}} → "https://en.wikipedia.org/wiki/JavaScript"
     */
    ai_link: async (topic) => {
      const summary = await wikipedia.getSummary(topic);
      return summary.url || `https://en.wikipedia.org/wiki/${wikipedia.normalizeTopic(topic)}`;
    },

    /**
     * Get the last updated date for Wikipedia article (no AI needed)
     * Usage: {{ai_updated:topic_name}}
     * Example: {{ai_updated:Bitcoin}} → "1/15/2024"
     */
    ai_updated: async (topic) => {
      const summary = await wikipedia.getSummary(topic);
      if (summary.timestamp) {
        return new Date(summary.timestamp).toLocaleDateString();
      }
      return 'Unknown';
    }
  };
}

/**
 * Register AI markers with a docufresh instance
 * @param {DocuFresh} docufresh - The docufresh instance
 * @param {WikipediaClient} wikipedia - Wikipedia client
 * @param {AIEngine} ai - AI engine
 */
function registerAIMarkers(docufresh, wikipedia, ai) {
  const markers = createAIMarkers(wikipedia, ai);

  for (const [name, fn] of Object.entries(markers)) {
    docufresh.registerMarker(name, fn);
  }

  return markers;
}

export { createAIMarkers, registerAIMarkers };
export default registerAIMarkers;
