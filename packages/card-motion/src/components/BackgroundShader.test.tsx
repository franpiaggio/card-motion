import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BackgroundShader } from './BackgroundShader';

// jsdom has no WebGL, so getContext('webgl') returns null and the effect bails.
// The component must still render its canvas without throwing.
describe('BackgroundShader', () => {
  it('renders a canvas and degrades gracefully with no WebGL context', () => {
    const { container } = render(<BackgroundShader colors={{ warm: '#fff' }} />);
    expect(container.querySelector('canvas.cm-bg-shader')).not.toBeNull();
  });

  it('passes through a custom className', () => {
    const { container } = render(<BackgroundShader className="bg" />);
    expect(container.querySelector('canvas.cm-bg-shader.bg')).not.toBeNull();
  });
});
