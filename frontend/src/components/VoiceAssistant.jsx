import { Bot, Mic, MicOff, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceChat } from './VoiceChat';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Slide-out Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="flex h-[560px] w-[min(92vw,400px)] flex-col rounded-2xl border border-slate-200/60 bg-white p-4 shadow-2xl dark:border-white/5 dark:bg-[#0F1512]"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between border-b border-slate-200/40 pb-3 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{t('aiAssistant.title')}</h2>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">{t('aiAssistant.subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-white"
                onClick={() => setOpen(false)}
                title={t('aiAssistant.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Voice Chat Component */}
            <div className="flex-1 min-h-0">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Buttons */}
      <div className="flex gap-3">
        {/* Pulsing Mic Button */}
        <motion.button
          type="button"
          onClick={toggleListening}
          animate={{ scale: assistant.isListening ? [1, 1.12, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors duration-300 ${
            assistant.isListening ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
          title={assistant.isListening ? t('aiAssistant.stopListening') : t('aiAssistant.startListening')}
        >
          {assistant.isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
        </motion.button>

        {/* Panel Toggle Button */}
        <motion.button
          type="button"
          onClick={() => setOpen((current) => !current)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors duration-300"
          title={t('aiAssistant.open')}
        >
          <Bot className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  );
};
