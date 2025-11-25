from __future__ import annotations

import math
import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

import httpx

from services.simulation.company_context import COMPANY_CONTEXT

ROLE_TO_DEPARTMENT = {
    "Procurement": "dept_procurement",
    "Finance": "dept_finance",
    "IT Operations": "dept_itops",
    "Director": None,
}


class SimulationEngine:
    def __init__(self, model_data: Dict[str, Any], company_context: Optional[Dict[str, Any]] = None):
        self.model_data = model_data or {}
        self.nodes = {node["id"]: node for node in self.model_data.get("nodes", [])}
        self.edges = self.model_data.get("edges", [])
        self.edges_by_source = self._build_edges()
        self.context = deepcopy(company_context or COMPANY_CONTEXT)
        self.employees = self._prepare_employees()
        self.department_names = {
            dept["department_id"]: dept["department_name"]
            for dept in self.context["organizational_structure"]["departments"]
        }
        self.timeline: List[Dict[str, Any]] = []
        self.department_load: Dict[str, float] = {}
        self.risk_heatmap: List[Dict[str, Any]] = []
        self.anomalies: List[Dict[str, Any]] = []
        self.ml_usage = 0
        self.total_minutes = 0.0
        self.total_cost = 0.0
        self.last_ml_prediction: Dict[str, Any] = {"risk_score": 0}
        self.runtime_state = {
            "budget": self._infer_budget(),
            "department": None,
            "ml_risk": 0.0,
        }

    def _build_edges(self) -> Dict[str, List[Dict[str, Any]]]:
        mapping: Dict[str, List[Dict[str, Any]]] = {}
        for edge in self.edges:
            mapping.setdefault(edge["source"], []).append(edge)
        return mapping

    def _prepare_employees(self) -> Dict[str, Dict[str, Any]]:
        employees = {}
        for emp in self.context["organizational_structure"]["employees"]:
            capacity = emp.get("workload_capacity_hours", 160)
            employees[emp["employee_id"]] = {
                **emp,
                "initial_capacity": capacity,
                "remaining": capacity,
                "used": 0.0,
                "performance_score": emp.get("performance_score", 0.75) or 0.75,
            }
        return employees

    def _infer_budget(self) -> float:
        metrics = self.context["financial_data"]["revenue_metrics"]
        if not metrics:
            return 1_000_000
        # берём последнее значение выручки как суррогат бюджета
        return metrics[-1]["total_revenue"]

    def _select_employee(self, role: str) -> Dict[str, Any]:
        dept_id = ROLE_TO_DEPARTMENT.get(role)
        candidates = []
        for emp in self.employees.values():
            if dept_id is None:
                if emp.get("position") == "director":
                    candidates.append(emp)
            elif emp.get("department_id") == dept_id:
                candidates.append(emp)
        if not candidates:
            # Фолбек: любой сотрудник с наибольшей свободной загрузкой
            candidates = list(self.employees.values())
        candidates.sort(key=lambda e: (e["performance_score"], e["remaining"]), reverse=True)
        return candidates[0]

    def _call_ml_prediction(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            response = httpx.post(
                "http://localhost:8000/api/analytics/predict",
                json=payload,
                timeout=5.0,
            )
            response.raise_for_status()
            data = response.json()
            self.ml_usage += 1
            self.last_ml_prediction = data
            self.runtime_state["ml_risk"] = data.get("risk_score", 0)
            return data
        except Exception:
            return None

    def _evaluate_condition(self, condition: Optional[str]) -> bool:
        if not condition:
            return True
        expr = condition.strip()
        if expr.startswith("${") and expr.endswith("}"):
            expr = expr[2:-1]
        expr = expr.strip()

        if expr.startswith("probability(") and expr.endswith(")"):
            try:
                value = float(expr[len("probability(") : -1])
            except ValueError:
                value = 0.5
            return random.random() < value

        if "ml_risk" in expr:
            risk = self.runtime_state.get("ml_risk", 0)
            expr = expr.replace("ml_risk", str(risk))

        if "budget" in expr:
            expr = expr.replace("budget", str(self.runtime_state.get("budget", 0)))

        if "department" in expr:
            department = repr(self.runtime_state.get("department"))
            expr = expr.replace("department", department)

        try:
            return bool(eval(expr, {"__builtins__": {}}))
        except Exception:
            return False

    def _execute_task(self, node: Dict[str, Any]) -> None:
        data = node.get("data", {})
        role = data.get("role") or "Procurement"
        employee = self._select_employee(role)
        self.runtime_state["department"] = employee.get("department_id")

        expected = data.get("expected_duration_minutes") or data.get("expected_duration") or 60
        cost_per_hour = float(data.get("cost_per_hour") or 500)
        base_duration = expected * (1 / max(employee["performance_score"], 0.3)) * random.uniform(0.8, 1.3)

        ml_response = None
        if data.get("ml_prediction"):
            ml_payload = {
                "step_id": node["id"],
                "role": role,
                "expected_duration": expected,
                "current_load": employee["used"] / max(employee["initial_capacity"], 1),
                "department": employee.get("department_id"),
                "financial_context": {
                    "cost_per_hour": cost_per_hour,
                    "budget": self.runtime_state.get("budget"),
                },
            }
            ml_response = self._call_ml_prediction(ml_payload)

        if ml_response:
            actual_duration = ml_response.get("predicted_duration", base_duration)
            actual_cost = ml_response.get("predicted_cost", (actual_duration / 60) * cost_per_hour)
            risk_score = ml_response.get("risk_score", 0)
            recommendation = ml_response.get("recommendation")
        else:
            actual_duration = base_duration
            actual_cost = (actual_duration / 60) * cost_per_hour
            risk_score = None
            recommendation = None

        hours_used = actual_duration / 60
        employee["used"] += hours_used
        employee["remaining"] = max(0, employee["remaining"] - hours_used)

        self.total_minutes += actual_duration
        self.total_cost += actual_cost

        dept_id = employee.get("department_id")
        if dept_id:
            self.department_load[dept_id] = self.department_load.get(dept_id, 0) + hours_used

        deviation = abs(actual_duration - expected) / expected if expected else 0
        is_anomalous = deviation > 0.3
        if is_anomalous:
            self.anomalies.append(
                {
                    "stepId": node["id"],
                    "label": node.get("data", {}).get("label", node.get("data", {}).get("name")),
                    "expected": expected,
                    "actual": actual_duration,
                }
            )

        entry = {
            "stepId": node["id"],
            "label": node.get("data", {}).get("label") or node.get("data", {}).get("name"),
            "role": role,
            "employee": employee["name"],
            "department": self.department_names.get(dept_id, dept_id),
            "expectedDuration": expected,
            "actualDuration": actual_duration,
            "cost": actual_cost,
            "usedML": bool(ml_response),
            "riskScore": risk_score,
            "recommendation": recommendation,
        }
        self.timeline.append(entry)

        if risk_score and risk_score >= 0.5:
            self.risk_heatmap.append(
                {
                    "stepId": node["id"],
                    "label": entry["label"],
                    "riskScore": risk_score,
                    "employee": employee["name"],
                }
            )

    def _traverse(self, node_id: str, depth: int = 0, visited: Optional[set] = None):
        if depth > 200:
            return
        visited = visited or set()
        if node_id in visited:
            return
        visited.add(node_id)

        node = self.nodes.get(node_id)
        if not node:
            return

        node_type = node.get("type")
        if node_type == "task":
            self._execute_task(node)
        elif node_type == "gateway":
            pass  # условия обрабатываем через edges

        outgoing = self.edges_by_source.get(node_id, [])
        if not outgoing:
            return

        if node_type == "gateway":
            for edge in outgoing:
                if self._evaluate_condition(edge.get("data", {}).get("condition")):
                    self._traverse(edge["target"], depth + 1, set(visited))
                    return
            # если ничего не подошло — идём по первому
            self._traverse(outgoing[0]["target"], depth + 1, set(visited))
            return

        for edge in outgoing:
            if self._evaluate_condition(edge.get("data", {}).get("condition")):
                self._traverse(edge["target"], depth + 1, set(visited))

    def run(self) -> Dict[str, Any]:
        start_nodes = [node_id for node_id, node in self.nodes.items() if node.get("type") == "start"]
        if not start_nodes:
            # fallback — узлы без входящих рёбер
            targets = {edge["target"] for edge in self.edges}
            start_nodes = [node_id for node_id in self.nodes if node_id not in targets]

        if not start_nodes:
            return {"timeline": [], "summary": {"totalMinutes": 0, "totalCost": 0}}

        for start_id in start_nodes:
            self._traverse(start_id)

        overloaded = []
        for emp in self.employees.values():
            if emp["used"] > emp["initial_capacity"] * 0.8:
                overloaded.append(
                    {
                        "employee": emp["name"],
                        "usedHours": round(emp["used"], 2),
                        "capacityHours": emp["initial_capacity"],
                    }
                )
        overloaded.sort(key=lambda item: item["usedHours"], reverse=True)

        department_load_named = [
            {
                "departmentId": dept_id,
                "departmentName": self.department_names.get(dept_id, dept_id),
                "hours": round(hours, 2),
            }
            for dept_id, hours in self.department_load.items()
        ]

        summary = {
            "totalMinutes": round(self.total_minutes, 2),
            "totalCost": round(self.total_cost, 2),
            "mlCalls": self.ml_usage,
            "anomalyCount": len(self.anomalies),
            "overloadedEmployees": overloaded,
            "completedTasks": len(self.timeline),
        }

        return {
            "timeline": self.timeline,
            "summary": summary,
            "departmentLoad": department_load_named,
            "riskHeatmap": self.risk_heatmap,
            "anomalies": self.anomalies,
        }


def run_simulation(model_data: Dict[str, Any], company_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    engine = SimulationEngine(model_data, company_context)
    return engine.run()