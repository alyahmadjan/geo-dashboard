export function createToggleControls(root, callbacks = {}) {
  const state = {
    showOffices: true,
    showSales: true,
    showSubjects: true,
  };

  function render() {
    root.innerHTML = `
      <div class="toggle-group">
        <label class="toggle-label">
          <input type="checkbox" class="toggle-checkbox" data-toggle="offices" ${state.showOffices ? 'checked' : ''}>
          <span>Offices</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" class="toggle-checkbox" data-toggle="sales" ${state.showSales ? 'checked' : ''}>
          <span>Sales</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" class="toggle-checkbox" data-toggle="subjects" ${state.showSubjects ? 'checked' : ''}>
          <span>Subjects</span>
        </label>
      </div>
    `;

    const checkboxes = root.querySelectorAll('.toggle-checkbox');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const toggle = e.target.dataset.toggle;
        const value = e.target.checked;
        
        if (toggle === 'offices') {
          state.showOffices = value;
          callbacks.onToggleOffices?.(value);
        } else if (toggle === 'sales') {
          state.showSales = value;
          callbacks.onToggleSales?.(value);
        } else if (toggle === 'subjects') {
          state.showSubjects = value;
          callbacks.onToggleSubjects?.(value);
        }
      });
    });
  }

  function getState() {
    return { ...state };
  }

  function setState(newState) {
    Object.assign(state, newState);
    render();
  }

  function reset() {
    state.showOffices = true;
    state.showSales = true;
    state.showSubjects = true;
    render();
  }

  render();

  return {
    getState,
    setState,
    reset,
  };
}
