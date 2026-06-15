import { useEffect } from 'react';
import { useIsStandalonePwa } from '../hooks/useIsStandalonePwa';

function isIosSafariBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return isIOS && isSafari;
}

/** Encoraja o Safari a recolher a barra inferior ao rolar. */
export function SafariWebUi() {
    const isStandalone = useIsStandalonePwa();

    useEffect(() => {
        if (isStandalone || !isIosSafariBrowser()) return;

        document.documentElement.classList.add('dunnaa-safari-browser');

        const nudge = () => {
            if (window.scrollY < 2) {
                window.scrollTo(0, 1);
            }
        };

        const onTouchStart = () => {
            nudge();
        };

        window.addEventListener('load', nudge);
        document.addEventListener('touchstart', onTouchStart, { passive: true });

        return () => {
            document.documentElement.classList.remove('dunnaa-safari-browser');
            window.removeEventListener('load', nudge);
            document.removeEventListener('touchstart', onTouchStart);
        };
    }, [isStandalone]);

    return null;
}
