import { assign } from 'min-dash';

export class RalphNotation {
  /**
   * Dimensiones por defecto de cada tipo RALph
   */
  static getElementSize(type) {
    const shapes = {
      __default: { width: 100, height: 80 },
      'RALph:Person': { width: 58, height: 75 },
      'RALph:RoleRALph': { width: 58, height: 81 },
      'RALph:Personcap': { width: 60, height: 75 },
      'RALph:Orgunit': { width: 79, height: 56 },
      'RALph:Position': { width: 58, height: 75 },
      'RALph:History-Same': { width: 36, height: 45 },
      'RALph:History-Any': { width: 54, height: 60 },
      'RALph:History-Any-Red': { width: 104, height: 110 },
      'RALph:History-Any-Green': { width: 104, height: 110 },
      'RALph:History-Same-Red': { width: 100, height: 109 },
      'RALph:History-Same-Green': { width: 100, height: 109 },
      'RALph:Complex-Assignment-AND': { width: 96, height: 100 },
      'RALph:Complex-Assignment-OR': { width: 96, height: 100 },
      'RALph:reportsDirectly': { width: 126, height: 232 },
      'RALph:reportsTransitively': { width: 126, height: 232 },
      'RALph:delegatesDirectly': { width: 126, height: 232 },
      'RALph:delegatesTransitively': { width: 126, height: 232 },
      'RALph:History-AnyInstanceInTime-Green': { width: 120, height: 120 },
      'RALph:History-AnyInstanceInTime-Red': { width: 120, height: 120 }
    };

    return shapes[type] || shapes.__default;
  }

  /**
   * Crea el businessObject de un elemento RALph
   */
  static createRALphBO(elementType, attrs, moddle) {
    const businessObject = moddle.create(elementType, attrs);

    if (!businessObject.$type) {
      businessObject.$type = elementType;
    }

    if (!businessObject.id) {
      const prefix = elementType.replace('RALph:', '') + '_';
      businessObject.id = moddle.ids.nextPrefixed(prefix, businessObject);
    }

    return businessObject;
  }
}
