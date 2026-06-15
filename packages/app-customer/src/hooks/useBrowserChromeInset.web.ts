import { useEffect, useState } from 'react';
import { useIsStandalonePwa } from './useIsStandalonePwa';

/** Altura da barra inferior do Safari quando visível (visualViewport). */
export function useBrowserChromeInset(): number {
    const isStandalone = useIsStandalonePwa();
    const [inset, setInset] = useState(0);

    useEffect(() => {
        if (isStandalone || typeof window === 'undefined' || !window.visualViewport) {
            setInset(0);
            return;
        }

        const update = () => {
            const vv = window.visualViewport;
            if (!vv) return;
            const hidden = window.innerHeight - vv.height - vv.offsetTop;
            const measured = Math.max(0, Math.round(hidden));
            setInset(Math.min(measured, 52));
        };

        update();
        window.visualViewport.addEventListener('resize', update);
        window.visualViewport.addEventListener('scroll', update);
        return () => {
            window.visualViewport?.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('scroll', update);
        };
    }, [isStandalone]);

    return inset;
}
