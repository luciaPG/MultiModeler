export default function RALPHRules(eventBus) {
  eventBus.on('shape.create', function(event) {
    const { shape } = event;
    
    if (shape.type === 'ralph:Resource') {
      // TODO: Validación de conexión de recurso
    }
  });

  eventBus.on('connection.create', function(event) {
    const { connection } = event;
    
    if (connection.source.type === 'ralph:Resource' && 
        connection.target.type !== 'ralph:ResourceType') {
      event.preventDefault();
    }
  });

  eventBus.on('element.move', function(event) {
    const { element } = event;
    
    if (element.type === 'ralph:ResourcePool') {
      // TODO: Validación de movimiento de pool
    }
  });
}

RALPHRules.$inject = ['eventBus']; 