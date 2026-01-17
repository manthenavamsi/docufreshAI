/**
 * Test DocuFresh-AI with a sample blog post
 */

import DocuFreshAI from './src/index.js';

// Test model selection feature
console.log('='.repeat(60));
console.log('Model Selection Demo');
console.log('='.repeat(60));

console.log('\nAvailable models:', DocuFreshAI.getAvailableModels());

console.log('\nModel details:');
for (const key of DocuFreshAI.getAvailableModels()) {
  const info = DocuFreshAI.getModelInfo(key);
  console.log(`  ${key}: ${info.name} (${info.size}) - ${info.quality} quality`);
}

const blogPost = `
# The Rise of Artificial Intelligence

{{ai_fact:Artificial_intelligence}}

## Key Players

**OpenAI:** {{ai_describe:OpenAI}}

**Google DeepMind:** {{ai_describe:DeepMind}}

## Current Statistics

{{ai_rewrite:Machine_learning:Machine learning is used by X companies worldwide}}

## Learn More

- [Wikipedia: AI]({{ai_link:Artificial_intelligence}})
- [Wikipedia: Machine Learning]({{ai_link:Machine_learning}})

---
*Last updated from Wikipedia: {{ai_updated:Artificial_intelligence}}*
`;

console.log('='.repeat(60));
console.log('DocuFresh-AI Blog Post Test');
console.log('='.repeat(60));
console.log('\n📝 ORIGINAL BLOG POST:\n');
console.log(blogPost);

console.log('\n🔄 Processing with DocuFresh-AI...\n');
console.log('(Note: First run downloads AI model ~250MB, this may take a few minutes)\n');

// You can change 'small' to 'base' or 'large' for better quality (but larger download)
const selectedModel = 'small';

const ai = new DocuFreshAI({
  model: selectedModel,
  onProgress: (p) => {
    if (p.status === 'progress' && p.total) {
      const percent = Math.round((p.loaded / p.total) * 100);
      process.stdout.write(`\rDownloading AI model: ${percent}%`);
    }
  }
});

console.log(`\nUsing model: ${ai.getModel()}`);

try {
  const processed = await ai.process(blogPost);

  console.log('\n\n✅ PROCESSED BLOG POST:\n');
  console.log(processed);
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
} catch (error) {
  console.error('\n❌ Error:', error.message);
}
