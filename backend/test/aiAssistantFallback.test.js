import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackIntentForTranscript } from '../src/controllers/aiAssistantController.js';

test('detects clear-due requests in Kannada and English', () => {
  const kannada = fallbackIntentForTranscript('ರಮೇಶ್ ಅವರ ಬಾಕಿ ಕ್ಲಿಯರ್ ಮಾಡಿ');
  assert.equal(kannada.intent, 'CLEAR_DUE');
  assert.equal(kannada.entities.farmerName, 'ರಮೇಶ್');

  const english = fallbackIntentForTranscript('Please clear Ramesh due');
  assert.equal(english.intent, 'CLEAR_DUE');
  assert.equal(english.entities.farmerName, 'Ramesh');
});

test('detects due search requests from natural language', () => {
  const result = fallbackIntentForTranscript('Show pending dues for Mysuru farmers');
  assert.equal(result.intent, 'SEARCH_DUES');
  assert.equal(result.entities.village, 'Mysuru');
});
