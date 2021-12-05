import {Attribute} from '../util/attribute.js';
import {RENDERING_CONFIG} from '../config.js';

let changeCallback;

function addOptions(el, options) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }

  for (const i in options) {
    const option = options[i];
    const optionEl = document.createElement('option');
    optionEl.value = i;
    optionEl.innerHTML = option;
    el.appendChild(optionEl);
  }
}

export function handleSelectAttributeClassChange(e, classIndex) {
  e.target.changeCallback();
}

/** Programmatically creates option elements for the attribute selector. */
export function setSelectAttributes() {
  if (RENDERING_CONFIG.renderMultivariateDensityPlot) {
    const multivariateEl = document.querySelector('.controls-multivariate');
    multivariateEl.classList.remove('hide');
  }

  const selectEl = document.querySelector('.selector-attribute');

  // Clear any existing options.
  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  for (const attribute of Object.keys(Attribute)) {
    const optionEl = document.createElement('option');
    optionEl.value = Attribute[attribute];
    optionEl.innerHTML = attribute;
    selectEl.appendChild(optionEl);
  }
}

export function updateAttributeClasses(attributeClasses, callback) {
  setSelectAttributes();

  const selectEl1 = document.querySelector('.select-attribute-class-1');
  const selectEl2 = document.querySelector('.select-attribute-class-2');

  addOptions(selectEl1, attributeClasses);
  addOptions(selectEl2, attributeClasses);

  selectEl1.value = 0;
  selectEl2.value = 1;

  changeCallback = function() {
    const index1 = parseInt(selectEl1.value);
    const index2 = parseInt(selectEl2.value);
    callback([attributeClasses[index1], attributeClasses[index2]]);
  }

  selectEl1.changeCallback = changeCallback;
  selectEl2.changeCallback = changeCallback;
}
