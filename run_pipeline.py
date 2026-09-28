import json
import sys

with open(r'C:\Users\junai\AppData\Local\RocketRide\engine\openapi_raw.json', encoding='utf-16') as f:
    d = json.load(f)

for name, schema in d['components']['schemas'].items():
    if 'HttpRequest' in name or 'http' in name.lower() or 'tool' in name.lower():
        print(f"--- {name} ---")
        print(json.dumps(schema.get('properties', {}), indent=2))
