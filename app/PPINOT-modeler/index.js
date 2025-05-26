import Modeler from 'bpmn-js/lib/Modeler';
import { assign, isArray, isObject } from 'min-dash';
import inherits from 'inherits';
import { isPPINOTConnection } from './PPINOT/Types';
import PPINOTModule from './PPINOT';
import { isLabelExternal, getExternalLabelBounds, getLabel } from './PPINOT/utils/CompatibilityUtil';

class PPINOTModeler extends Modeler {
  constructor(options) {
    super(options);
    this._PPINOTElements = [];
    this._idMap = [];
    this.modelOpen = false;
  }

  _addPPINOTShape(PPINOTElement) {
    this._PPINOTElements.push(PPINOTElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const PPINOTAttrs = assign({ businessObject: PPINOTElement }, PPINOTElement);
    const PPINOTShape = elementFactory.create('shape', PPINOTAttrs);

    if (isLabelExternal(PPINOTElement) && getLabel(PPINOTShape)) {
      this.addLabel(PPINOTElement, PPINOTShape);
    }

    return canvas.addShape(PPINOTShape);
  }

  setColors(idAndColorList) {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');

    idAndColorList.forEach(obj => {
      let element;
      obj.ids.forEach(id => {
        if (this._idMap[id]) {
          element = this._idMap[id].map(i => elementRegistry.get(i));
        } else if (elementRegistry.get(id).type === 'bpmn:Task') {
          element = elementRegistry.get(id);
        }
      });

      if (element != null) {
        modeling.setColor(element, {
          stroke: obj.fillColor !== '#ffffff' ? obj.fillColor : 'green',
          fill: '#fff'
        });
      }
    });
  }

  setModelOpen(bool) {
    this.modelOpen = bool;
  }

  isModelOpen() {
    return this.modelOpen;
  }

  _addPPINOTConnection(PPINOTElement) {
    this._PPINOTElements.push(PPINOTElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const elementRegistry = this.get('elementRegistry');
    const PPINOTAttrs = assign({ businessObject: PPINOTElement }, PPINOTElement);
    const connection = elementFactory.create('connection', assign(PPINOTAttrs, {
      source: elementRegistry.get(PPINOTElement.source),
      target: elementRegistry.get(PPINOTElement.target)
    }), elementRegistry.get(PPINOTElement.source).parent);

    if (isLabelExternal(PPINOTElement) && getLabel(connection)) {
      this.addLabel(PPINOTElement, connection);
    }

    return canvas.addConnection(connection);
  }

  addPPINOTElements(PPINOTElements) {
    if (!isObject(PPINOTElements)) throw new Error('argument must be an object');
    if (!isArray(PPINOTElements.diagram)) throw new Error('missing diagram');

    const shapes = [];
    const connections = [];
    this._idMap = PPINOTElements.idMap;

    PPINOTElements.diagram.forEach(PPINOTElement => {
      if (isPPINOTConnection(PPINOTElement)) {
        connections.push(PPINOTElement);
      } else {
        shapes.push(PPINOTElement);
      }
    });

    shapes.forEach(this._addPPINOTShape, this);
    connections.forEach(this._addPPINOTConnection, this);
  }

  addLabel(semantic, element) {
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const textRenderer = this.get('textRenderer');
    let bounds = getExternalLabelBounds(semantic, element);
    const text = getLabel(element);

    if (text) {
      bounds = textRenderer.getExternalLabelBounds(bounds, text);
    }

    const label = elementFactory.createLabel(elementData(semantic, {
      id: `${semantic.id}_label`,
      labelTarget: element,
      type: 'label',
      hidden: element.hidden || !getLabel(element),
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height)
    }));

    return canvas.addShape(label, element.parent);
  }

  getPPINOTElements() {
    return this._PPINOTElements;
  }

  clear() {
    this._PPINOTElements = [];
    super.clear();
  }

  getJson() {
    let obj = {
      consequences: [],
      consequencesTimed: [],
      timeDistances: [],
      timeInstances: [],
      taskDurations: [],
      resources: [],
      roles: [],
      groups: [],
      timeSlots: [],
      timeConnections: []
    };

    obj = this._PPINOTElements.reduce((res, item) => {
      if (isPPINOTConnection(item)) {
        if (item.source.includes('TimeSlot') || item.target.includes('TimeSlot')) {
          res.timeConnections.push(item);
        } else if (item.type === 'PPINOT:ResourceArc') {
          res = insertResourceArcData(res, item);
        } else {
          res.consequences.push(createConsequence(item));
        }
      } else {
        if (item.type === 'PPINOT:TimeSlot') {
          res.timeSlots.push(item);
        } else if (item.type.includes('PPINOT:Resource')) {
          res.resources.push(createRRG(item, 'Resource'));
        } else if (item.type.includes('PPINOT:Role')) {
          res.roles.push(createRRG(item, 'Role'));
        } else if (item.type.includes('PPINOT:Group')) {
          res.groups.push(createRRG(item, 'Group'));
        } else if (item.type === 'PPINOT:Clock') {
          res.timeInstances.push(createTimeInstance(item));
        }
      }
      return res;
    }, obj);

    let idMap = {};
    let elements = obj.timeSlots.reduce((res, obj) => {
      res[obj.id] = {
        occurrences: 0,
        timeSlot: obj,
        connections: []
      };
      return res;
    }, {});

    for (let i = 0; i < obj.timeConnections.length; i++) {
      let id = obj.timeConnections[i].source.includes('TimeSlot') ? obj.timeConnections[i].source : obj.timeConnections[i].target;
      elements[id].occurrences += 1;
      elements[id].connections.push(obj.timeConnections[i]);
    }

    let counter = 1;
    Object.values(elements).forEach(item => {
      if (item.occurrences === 0) {
        // window.alert("TimeSlot without connections")
      } else if (item.occurrences === 1) {
        if (item.connections[0].type === 'PPINOT:ResourceArc') {
          let taskDuration = createTaskDuration(item, item.timeSlot.text);
          idMap[taskDuration.id] = [item.timeSlot.id, item.connections[0].id];
          taskDuration.elements = [item.timeSlot.id, item.connections[0].id];
          obj.taskDurations.push(taskDuration);
        } else {
          console.error('TimeSlot with wrong connection');
        }
      } else if (item.occurrences > 2) {
        console.error('TimeSlot with too many connections');
      } else {
        let constraint;
        if (item.connections[0].type === 'PPINOT:ResourceArc' && item.connections[1].type === 'PPINOT:ConsequenceFlow') {
          constraint = createConsequenceTimed({
            id: `ConsequenceTimedFlow_${counter}`,
            source: item.connections[0].source,
            target: item.connections[1].target
          }, item.timeSlot.text);

          obj.consequencesTimed.push(constraint);
        } else if (item.connections[1].type === 'PPINOT:ResourceArc' && item.connections[0].type === 'PPINOT:ConsequenceFlow') {
          constraint = createConsequenceTimed({
            id: `ConsequenceTimedFlow_${counter}`,
            source: item.connections[1].source,
            target: item.connections[0].target
          }, item.timeSlot.text);

          obj.consequencesTimed.push(constraint);
        } else if (item.connections[0].type === 'PPINOT:TimeDistanceArcStart' && item.connections[1].type === 'PPINOT:TimeDistanceArcEnd') {
          constraint = createTimeDistance({
            id: `TimeDistance_${counter}`,
            source: item.connections[0].source,
            target: item.connections[1].target
          }, item.timeSlot.text);

          obj.timeDistances.push(constraint);
        } else if (item.connections[1].type === 'PPINOT:TimeDistanceArcStart' && item.connections[0].type === 'PPINOT:TimeDistanceArcEnd') {
          constraint = createTimeDistance({
            id: `TimeDistance_${counter}`,
            source: item.connections[1].source,
            target: item.connections[0].target
          }, item.timeSlot.text);

          obj.timeDistances.push(constraint);
        }

        idMap[constraint.id] = [item.timeSlot.id, ...item.connections.map(obj => obj.id)];
        counter++;
      }
    });

    delete obj.timeSlots;
    delete obj.timeConnections;

    console.log(this._PPINOTElements);
    console.log({
      definitions: obj,
      diagram: this._PPINOTElements,
      idMap: idMap
    });

    return {
      definitions: obj,
      diagram: this._PPINOTElements,
      idMap: idMap
    };
  }
}

inherits(PPINOTModeler, Modeler);

PPINOTModeler.prototype._modules = [].concat(
  PPINOTModeler.prototype._modules,
  [PPINOTModule]
);

function elementData(semantic, attrs) {
  return assign({
    id: semantic.id,
    type: semantic.$type,
    businessObject: semantic
  }, attrs);
}

function parseTime2(time) {
  let array = time.split(',').map(line => {
    line = line.trim();
    let ineq = line.substring(0, line.search(/[ |\d]/));
  });
}

function getSide(text) {
  if (text === 'S') return 'Start';
  else if (text === 'E') return 'End';
  else return text;
}

function parseTime(text, bool) {
  if (text == null) return null;

  let reg = '(<|<=|>|>=|==|!=)[ ]*([0-9]+)[ ]*(.*)';
  if (bool) reg = '(NF|Not Forced|F|Forced)?[ ]*(Start|S|End|E)?(-(Start|S|End|E))?[ ]*' + reg;
  let obj = text.match(new RegExp(reg));
  console.log(obj);
  return {
    forced: !(obj[1] != null && (obj[1] === 'NF' || obj[1] === 'Not Forced')),
    sourceSide: getSide(obj[2]) || 'End',
    targetSide: getSide(obj[4]) || 'End',
    ineq: obj[5],
    time: obj[6],
    timeUnit: obj[7]
  };
}

function createConsequence(item) {
  return {
    id: item.id,
    type: 'Consequence',
    sourceSide: 'End',
    targetSide: 'Start',
    source: item.source,
    target: item.target
  };
}

function createConsequenceTimed(item, timeString) {
  let obj = parseTime(timeString, true);
  if (obj == null) return null;
  return Object.assign(createConsequence(item), {
    forced: obj.forced,
    timeData: {
      time: obj.time,
      timeUnit: obj.timeUnit
    },
    ineq: obj.ineq,
    sourceSide: obj.sourceSide,
    targetSide: obj.targetSide
  });
}

function createTimeDistance(item, timeString) {
  let obj = parseTime(timeString, true);
  if (obj == null) return null;
  return {
    id: item.id,
    type: 'TimeDistance',
    sourceSide: obj.sourceSide,
    targetSide: obj.targetSide,
    source: item.source,
    target: item.target,
    timeData: {
      time: obj.time,
      timeUnit: obj.timeUnit
    },
    ineq: obj.ineq
  };
}

function createTaskDuration(item, timeString) {
  let obj = parseTime(timeString, false);
  if (obj == null) return null;
  return {
    id: item.id,
    type: 'TaskDuration',
    task: item.connections[0].source.includes('TimeSlot') ? item.connections[0].target : item.connections[0].source,
    timeData: {
      time: obj.time,
      timeUnit: obj.timeUnit
    },
    ineq: obj.ineq
  };
}

function getResType(item) {
  if (item.type.includes('Absence')) return 'Absence';
  else {
    if (item.text) return 'Instance';
    else return 'Occurrence';
  }
}

function createRRG(item, type) {
  return {
    id: item.id,
    type: type,
    name: item.text,
    transitions: [],
    resType: getResType(item)
  };
}

function createTimeInstance(item) {
  let obj = item.text.match(new RegExp('(Start|End)?[ ]*(Before|After)[ ]*(.*)'));
  console.log(obj);

  return {
    id: item.id,
    type: 'TimeInstance',
    task: null,
    side: obj[2] === 'Before' ? 'Start' : 'End',
    transitionSide: obj[1] || 'End',
    timestamp: obj[3]
  };
}

function changeListRRG(list, source, target) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === source) list[i].transitions.push(target);
  }
  return list;
}

function insertResourceArcData(obj, connection) {
  let source, target;
  if (!connection.source.includes('Task')) {
    source = connection.source;
    target = connection.target;
  } else {
    source = connection.target;
    target = connection.source;
  }

  if (source.includes('Resource')) obj.resources = changeListRRG(obj.resources, source, target);
  else if (source.includes('Role')) obj.roles = changeListRRG(obj.roles, source, target);
  else if (source.includes('Group')) obj.groups = changeListRRG(obj.groups, source, target);
  else if (source.includes('Clock')) {
    for (let i = 0; i < obj.timeInstances.length; i++) {
      if (obj.timeInstances[i].id === source) {
        if (obj.timeInstances[i].task) console.error('Multiple arcs to a clock. Not implemented.');
        else obj.timeInstances[i].task = target;
      }
    }
  }

  return obj;
}

export default PPINOTModeler;