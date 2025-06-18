export default function RALPHRules(eventBus) {
  eventBus.on('shape.create', function(event) {
    const { shape } = event;
    
    // Regla: Un recurso debe estar conectado a un tipo de recurso
    if (shape.type === 'ralph:Resource') {
      // Implementar lógica de validación
    }
  });

  eventBus.on('connection.create', function(event) {
    const { connection } = event;
    
    // Regla: Solo permitir conexiones entre recursos y tipos de recursos
    if (connection.source.type === 'ralph:Resource' && 
        connection.target.type !== 'ralph:ResourceType') {
      event.preventDefault();
    }
  });

  eventBus.on('element.move', function(event) {
    const { element } = event;
    
    // Regla: No permitir mover un pool de recursos dentro de otro pool
    if (element.type === 'ralph:ResourcePool') {
      // Implementar lógica de validación
    }
  });
}

RALPHRules.$inject = ['eventBus']; 