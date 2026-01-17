/**
 * AI-Powered Markers
 * Extends docufresh with intelligent content generation
 */

/**
 * Create AI marker functions
 * @param {WikipediaClient} wikipedia - Wikipedia client instance
 * @param {AIEngine} ai - AI engine instance
 * @returns {object} - Marker functions
 */
function createAIMarkers(wikipedia, ai) {
  return {
    /**
     * Get a fact about a topic from Wikipedia
     * Usage: {{ai_fact:topic_name}}
     * Example: {{ai_fact:Albert_Einstein}} → "Albert Einstein was a German-born theoretical physicist..."
     */
    ai_fact: async (topic) => {
      const fact = await wikipedia.getFact(topic);
      return fact;
    },

    /**
     * Get a short description of a topic
     * Usage: {{ai_describe:topic_name}}
     * Example: {{ai_describe:Python_(programming_language)}} → "General-purpose programming language"
     */
    ai_describe: async (topic) => {
      const description = await wikipedia.getDescription(topic);
      return description;
    },

    /**
     * Rewrite a sentence incorporating current facts
     * Usage: {{ai_rewrite:topic:template_with_X}}
     * Example: {{ai_rewrite:world_population:The world has X people}}
     *       → "The world has approximately 8.1 billion people"
     */
    ai_rewrite: async (topic, template) => {
      // Get fact from Wikipedia
      const fact = await wikipedia.getFact(topic);

      // Use AI to rewrite naturally
      const rewritten = await ai.rewriteSentence(fact, template);
      return rewritten;
    },

    /**
     * Generate a paragraph about a topic
     * Usage: {{ai_paragraph:topic_name}}
     * Example: {{ai_paragraph:SpaceX}} → "SpaceX, founded by Elon Musk..."
     */
    ai_paragraph: async (topic) => {
      // Get facts from Wikipedia
      const summary = await wikipedia.getSummary(topic);

      // Use AI to generate a paragraph
      const paragraph = await ai.generateParagraph(summary.title, summary.extract);
      return paragraph;
    },

    /**
     * Get a summary of a topic
     * Usage: {{ai_summary:topic_name}}
     * Example: {{ai_summary:Climate_change}} → "Climate change refers to..."
     */
    ai_summary: async (topic) => {
      const summary = await wikipedia.getSummary(topic);

      // Use AI to create a concise summary
      const condensed = await ai.summarize(summary.extract);
      return condensed;
    },

    /**
     * Answer a question using Wikipedia as context
     * Usage: {{ai_answer:topic:question}}
     * Example: {{ai_answer:Moon:How far is it from Earth?}}
     *       → "The Moon is approximately 384,400 km from Earth"
     */
    ai_answer: async (topic, question) => {
      // Get context from Wikipedia
      const summary = await wikipedia.getSummary(topic);

      // Use AI to answer
      const answer = await ai.answerQuestion(question, summary.extract);
      return answer;
    },

    /**
     * Get the Wikipedia URL for a topic
     * Usage: {{ai_link:topic_name}}
     * Example: {{ai_link:JavaScript}} → "https://en.wikipedia.org/wiki/JavaScript"
     */
    ai_link: async (topic) => {
      const summary = await wikipedia.getSummary(topic);
      return summary.url || `https://en.wikipedia.org/wiki/${wikipedia.normalizeTopic(topic)}`;
    },

    /**
     * Get the last updated date for Wikipedia article
     * Usage: {{ai_updated:topic_name}}
     * Example: {{ai_updated:Bitcoin}} → "2024-01-15"
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
