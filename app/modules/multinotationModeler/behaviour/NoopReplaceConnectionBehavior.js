// Disable bpmn-js default ReplaceConnectionBehavior to prevent
// automatic morphing to bpmn:SequenceFlow during reconnects.
export default function NoopReplaceConnectionBehavior() {}

NoopReplaceConnectionBehavior.$inject = [];


