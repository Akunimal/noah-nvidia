from pathlib import Path
import sys
import yaml
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services' / 'api'))
from main import app
Path(__file__).resolve().parents[1].joinpath('contracts', 'openapi.yaml').write_text(yaml.safe_dump(app.openapi(), sort_keys=False, allow_unicode=True), encoding='utf-8')
