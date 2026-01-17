# DocuFresh-AI

[![npm version](https://img.shields.io/npm/v/docufresh-ai.svg)](https://www.npmjs.com/package/docufresh-ai)
[![license](https://img.shields.io/github/license/manthenavamsi/docufreshAI)](LICENSE)

AI-powered content freshening for [docufresh](https://www.npmjs.com/package/docufresh). Keep your documents updated with real-world facts using **Wikipedia + browser-based AI**.

**No API keys required!** The AI runs entirely in your browser or Node.js.

## Features

- **Wikipedia Integration** - Fetch current facts from Wikipedia (free, no auth)
- **Browser-Based AI** - Uses [Transformers.js](https://huggingface.co/docs/transformers.js) to run AI locally
- **No API Keys** - Everything runs locally, no OpenAI/Gemini keys needed
- **Smart Rewriting** - AI rewrites sentences to incorporate fresh facts naturally
- **Paragraph Generation** - Generate entire paragraphs about topics

## Installation

```bash
npm install docufresh-ai
```

**Note:** Requires Node.js 18+ (for native fetch support).

## Quick Start

```javascript
import DocuFreshAI from 'docufresh-ai';

const ai = new DocuFreshAI();

// First call downloads the AI model (~250MB)
await ai.init();

// Get facts from Wikipedia
const text = 'Albert Einstein: {{ai_fact:Albert_Einstein}}';
console.log(await ai.process(text));
// "Albert Einstein: Albert Einstein was a German-born theoretical physicist..."

// Rewrite sentences with current facts
const text2 = '{{ai_rewrite:World_population:The world has X people}}';
console.log(await ai.process(text2));
// "The world has approximately 8.1 billion people"

// Generate paragraphs
const text3 = '{{ai_paragraph:SpaceX}}';
console.log(await ai.process(text3));
// "SpaceX is an American spacecraft manufacturer..."
```

## AI Markers

| Marker | Description | Example |
|--------|-------------|---------|
| `{{ai_fact:topic}}` | Get Wikipedia fact | `{{ai_fact:Moon}}` |
| `{{ai_describe:topic}}` | Short description | `{{ai_describe:Python_(programming_language)}}` |
| `{{ai_rewrite:topic:template}}` | Rewrite with facts (X = placeholder) | `{{ai_rewrite:Bitcoin:Bitcoin is worth X}}` |
| `{{ai_paragraph:topic}}` | Generate paragraph | `{{ai_paragraph:Climate_change}}` |
| `{{ai_summary:topic}}` | Condensed summary | `{{ai_summary:Artificial_intelligence}}` |
| `{{ai_answer:topic:question}}` | Answer question | `{{ai_answer:Sun:How hot is it?}}` |
| `{{ai_link:topic}}` | Wikipedia URL | `{{ai_link:JavaScript}}` |
| `{{ai_updated:topic}}` | Last update date | `{{ai_updated:Tesla,_Inc.}}` |

## API Reference

### `new DocuFreshAI(options?)`

Create a new instance.

```javascript
const ai = new DocuFreshAI({
  model: 'Xenova/flan-t5-small',  // AI model (default)
  cacheTTL: 1000 * 60 * 60,       // Wikipedia cache: 1 hour
  onProgress: (p) => console.log(p) // Model download progress
});
```

### `ai.init()`

Initialize the AI engine. Downloads the model on first run (~250MB).

```javascript
await ai.init();
```

### `ai.process(text, customData?)`

Process text with AI markers.

```javascript
const result = await ai.process('{{ai_fact:Mars}}');
```

### `ai.processWithDocufresh(text, customData?)`

Process with both AI markers and [docufresh](https://www.npmjs.com/package/docufresh) basic markers.

```javascript
// Requires: npm install docufresh
const result = await ai.processWithDocufresh(
  '{{current_year}}: {{ai_fact:Moon}}'
);
// "2026: The Moon is Earth's only natural satellite..."
```

### Direct Methods

```javascript
// Get Wikipedia fact
const fact = await ai.getFact('JavaScript');

// Get full summary
const summary = await ai.getSummary('React_(JavaScript_library)');

// Search Wikipedia
const results = await ai.search('programming languages', 5);

// Rewrite with AI
const rewritten = await ai.rewrite(
  'JavaScript was created in 1995',
  'JS has been around for X years'
);

// Generate paragraph
const paragraph = await ai.generateParagraph('Node.js', 'Runtime for JavaScript');
```

## Use Cases

### Keep Blog Posts Fresh

```javascript
const blogPost = `
# Tech Industry Update

{{ai_paragraph:Artificial_intelligence}}

Current AI trends show {{ai_rewrite:ChatGPT:ChatGPT has X users}}.

Last updated: {{ai_updated:Artificial_intelligence}}
`;

const fresh = await ai.process(blogPost);
```

### Dynamic Documentation

```javascript
const docs = `
## About Python

{{ai_fact:Python_(programming_language)}}

**Latest version info:** {{ai_rewrite:Python_(programming_language):Python X is the latest}}

[Learn more]({{ai_link:Python_(programming_language)}})
`;
```

### Q&A Sections

```javascript
const faq = `
**Q: How far is the Moon?**
A: {{ai_answer:Moon:How far is it from Earth?}}

**Q: What is the Sun made of?**
A: {{ai_answer:Sun:What is it made of?}}
`;
```

## Browser Usage

```html
<script type="module">
  import DocuFreshAI from 'https://esm.sh/docufresh-ai';

  const ai = new DocuFreshAI({
    onProgress: (p) => {
      if (p.status === 'progress') {
        console.log(`Loading: ${Math.round(p.loaded/p.total*100)}%`);
      }
    }
  });

  document.getElementById('content').innerHTML = await ai.process(
    document.getElementById('content').innerHTML
  );
</script>
```

## Available Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| `Xenova/flan-t5-small` | ~250MB | Good | Fast |
| `Xenova/flan-t5-base` | ~900MB | Better | Slower |
| `Xenova/flan-t5-large` | ~3GB | Best | Slowest |

```javascript
const ai = new DocuFreshAI({ model: 'Xenova/flan-t5-base' });
```

## Caching

- Wikipedia responses are cached for 1 hour by default
- AI model is cached after first download (browser localStorage / Node.js cache)
- Customize cache TTL:

```javascript
const ai = new DocuFreshAI({
  cacheTTL: 1000 * 60 * 30  // 30 minutes
});

// Clear cache manually
ai.clearCache();
```

## TypeScript

Full TypeScript support included:

```typescript
import DocuFreshAI, { WikipediaSummary } from 'docufresh-ai';

const ai = new DocuFreshAI();
const summary: WikipediaSummary = await ai.getSummary('TypeScript');
```

## Requirements

- **Node.js 18+** (for native fetch)
- **Modern browser** (Chrome 89+, Firefox 89+, Safari 15+)
- **~250MB** disk space for default AI model

## Related

- [docufresh](https://www.npmjs.com/package/docufresh) - Base library for simple markers
- [Transformers.js](https://huggingface.co/docs/transformers.js) - The AI engine

## License

MIT License - see [LICENSE](LICENSE) file for details.
