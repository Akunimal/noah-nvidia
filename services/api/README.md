# Noah Nvidia API

FastAPI service for the supervised run and approval lifecycle. The default
process is intentionally small enough for a free Render instance and uses a
deterministic in-memory demo store. The SQL baseline in supabase/ is the
durable schema used when a Supabase project is configured.

Run locally with Python 3.12:

    uv venv --python 3.12 .venv
    uv pip install -r requirements.txt --python .venv/Scripts/python.exe
    .venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000

NOAH_NEBIUS_API_KEY selects the Nebius Token Factory route. The
NOAH_OPENCODE2API_BASE_URL route is an explicit free Nemotron sandbox and
must only receive synthetic fixtures. The API reports provider errors rather
than silently switching to an unrelated model.
