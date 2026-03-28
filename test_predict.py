import requests

resp = requests.post(
    'http://127.0.0.1:5000/predict',
    json={
        'species': 'Escherichia coli',
        'ward': 'ICU',
        'infection_source': 'Blood',
        'target_antibiotic': 'Ampicillin',
        'prior_antibiotics': ['Ampicillin']
    }
)
print('status', resp.status_code)
print('json', resp.json())
