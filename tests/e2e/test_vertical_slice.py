"""End-to-end business circuit using the deterministic API sandbox."""

from fastapi.testclient import TestClient

from main import app


def test_service_quote_pdf_acceptance_and_receivable() -> None:
    client = TestClient(app)
    headers = {"Authorization": "Bearer tenant-e2e-vertical"}

    service = client.post(
        "/api/v1/services",
        headers=headers,
        json={"name": "On-site assessment", "price_minor": 27500, "duration_minutes": 90},
    )
    assert service.status_code == 200
    contact = client.post(
        "/api/v1/contacts",
        headers=headers,
        json={"name": "E2E Customer", "email": "e2e@example.test"},
    )
    assert contact.status_code == 200

    quote = client.post(
        "/api/v1/quotes",
        headers=headers,
        json={
            "contact_id": contact.json()["id"],
            "lines": [{"service_id": service.json()["id"], "quantity": 2}],
        },
    )
    assert quote.status_code == 200
    quote_body = quote.json()
    assert quote_body["total_minor"] == 55000

    pdf = client.get(f"/api/v1/quotes/{quote_body['id']}/pdf", headers=headers)
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF-1.4")

    proposed = client.post(f"/api/v1/quotes/{quote_body['id']}/send", headers=headers)
    assert proposed.status_code == 200
    action = proposed.json()["action"]
    approved = client.post(
        f"/api/v1/actions/{action['id']}/approve",
        headers=headers,
        json={"expected_hash": action["arguments_hash"]},
    )
    assert approved.status_code == 200

    accepted = client.post(f"/api/v1/quotes/{quote_body['id']}/accept", headers=headers)
    assert accepted.status_code == 200
    assert accepted.json()["receivable"]["amount_due_minor"] == 55000
