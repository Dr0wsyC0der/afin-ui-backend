import xml.etree.ElementTree as ET
from typing import Dict, Any


# Простой парсер BPMN → JSON
def bpmn_to_json(xml_content: str) -> Dict[str, Any]:
    root = ET.fromstring(xml_content)
    ns = {'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL'}

    process = root.find('.//bpmn:process', ns)
    if not process:
        raise ValueError("Invalid BPMN: no process found")

    elements = []
    for elem in process:
        tag = elem.tag.split('}')[-1]
        attrs = elem.attrib
        elements.append({"type": tag, "id": attrs.get('id'), "name": attrs.get('name')})

    return {
        "process_id": process.get('id'),
        "elements": elements
    }


# Простой генератор JSON → BPMN XML
def json_to_bpmn(data: Dict[str, Any]) -> str:
    # Поддержка нового формата с nodes (пулы и задачи)
    if 'nodes' in data:
        root = ET.Element('definitions', {
            'xmlns': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
            'xmlns:bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
            'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
            'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
            'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI',
            'targetNamespace': 'http://example.com'
        })
        
        collaboration = ET.SubElement(root, 'collaboration', {'id': 'Collaboration_1'})
        
        pools = [n for n in data.get('nodes', []) if n.get('type') == 'pool']
        tasks = [n for n in data.get('nodes', []) if n.get('type') == 'task']
        
        for pool in pools:
            pool_data = pool.get('data', {})
            pool_id = pool.get('id', 'pool1')
            ET.SubElement(collaboration, 'participant', {
                'id': f'Participant_{pool_id}',
                'name': pool_data.get('label', pool_data.get('department', 'Pool')),
                'processRef': f'Process_{pool_id}'
            })
        
        for pool in pools:
            pool_data = pool.get('data', {})
            pool_id = pool.get('id', 'pool1')
            dept = pool_data.get('department', 'Procurement')
            pool_tasks = [t for t in tasks if t.get('data', {}).get('department') == dept]
            
            process = ET.SubElement(root, 'process', {
                'id': f'Process_{pool_id}',
                'isExecutable': 'false'
            })
            
            lane_set = ET.SubElement(process, 'laneSet', {'id': f'LaneSet_{pool_id}'})
            lane = ET.SubElement(lane_set, 'lane', {
                'id': f'Lane_{pool_id}',
                'name': pool_data.get('label', dept)
            })
            
            for task in pool_tasks:
                task_data = task.get('data', {})
                task_id = task.get('id', 'task1')
                ET.SubElement(lane, 'task', {
                    'id': f'Task_{task_id}',
                    'name': task_data.get('label', task_data.get('process_name', 'Task'))
                })
        
        return ET.tostring(root, encoding='unicode')
    
    # Старый формат для обратной совместимости
    root = ET.Element('definitions', {
        'xmlns': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'xmlns:bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'targetNamespace': 'http://example.com'
    })
    process = ET.SubElement(root, 'process', {'id': data.get('process_id', 'proc1'), 'isExecutable': 'false'})

    for elem in data.get('elements', []):
        ET.SubElement(process, elem['type'], {'id': elem['id'], 'name': elem['name'] or ''})

    return ET.tostring(root, encoding='unicode')