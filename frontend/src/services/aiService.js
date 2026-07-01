import api from '../utils/api';

export const sendAssistantMessage = async ({ transcript, conversation = [], confirmed = false }) => {
  const response = await api.post('/ai/assistant', { transcript, conversation, confirmed });
  return response.data.data;
};
