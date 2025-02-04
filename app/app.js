import $ from 'jquery';
import PPINOTModeler from './PPINOT-modeler';
import BpmnModdle from 'bpmn-moddle';

const moddle = new BpmnModdle();
const container = $('#js-drop-zone');
const body = $('body');

const modeler = new PPINOTModeler({
  container: '#js-canvas',
  keyboard: {
    bindTo: document
  }
});

const createNewDiagram = async () => {
  try {
    await modeler.clear();
    await modeler.createDiagram();

    container
      .removeClass('with-error')
      .addClass('with-diagram');

    modeler.setModelOpen(true);
    body.addClass('shown');
  } catch (err) {
    container
      .removeClass('with-diagram')
      .addClass('with-error');

    modeler.setModelOpen(false);
    container.find('.error pre').text(err.message);
  }
};

const openDiagram = async (xml, cbpmn) => {
  try {
    await modeler.clear();
    await modeler.importXML(xml);

    container
      .removeClass('with-error')
      .addClass('with-diagram');

    if (cbpmn) {
      modeler.addPPINOTElements(cbpmn);
    }

    modeler.setModelOpen(true);
    body.addClass('shown');
  } catch (err) {
    container
      .removeClass('with-diagram')
      .addClass('with-error');

    modeler.setModelOpen(false);
    container.find('.error pre').text(err.message);
  }
};

const saveSVG = (done) => {
  modeler.saveSVG(done);
};

const fixTaskData = (task) => {
  if (task.dataInputAssociations || task.dataOutputAssociations) {
    const ioSpecification = moddle.create('bpmn:InputOutputSpecification', { id: `io_${task.get('id')}` });
    if (task.dataInputAssociations) {
      task.dataInputAssociations.forEach((obj) => {
        const dataInput = moddle.create('bpmn:DataInput', { id: `input_${obj.get('id')}` });
        ioSpecification.get('dataInputs').push(dataInput);
        obj.set('targetRef', dataInput);
        if (!obj.get('name')) obj.set('name', '');
      });
    }
    if (task.dataOutputAssociations) {
      task.dataOutputAssociations.forEach((obj) => {
        const dataOutput = moddle.create('bpmn:DataOutput', { id: `output_${obj.get('id')}` });
        ioSpecification.get('dataOutputs').push(dataOutput);
        obj.set('sourceRef', [dataOutput]);
        if (!obj.get('name')) obj.set('name', '');
      });
    }
    task.set('ioSpecification', ioSpecification);
  }
  if (!task.get('name')) task.set('name', '');
  return task;
};

const saveDiagram = (done) => {
  modeler.saveXML({ format: true }, (err, xml) => {
    moddle.fromXML(xml, (err, def) => {
      def.getPPINOTElements();
      def.get('rootElements').forEach((obj) => {
        if (obj.$type.includes('Process')) {
          obj.get('flowElements').forEach((el) => {
            if (el.$type.includes('Task')) {
              fixTaskData(el);
            } else if (el.$type === 'bpmn:DataObjectReference') {
              if (!el.get('name')) el.set('name', '');
            }
          });
        }
      });
      moddle.toXML(def, { format: true }, (err, res) => {
        done(err, res, modeler.getPPINOTElements());
      });
    });
    done(err, xml);
  });
};

const handleFiles = (files, callback) => {
  let bpmn, cbpmnFile;
  if (files[0].name.includes('.bpmn')) {
    bpmn = files[0];
    if (files[1] && files[1].name.includes('.cbpmn')) cbpmnFile = files[1];
    else if (files[1]) window.alert('second file is not a cbpmn file');
  } else if (files[1] && files[1].name.includes('.bpmn')) {
    bpmn = files[1];
    if (files[0] && files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
    else if (files[0]) window.alert('second file is not a cbpmn file');
  } else if (files[0].name.includes('.cbpmn')) cbpmnFile = files[0];

  const reader = new FileReader();

  if (bpmn) {
    reader.onload = (e) => {
      const xml = e.target.result;
      const reader1 = new FileReader();

      if (cbpmnFile) {
        reader1.onload = (e) => {
          const cbpmn = JSON.parse(e.target.result);
          callback(xml, cbpmn);
        };

        reader1.readAsText(cbpmnFile);
      } else callback(xml, null);
    };

    reader.readAsText(bpmn);
  } else if (cbpmnFile && modeler.isModelOpen()) {
    reader.onload = (e) => {
      const cbpmn = JSON.parse(e.target.result);
      modeler.addPPINOTElements(cbpmn);
    };

    reader.readAsText(cbpmnFile);
  }
};

const registerFileDrop = (container, callback) => {
  const handleFileSelect = (e) => {
    e.stopPropagation();
    e.preventDefault();

    const files = e.dataTransfer.files;
    handleFiles(files, callback);
  };

  const handleDragOver = (e) => {
    e.stopPropagation();
    e.preventDefault();

    e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  };

  container.get(0).addEventListener('dragover', handleDragOver, false);
  container.get(0).addEventListener('drop', handleFileSelect, false);
};

// file drag / drop ///////////////////////

// check file api availability
if (!window.FileList || !window.FileReader) {
  window.alert(
    'Looks like you use an older browser that does not support drag and drop. ' +
    'Try using Chrome, Firefox or the Internet Explorer > 10.'
  );
} else {
  registerFileDrop(container, openDiagram);
}

// bootstrap diagram functions
$(() => {
  $('#js-open-diagram').click((e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.click();
    input.addEventListener('input', (evt) => {
      handleFiles(evt.target.files, openDiagram);
    });
  });

  $('.js-create-diagram').click((e) => {
    e.stopPropagation();
    e.preventDefault();

    createNewDiagram();
  });

  const downloadLink = $('#js-download-diagram');
  const downloadSvgLink = $('#js-download-svg');

  $('#js-add-colors').click((e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.click();
    input.addEventListener('input', (evt) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        modeler.setColors(JSON.parse(e.target.result));
      };

      reader.readAsText(evt.target.files[0]);
    });
  });

  $('.buttons a').click((e) => {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const setEncoded = (link, name, data) => {
    const encodedData = encodeURIComponent(data);
    if (data) {
      link.addClass('active').attr({
        href: `data:application/bpmn20-xml;charset=UTF-8,${encodedData}`,
        download: name
      });
    } else {
      link.removeClass('active');
    }
  };

  const setMultipleEncoded = (link, name, data) => {
    if (data) {
      window.localStorage.setItem('diagram', encodeURIComponent(data[0]));
      window.localStorage.setItem('PPINOT', encodeURIComponent(JSON.stringify(data[1])));
    } else {
      link.removeClass('active');
    }
  };

  const exportArtifacts = debounce(() => {
    saveSVG((err, svg) => {
      setEncoded(downloadSvgLink, 'diagram.svg', err ? null : svg);
    });

    saveDiagram((err, xml) => {
      const cbpmn = modeler.getJson();
      setMultipleEncoded(downloadLink, 'diagram.bpmn', err ? null : [xml, cbpmn]);
    });
  }, 500);

  modeler.on('commandStack.changed', exportArtifacts);
});

// helpers //////////////////////

const debounce = (fn, timeout) => {
  let timer;

  return () => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(fn, timeout);
  };
};