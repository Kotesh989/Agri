const kannadaNumberMap = {
  ಒಂದು: 1,
  ಎರಡು: 2,
  ಮೂರು: 3,
  ನಾಲ್ಕು: 4,
  ಐದು: 5,
  ಆರು: 6,
  ಏಳು: 7,
  ಎಂಟು: 8,
  ಒಂಬತ್ತು: 9,
  ಹತ್ತು: 10,
  ಇಪ್ಪತ್ತು: 20,
  ಇಪ್ಪತ್ತೈದು: 25,
  ಐವತ್ತು: 50,
  ನೂರು: 100,
};

const normalizeNumberWords = (text) => Object.entries(kannadaNumberMap).reduce(
  (current, [word, value]) => current.replace(new RegExp(word, 'g'), String(value)),
  String(text || '')
);

export const normalizeKannadaNumbers = (text) => {
  const normalized = normalizeNumberWords(text);
  return normalized.replace(/\b(ಒಂದು|ಎರಡು|ಮೂರು|ನಾಲ್ಕು|ಐದು|ಆರು|ಏಳು|ಎಂಟು|ಒಂಬತ್ತು|ಹತ್ತು|ಇಪ್ಪತ್ತು|ಇಪ್ಪತ್ತೈದು|ಐವತ್ತು|ನೂರು)\b/gi, (match) => {
    const key = match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    return String(kannadaNumberMap[key] || match);
  });
};
