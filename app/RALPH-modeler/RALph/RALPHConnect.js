import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHConnect(connect, modeling) {
  this._connect = connect;
  this._modeling = modeling;
}

RALPHConnect.$inject = ['connect', 'modeling'];

RALPHConnect.prototype.canConnect = function(source, target) {
  // Solo permitir conexiones entre recursos y tipos de recursos
  if (is(source, 'ralph:Resource') && is(target, 'ralph:ResourceType')) {
    return true;
  }

  // Solo permitir conexiones entre recursos y pools
  if (is(source, 'ralph:Resource') && is(target, 'ralph:ResourcePool')) {
    return true;
  }

  return false;
};

RALPHConnect.prototype.connect = function(source, target) {
  if (this.canConnect(source, target)) {
    const connection = this._connect.createConnection(source, target);
    this._modeling.createConnection(connection, source, target);
    return connection;
  }
  return null;
}; 