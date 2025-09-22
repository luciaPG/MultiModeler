/**
 * Mock para tiny-svg
 * Proporciona implementaciones básicas de las funciones de tiny-svg para tests
 */

// Funciones principales de tiny-svg
export const append = (parent, child) => {
  if (parent && parent.appendChild && child) {
    parent.appendChild(child);
  }
  return child;
};

export const attr = (element, name, value) => {
  if (!element) return null;
  
  if (value === undefined) {
    // Getter
    return element.getAttribute ? element.getAttribute(name) : null;
  } else {
    // Setter
    if (element.setAttribute) {
      element.setAttribute(name, value);
    }
    return element;
  }
};

export const classes = (element) => {
  if (!element || !element.classList) {
    return {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {}
    };
  }
  
  return {
    add: (className) => element.classList.add(className),
    remove: (className) => element.classList.remove(className),
    contains: (className) => element.classList.contains(className),
    toggle: (className) => element.classList.toggle(className)
  };
};

export const create = (tagName) => {
  if (typeof document !== 'undefined') {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  }
  
  // Mock básico para entornos sin DOM
  return {
    tagName: tagName,
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {}
    }
  };
};

export const remove = (element) => {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
  return element;
};

export const replace = (oldElement, newElement) => {
  if (oldElement && oldElement.parentNode && newElement) {
    oldElement.parentNode.replaceChild(newElement, oldElement);
  }
  return newElement;
};

// Mock del objeto completo para compatibilidad
const tinySvg = {
  append,
  attr,
  classes,
  create,
  remove,
  replace
};

export default tinySvg;