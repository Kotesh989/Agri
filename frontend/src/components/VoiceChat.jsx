import { Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatIntent } from '../utils/intentParser';

const suggestionPhrases = [
  'Show pending dues',
  'Clear Ramesh due',
  'Show stock for urea',
  'What are the low stock items?',
  'Show today\'s sales',
  'ಬಾಕಿ ತೋರಿಸಿ',
  'ರಮೇಶ್ ಬಾಕಿ ಕ್ಲಿಯರ್ ಮಾಡಿ',
  'ಯೂರಿಯಾ ಸ್ಟಾಕ್ ತೋರಿಸಿ',
  'ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇರುವ ಉತ್ಪನ್ನಗಳು ಯಾವುವು?',
  'ಇಂದು ಮಾರಾಟ ಎಷ್ಟು?',
];

export const VoiceChat = ({
  messages,
  status,
  transcript,
  lastResult,
  pendingConfirmation,
  onSend,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const filteredSuggestions = useMemo(() => {
    const query = input.trim().toLowerCase();
    if (!query) return suggestionPhrases.slice(0, 6);
    return suggestionPhrases.filter((phrase) => phrase.toLowerCase().includes(query));
  }, [input]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="text-sm text-slate-500 dark:text-gray-400">{t('aiAssistant.empty')}</p>}
        {messages.map((message) => (
          <div key={message.id} className={`rounded-lg p-3 text-sm ${message.role === 'assistant' ? 'bg-slate-100 dark:bg-gray-800' : 'bg-emerald-600 text-white'}`}>
            {message.content}
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-gray-800">
        <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-gray-900 dark:text-gray-300">
          <div className="font-semibold">{t(`aiAssistant.${status === 'unsupported' ? 'unsupportedSpeech' : status}`) || status}</div>
          {transcript && <div>{t('aiAssistant.transcript')}: {transcript}</div>}
          {lastResult?.intent && <div>{t('aiAssistant.detectedIntent')}: {formatIntent(lastResult.intent)}</div>}
          {lastResult?.entities && <div>{t('aiAssistant.entities')}: {JSON.stringify(lastResult.entities)}</div>}
          {lastResult?.missingFields?.length > 0 && <div>{t('aiAssistant.missingFields')}: {lastResult.missingFields.join(', ')}</div>}
        </div>

        {pendingConfirmation && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p className="mb-2 font-semibold">{t('aiAssistant.confirmPrompt')}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm flex-1" onClick={onConfirm}>{t('aiAssistant.confirm')}</button>
              <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={onCancel}>{t('aiAssistant.cancel')}</button>
            </div>
          </div>
        )}

        {filteredSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((phrase) => (
              <button
                key={phrase}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                onClick={() => setInput(phrase)}
              >
                {phrase}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('aiAssistant.inputPlaceholder')}
          />
          <button type="submit" className="btn btn-primary" title={t('aiAssistant.send')}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
