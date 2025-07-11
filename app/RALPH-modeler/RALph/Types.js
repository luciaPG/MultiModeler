//In this module are defined the groups of the elements, which are important to define connections later. Morevoer, it is defined also which elements must have a label
// and the position of the labels 

export const label = [//this array states which elements should have a label
    
    'RALph:Person',
    'RALph:RoleRALph',
    'RALph:Personcap',
    'RALph:Orgunit',
    'RALph:Position',
    'RALph:reportsDirectly',
    'RALph:reportsTransitively',
    'RALph:delegatesDirectly',
    'RALph:delegatesTransitively',
    'RALph:History-AnyInstanceInTime-Green',
    'RALph:History-AnyInstanceInTime-Red'


]

export const externalLabel = [//this array states which elements should have a label
    
    'RALph:Person',
    'RALph:RoleRALph',
    'RALph:Personcap',
    'RALph:Orgunit',
    'RALph:Position',
    'RALph:delegatesDirectly',
    'RALph:delegatesTransitively',
    //'RALph:History-AnyInstanceInTime-Green'


   
    
]

export const connections = [//this array states which elements are connections
    'RALph:ResourceArc',
    'RALph:negatedAssignment',

    'RALph:solidLine',
    'RALph:solidLineWithCircle',
    'RALph:dashedLine',
    'RALph:dashedLineWithCircle',

    'RALph:simpleArrow',
    'RALph:doubleArrow'
]

export const directEdit = [
    //'RALph:Person',
    //'RALph:RoleRALph',
    //'RALph:Personcap',
    //'RALph:Orgunit',
    //'RALph:Position',
    
 

]

export const resourceArcElements = [//this array states which elements can use resourceArc connector
   
    'RALph:Person',
    'RALph:RoleRALph',
    'RALph:Personcap',
    'RALph:Orgunit',
    'RALph:Position',
    'RALph:Complex-Assignment-AND',
    'RALph:Complex-Assignment-OR',
    'RALph:reportsDirectly',
    'RALph:reportsTransitively',
    'RALph:delegatesDirectly',
    'RALph:delegatesTransitively'
    
]


export const negatedElements = [//this array states which elements can use the negated connector
   
    'RALph:Person',
    'RALph:RoleRALph',
    'RALph:Personcap',
    'RALph:Orgunit',
    'RALph:Position'
    
]




export const solidLineElements =[//this array states which elements can use the solid line connector
    'RALph:History-Same',
    'RALph:History-Any',
    'RALph:DelegateTo',
    'RALph:History-Any-Red',
    'RALph:History-Any-Green',
    'RALph:History-Same-Green',
    'RALph:History-Same-Red',
    'RALph:History-AnyInstanceInTime-Green',
    'RALph:History-AnyInstanceInTime-Red'

]

export const HistoryConnectorSameOrPreviousInstanceElements =[//linea solida con punto
    'RALph:History-Same',
    'RALph:History-Any',
    'RALph:History-Any-Red',
    'RALph:History-Any-Green',
    'RALph:History-Same-Green',
    'RALph:History-Same-Red',
    'RALph:History-AnyInstanceInTime-Green',
    'RALph:History-AnyInstanceInTime-Red'
]

export const HistoryConnectorPreviousInstanceElements =[//linea con rayas con punto
    'RALph:History-Same',
    'RALph:History-Any',
    'RALph:History-Any-Red',
    'RALph:History-Any-Green',
    'RALph:History-Same-Green',
    'RALph:History-Same-Red',
    'RALph:History-AnyInstanceInTime-Green',
    'RALph:History-AnyInstanceInTime-Red'
]


export const Ralph = [//this array states which elements are RALph elements
    
    'RALph:ResourceArc',
    'RALph:Person',
    'RALph:RoleRALph',
    'RALph:Personcap',
    'RALph:Orgunit',
    'RALph:Position',
    'RALph:DelegateTo',
    'RALph:History-Same',
    'RALph:History-Any',
    'RALph:HistoryConnectorActivityInstance',
    'RALph:solidLineWithCircle',
    'RALph:dashedLine',
    'RALph:simpleArrow',
    'RALph:reportsTo',
    'RALph:doubleArrow',
    'RALph:dataField',
    'RALph:History-Any-Red',
    'RALph:History-Any-Green',
    'RALph:History-Same-Green',
    'RALph:History-Same-Red',
    'RALph:Complex-Assignment-AND',
    'RALph:Complex-Assignment-OR',
    'RALph:reportsDirectly',
    'RALph:reportsTransitively',
    'RALph:delegatesDirectly',
    'RALph:delegatesTransitively',
    'RALph:History-AnyInstanceInTime-Green',
    'RALph:History-AnyInstanceInTime-Red'
 
]

export function isRalphShape(type) {
    if (typeof type === 'object')
        type = type.type

    return type.includes('RALph:') && !connections.includes(type)
}

export function isRalphConnection(type) {
    if (typeof type === 'object') {
        type = type.type
    }
    return type.includes('RALph:') && connections.includes(type)
}

export function isRalphResourceArcElement(type) {

    if (typeof type === 'object') {
        type = type.type
    }
    /*if (type.type!="RALph:Position"){
        type=type.type
    }*/

    return resourceArcElements.includes(type)
}


 export function isHistoryConnectorActivityInstance(type) {

    if (typeof type === 'object') {
       type = type.type
    }

    return solidLineElements.includes(type)
}


export function isHistoryConnectorSameOrPreviousInstance(type) {

    if (typeof type === 'object') {
       type = type.type
    }

    return HistoryConnectorSameOrPreviousInstanceElements.includes(type)
}



export function isHistoryConnectorPreviousInstanceElements(type) {

    if (typeof type === 'object') {
       type = type.type
    }

    return HistoryConnectorPreviousInstanceElements.includes(type)
}
