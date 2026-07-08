import { useGSAP } from '@gsap/react';
import { gsap } from '../core/gsap';

// A single place to register GSAP's React-side effects for the whole library.
gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
