export const speak = (text: string, langCode: string = "en") => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // langCode is already the ISO code (e.g., 'en', 'de', 'fr')
    utterance.lang = langCode;
    utterance.rate = 0.85;
    window.speechSynthesis.cancel(); // Stop any current speech
    window.speechSynthesis.speak(utterance);
};
