import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// A single place to register GSAP's side effects for the whole library.
gsap.registerPlugin(useGSAP);
// No lag smoothing: if the tab loses focus and the browser throttles rAF, GSAP
// catches up on return instead of freezing mid-animation.
gsap.ticker.lagSmoothing(0);

export { gsap, useGSAP };
