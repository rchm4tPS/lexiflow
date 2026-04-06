/**
 * Opens a small popup window for external resources (dictionaries, translators, etc.)
 */
export const openSmallWindow = (url: string) => {
    const features = "width=800,height=600,left=150,top=150,resizable=yes,scrollbars=yes";
    window.open(url, '_blank', features);
};
