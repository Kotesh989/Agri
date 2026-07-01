import { useRef, useState } from 'react';
import { sendAssistantMessage } from '../services/aiService';
import { getSpeechRecognition, speak } from '../services/speechService';
import { normalizeKannadaNumbers } from '../utils/kannadaNumbers';

export const useVoiceAssistant = ({ language = 'kn-IN', onNavigate } = {}) => {
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('idle');
  const [lastResult, setLastResult] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const appendMessage = (message) => {
    setMessages((current) => [...current, { id: `${Date.now()}-${current.length}`, ...message }]);
  };

  const submitTranscript = async (text, options = {}) => {
    const normalizedText = normalizeKannadaNumbers(text).trim();
    if (!normalizedText) return null;
    setStatus(options.confirmed ? 'executing' : 'processing');
    appendMessage({ role: 'user', content: normalizedText });
    const result = await sendAssistantMessage({
      transcript: normalizedText,
      conversation: messages.map((message) => ({ role: message.role, content: message.content })),
      confirmed: options.confirmed,
    });
    setLastResult(result);
    if (result.confirmationRequired) {
      setPendingConfirmation(normalizedText);
    } else {
      setPendingConfirmation(null);
      if (result.intent === 'NAVIGATE' && result.data?.route && onNavigate) onNavigate(result.data.route);
    }
    appendMessage({ role: 'assistant', content: result.reply || '', result });
    speak(result.reply, language);
    setStatus('completed');
    return result;
  };

  const startListening = () => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setStatus('unsupported');
      return false;
    }
    recognition.lang = language;
    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
    };
    recognition.onresult = (event) => {
      setStatus('recognizing');
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += text;
        else interimText += text;
      }
      setTranscript(finalText || interimText);
      if (finalText.trim()) submitTranscript(finalText);
    };
    recognition.onerror = () => {
      setStatus('idle');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setStatus((current) => (current === 'listening' || current === 'recognizing' ? 'idle' : current));
    };
    recognitionRef.current = recognition;
    recognition.start();
    return true;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setStatus('idle');
  };

  const confirmPending = () => {
    if (!pendingConfirmation) return;
    submitTranscript(pendingConfirmation, { confirmed: true });
  };

  const cancelPending = () => {
    setPendingConfirmation(null);
    setStatus('idle');
  };

  return {
    messages,
    transcript,
    status,
    lastResult,
    pendingConfirmation,
    isListening,
    startListening,
    stopListening,
    submitTranscript,
    confirmPending,
    cancelPending,
  };
};
