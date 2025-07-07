import inherits from 'inherits';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

function getLabel(element) {
  const bo = element.businessObject;
  return bo && bo.name ? bo.name : '';
}

export default function PPINOTLabelProvider(eventBus, modeling) {
  CommandInterceptor.call(this, eventBus);
  
  eventBus.on('directEditing.activate', function(event) {
    console.log('Direct editing activated with event:', event);
    
    // Intenta obtener el elemento de diferentes ubicaciones posibles en el evento
    let element = null;
    
    if (event.active && event.active.element) {
      // Si el elemento está en event.active.element
      element = event.active.element;
      console.log('Found element in event.active.element:', element.id);
    } else if (event.context && event.context.element) {
      // Si el elemento está en event.context.element
      element = event.context.element;
      console.log('Found element in event.context.element:', element.id);
    } else if (event.element) {
      // Si el elemento está directamente en el evento
      element = event.element;
      console.log('Found element directly in event:', element.id);
    }
    
    if (!element) {
      console.warn('PPINOTLabelProvider: No element found in event:', event);
      return;
    }
    
    // Asegúrate de que event.context exista
    if (!event.context) {
      event.context = {};
    }
    
    // Establece el elemento en el contexto
    event.context.element = element;
    
    // Obtén y establece el texto de la etiqueta
    const text = getLabel(element);
    console.log('Setting label text for element:', element.id, 'Text:', text);
    event.context.text = text;
  });
  
  // Escucha cuando se completa la edición directa para actualizar el modelo
  eventBus.on('directEditing.complete', function(event) {
    if (event.context && event.context.element) {
      const element = event.context.element;
      const text = event.text;
      console.log('Updating label for element:', element.id, 'New text:', text);
      modeling.updateLabel(element, text);
      
      // Forzar actualización visual
      eventBus.fire('element.changed', { element: element });
    }
  });
}

inherits(PPINOTLabelProvider, CommandInterceptor);

PPINOTLabelProvider.$inject = [
  'eventBus',
  'modeling'
];
