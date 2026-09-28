/**
 * Determines whether a language does not use spaces between words (CJK languages except Korean).
 * 
 * Japanese (ja) and Chinese variants (zh, cn, hk, zh-t, zh-cn, zh-tw, etc.) do not use spaces.
 * Korean (ko) retains spaces between words in orthography.
 * All other languages use spaces between words.
 */
export const isNoSpaceLanguage = (languageCode?: string): boolean => {
  if (!languageCode) return false;
  const lang = languageCode.toLowerCase().trim();
  if (lang === 'ja' || lang === 'zh' || lang === 'cn' || lang === 'hk' || (lang.startsWith('zh-') && lang !== 'zh-ko')) {
    return true;
  }
  return false;
};
