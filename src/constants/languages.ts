export const LANGUAGES = [
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'fa', name: 'Persian', flag: '🇮🇷'}
];

export const LANG_MAP: Record<string, { name: string; flag: string }> = LANGUAGES.reduce((acc, lang) => {
    acc[lang.code] = { name: lang.name, flag: lang.flag };
    return acc;
}, {} as Record<string, { name: string; flag: string }>);
