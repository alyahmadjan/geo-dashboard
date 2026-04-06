export function createLayerControls(root, callbacks = {}) {
  const buttons = Array.from(root.querySelectorAll('[data-layer]'));

  function setActive(layer) {
    buttons.forEach((button) => {
      button.classList.toggle('active', button.dataset.layer === layer);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const layer = button.dataset.layer;
      setActive(layer);
      callbacks.onLayerChange?.(layer);
    });
  });

  const resetButton = document.getElementById('resetBtn');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      callbacks.onReset?.();
      setActive(callbacks.defaultLayer || 'city');
    });
  }

  setActive(callbacks.defaultLayer || 'city');

  return { setActive };
}
