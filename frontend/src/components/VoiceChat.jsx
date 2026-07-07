import { Send, CornerDownLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatIntent } from '../utils/intentParser';
import { motion } from 'framer-motion';

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
    if (!query) return suggestionPhrases.slice(0, 4);
    return suggestionPhrases.filter((phrase) => phrase.toLowerCase().includes(query)).slice(0, 4);
  }, [input]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable messages bubble container */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-left p-1">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8">
            {t('aiAssistant.empty')}
          </p>
        )}
        {messages.map((message) => {
          const isAssistant = message.role === 'assistant';
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                  isAssistant
                    ? 'bg-slate-100 text-slate-800 rounded-tl-none dark:bg-gray-800 dark:text-slate-100 border border-slate-200/20 dark:border-white/5'
                    : 'bg-emerald-500 text-white rounded-tr-none'
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer controls and forms */}
      <div className="mt-3 space-y-2 border-t border-slate-200/40 pt-3 dark:border-white/5">
        {/* Connection status and voice visualizer */}
        <div className="rounded-xl bg-slate-50/80 p-2.5 text-[11px] text-slate-500 dark:bg-[#151D19]/30 dark:text-gray-400 border border-slate-200/20 dark:border-white/5">
          <div className="flex justify-between items-center font-bold">
            <span>{t(`aiAssistant.${status === 'unsupported' ? 'unsupportedSpeech' : status}`) || status}</span>
            {status === 'listening' && (
              <div className="flex gap-0.5 items-center">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-3 bg-emerald-500 rounded-full"
                    animate={{ scaleY: [0.3, 1.2, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
          </div>
          {transcript && <div className="mt-1 font-mono text-[10px] break-words text-slate-400">"{transcript}"</div>}
          {lastResult?.intent && (
            <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              {t('aiAssistant.detectedIntent')}: {formatIntent(lastResult.intent)}
            </div>
          )}
        </div>

        {/* Confirmation dialogue overlay */}
        {pendingConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs dark:border-amber-900/30 dark:bg-amber-950/25"
          >
            <p className="mb-2.5 font-bold text-amber-800 dark:text-amber-300">{t('aiAssistant.confirmPrompt')}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm flex-1 !py-1.5" onClick={onConfirm}>
                {t('aiAssistant.confirm')}
              </button>
              <button type="button" className="btn btn-secondary btn-sm flex-1 !py-1.5" onClick={onCancel}>
                {t('aiAssistant.cancel')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Suggestions Pills */}
        {filteredSuggestions.length > 0 && !pendingConfirmation && (
          <div className="flex flex-wrap gap-1.5 py-1">
            {filteredSuggestions.map((phrase) => (
              <button
                key={phrase}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:border-white/5 dark:bg-[#151D19]/40 dark:text-gray-400 dark:hover:bg-emerald-950/20"
                onClick={() => setInput(phrase)}
              >
                {phrase}
              </button>
            ))}
          </div>
        )}

        {/* Input box form */}
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            className="input !py-2.5 !px-3 text-xs"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('aiAssistant.inputPlaceholder')}
          />
          <button type="submit" className="btn btn-primary !p-2.5 shrink-0" title={t('aiAssistant.send')}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
