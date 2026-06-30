import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Registro único de side-effects de GSAP para toda la librería.
gsap.registerPlugin(useGSAP);
// Sin lagSmoothing: si la pestaña pierde foco y el navegador frena rAF,
// GSAP se pone al día al volver en lugar de congelarse a mitad de animación.
gsap.ticker.lagSmoothing(0);

export { gsap, useGSAP };
