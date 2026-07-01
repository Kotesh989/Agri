import { Bot, Mic, MicOff, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceChat } from './VoiceChat';

export const VoiceAssistant = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const assistant = useVoiceAssistant({
    language: i18n.language === 'kn' ? 'kn-IN' : 'en-IN',
    onNavigate: navigate,
  });

  if (user?.role !== 'ADMIN') return null;

  const toggleListening = () => {
    if (assistant.isListening) assistant.stopListening();
    else assistant.startListening();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-4 flex h-[560px] w-[min(92vw,420px)] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-[#151d19]">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-600 p-2 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">{t('aiAssistant.title')}</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">{t('aiAssistant.subtitle')}</p>
              </div>
            </div>
            <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-gray-800" onClick={() => setOpen(false)} title={t('aiAssistant.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <VoiceChat
            messages={assistant.messages}
            status={assistant.status}
            transcript={assistant.transcript}
            lastResult={assistant.lastResult}
            pendingConfirmation={assistant.pendingConfirmation}
            onSend={assistant.submitTranscript}
            onConfirm={assistant.confirmPending}
            onCancel={assistant.cancelPending}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={toggleListening}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ${assistant.isListening ? 'bg-rose-600' : 'bg-emerald-600'}`}
          title={assistant.isListening ? t('aiAssistant.stopListening') : t('aiAssistant.startListening')}
        >
          {assistant.isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          title={t('aiAssistant.open')}
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
