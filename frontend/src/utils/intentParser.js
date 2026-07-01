export const formatIntent = (intent) => String(intent || 'UNKNOWN').replace(/_/g, ' ');

export const isConfirmationRequired = (assistantResult) => Boolean(assistantResult?.confirmationRequired);
