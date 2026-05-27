export const errorResponse = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

export const validationError = (res, message, errors = []) =>
  errorResponse(res, 400, message, errors);
