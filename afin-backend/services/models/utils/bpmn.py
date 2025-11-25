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
    root = ET.Element('definitions', {
        'xmlns': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'xmlns:bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'targetNamespace': 'http://example.com'
    })
    process = ET.SubElement(root, 'process', {'id': data.get('process_id', 'proc1'), 'isExecutable': 'false'})

    for elem in data.get('elements', []):
        ET.SubElement(process, elem['type'], {'id': elem['id'], 'name': elem['name'] or ''})

    return ET.tostring(root, encoding='unicode')