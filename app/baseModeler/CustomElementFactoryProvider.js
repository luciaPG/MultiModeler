// baseModeler/CustomElementFactoryProvider.js
// Permite seleccionar dinámicamente el ElementFactory a usar (PPINOT, RALPH, etc)
// Puedes pasar el tipo de modelador como opción al inicializar el modelador

import PPINOTElementFactory from '../PPINOT-modeler/PPINOT/PPINOTElementFactory';
// import RALPHElementFactory from '../RALPH-modeler/RALPH/RALPHElementFactory'; // Descomenta si tienes otro factory

// Recibe un string o función para decidir el factory
export default function CustomElementFactoryProvider(type = 'PPINOT') {
  let factory;
  switch (type) {
    case 'PPINOT':
      factory = PPINOTElementFactory;
      break;
    // case 'RALPH':
    //   factory = RALPHElementFactory;
    //   break;
    default:
      factory = PPINOTElementFactory;
  }

  return {
    __init__: ['elementFactory'],
    elementFactory: ['type', factory]
  };
}

// Uso en la inicialización del modelador:
// import CustomElementFactoryProvider from './baseModeler/CustomElementFactoryProvider';
// const modeler = new Modeler({
//   ...,
//   additionalModules: [
//     CustomElementFactoryProvider('PPINOT'),
//     ...otrosModulos
//   ]
// });
