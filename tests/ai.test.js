/**
 * DocuFresh-AI Tests
 * Run with: node tests/ai.test.js
 */

import { WikipediaClient } from '../src/wikipedia.js';
import DocuFreshAI from '../src/index.js';

// Test counter
let passed = 0;
let failed = 0;

/**
 * Simple test helper
 */
async function test(description, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

/**
 * Assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================
// RUN TESTS
// ============================================

console.log('\n🧪 Running DocuFresh-AI Tests...\n');
console.log('Note: AI model tests are skipped to avoid long download times.');
console.log('      Wikipedia API tests will run.\n');

// Test 1: Wikipedia client instantiation
await test('WikipediaClient can be instantiated', async () => {
  const client = new WikipediaClient();
  assert(client !== null, 'Client should not be null');
});

// Test 2: Topic normalization
await test('WikipediaClient normalizes topics correctly', async () => {
  const client = new WikipediaClient();

  assert(client.normalizeTopic('hello world') === 'hello_world', 'Should convert spaces to underscores');
  assert(client.normalizeTopic('  test  ') === 'test', 'Should trim spaces');
  assert(client.normalizeTopic('already_normalized') === 'already_normalized', 'Should keep underscores');
});

// Test 3: Wikipedia API fetch
await test('WikipediaClient can fetch summary from API', async () => {
  const client = new WikipediaClient();
  const summary = await client.getSummary('JavaScript');

  assert(summary.title !== undefined, 'Summary should have title');
  assert(summary.extract !== undefined, 'Summary should have extract');
  assert(summary.extract.length > 0, 'Extract should not be empty');
  console.log(`   Fetched: "${summary.title}" (${summary.extract.length} chars)`);
});

// Test 4: Wikipedia fact fetch
await test('WikipediaClient.getFact returns text', async () => {
  const client = new WikipediaClient();
  const fact = await client.getFact('Python_(programming_language)');

  assert(typeof fact === 'string', 'Fact should be a string');
  assert(fact.length > 0, 'Fact should not be empty');
  console.log(`   Fact preview: "${fact.slice(0, 100)}..."`);
});

// Test 5: Wikipedia search
await test('WikipediaClient can search', async () => {
  const client = new WikipediaClient();
  const results = await client.search('programming', 3);

  assert(Array.isArray(results), 'Results should be an array');
  assert(results.length > 0, 'Should have results');
  assert(results[0].title !== undefined, 'Results should have titles');
  console.log(`   Found ${results.length} results: ${results.map(r => r.title).join(', ')}`);
});

// Test 6: Wikipedia caching
await test('WikipediaClient caches responses', async () => {
  const client = new WikipediaClient({ cacheTTL: 60000 });

  // First fetch
  const start1 = Date.now();
  await client.getSummary('Node.js');
  const time1 = Date.now() - start1;

  // Second fetch (should be cached)
  const start2 = Date.now();
  await client.getSummary('Node.js');
  const time2 = Date.now() - start2;

  console.log(`   First fetch: ${time1}ms, Cached fetch: ${time2}ms`);
  assert(time2 < time1, 'Cached fetch should be faster');
});

// Test 7: DocuFreshAI instantiation
await test('DocuFreshAI can be instantiated', async () => {
  const ai = new DocuFreshAI();
  assert(ai !== null, 'Instance should not be null');
  assert(ai.isReady() === false, 'Should not be ready before init');
});

// Test 8: DocuFreshAI model name
await test('DocuFreshAI has default model', async () => {
  const ai = new DocuFreshAI();
  const model = ai.getModel();
  assert(model === 'Xenova/flan-t5-small', `Default model should be flan-t5-small, got ${model}`);
});

// Test 9: DocuFreshAI custom model
await test('DocuFreshAI accepts custom model', async () => {
  const ai = new DocuFreshAI({ model: 'Xenova/flan-t5-base' });
  const model = ai.getModel();
  assert(model === 'Xenova/flan-t5-base', `Model should be flan-t5-base, got ${model}`);
});

// Test 10: getAvailableModels returns all 3 models
await test('DocuFreshAI.getAvailableModels returns all 3 models', async () => {
  const models = DocuFreshAI.getAvailableModels();
  assert(Array.isArray(models), 'Should return an array');
  assert(models.length === 3, `Should have 3 models, got ${models.length}`);
  assert(models.includes('small'), 'Should include small');
  assert(models.includes('base'), 'Should include base');
  assert(models.includes('large'), 'Should include large');
  console.log(`   Available models: ${models.join(', ')}`);
});

// Test 11: getModelInfo returns correct info
await test('DocuFreshAI.getModelInfo returns correct info', async () => {
  const info = DocuFreshAI.getModelInfo('base');
  assert(info !== null, 'Should return info for valid key');
  assert(info.id === 'Xenova/flan-t5-base', `Model ID should be Xenova/flan-t5-base, got ${info.id}`);
  assert(info.name === 'FLAN-T5 Base', `Model name should be FLAN-T5 Base, got ${info.name}`);
  assert(info.size === '900MB', `Size should be 900MB, got ${info.size}`);
  assert(info.quality === 'better', `Quality should be better, got ${info.quality}`);
  console.log(`   Model info: ${info.name} (${info.size}) - ${info.description}`);
});

// Test 12: getModelInfo returns null for invalid key
await test('DocuFreshAI.getModelInfo returns null for invalid key', async () => {
  const info = DocuFreshAI.getModelInfo('invalid');
  assert(info === null, 'Should return null for invalid model key');
});

// Test 13: Model key resolves to full ID
await test('DocuFreshAI model key resolves to full ID', async () => {
  const ai = new DocuFreshAI({ model: 'large' });
  const model = ai.getModel();
  assert(model === 'Xenova/flan-t5-large', `Model should resolve to Xenova/flan-t5-large, got ${model}`);
});

// Test 14: Default model is small
await test('DocuFreshAI defaults to small model', async () => {
  const ai = new DocuFreshAI();
  const model = ai.getModel();
  assert(model === 'Xenova/flan-t5-small', `Default model should be Xenova/flan-t5-small, got ${model}`);
});

// Test 15: Custom model ID passes through
await test('DocuFreshAI passes through custom model IDs', async () => {
  const ai = new DocuFreshAI({ model: 'facebook/bart-large-cnn' });
  const model = ai.getModel();
  assert(model === 'facebook/bart-large-cnn', `Custom model should pass through, got ${model}`);
});

// Test 16: Error handling for invalid topic
await test('WikipediaClient handles invalid topics gracefully', async () => {
  const client = new WikipediaClient();
  const summary = await client.getSummary('this_topic_definitely_does_not_exist_12345');

  // Should return error object, not throw
  assert(summary.error === true || summary.extract.includes('Unable to fetch'),
         'Should handle invalid topic gracefully');
});

// ============================================
// RESULTS
// ============================================

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  console.log('⚠️  Some tests failed.\n');
  process.exit(1);
} else {
  console.log('🎉 All tests passed!\n');
  console.log('Note: Full AI tests require running with --ai flag');
  console.log('      npm test -- --ai\n');
}
