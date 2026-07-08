import gsap from 'gsap';

// No lag smoothing: if the tab loses focus and the browser throttles rAF, GSAP
// catches up on return instead of freezing mid-animation.
gsap.ticker.lagSmoothing(0);

export { gsap };
