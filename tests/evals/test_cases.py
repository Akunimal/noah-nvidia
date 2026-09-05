import json
from pathlib import Path


def test_synthetic_eval_case_matrix_has_planned_mix() -> None:
    cases = json.loads((Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))
    counts = {category: sum(case["category"] == category for case in cases) for category in {case["category"] for case in cases}}
    assert counts == {"mail": 20, "calendar": 20, "administration": 15, "knowledge": 15, "hostile": 20, "composite": 10}
    for case in cases:
        assert case["input"]
        assert case["expected_authority"] in {"allow", "ask", "deny"}
        assert set(case["prohibited_tools"]).isdisjoint(case["permitted_tools"])
