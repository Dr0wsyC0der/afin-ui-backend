COMPANY_CONTEXT = {
    "company_metadata": {
        "company_id": "comp_it_001",
        "company_name": "Smart IT Pilot Co.",
        "industry": "it",
        "employee_count": 12,
        "analysis_period": {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T00:00:00",
            "timezone": "Europe/Moscow",
        },
    },
    "organizational_structure": {
        "departments": [
            {"department_id": "dept_procurement", "department_name": "Procurement"},
            {"department_id": "dept_finance", "department_name": "Finance"},
            {"department_id": "dept_itops", "department_name": "IT Operations"},
        ],
        "employees": [
            {
                "employee_id": "emp_001",
                "name": "Employee_1",
                "department_id": "dept_procurement",
                "position": "specialist",
                "performance_score": 0.82,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_002",
                "name": "Employee_2",
                "department_id": "dept_procurement",
                "position": "specialist",
                "performance_score": 0.61,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_003",
                "name": "Employee_3",
                "department_id": "dept_procurement",
                "position": "specialist",
                "performance_score": 0.7,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_004",
                "name": "Employee_4",
                "department_id": "dept_finance",
                "position": "specialist",
                "performance_score": 0.68,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_005",
                "name": "Employee_5",
                "department_id": "dept_finance",
                "position": "specialist",
                "performance_score": 0.86,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_006",
                "name": "Employee_6",
                "department_id": "dept_finance",
                "position": "specialist",
                "performance_score": 0.84,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_007",
                "name": "Employee_7",
                "department_id": "dept_itops",
                "position": "specialist",
                "performance_score": 0.91,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_008",
                "name": "Employee_8",
                "department_id": "dept_itops",
                "position": "specialist",
                "performance_score": 0.63,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_009",
                "name": "Employee_9",
                "department_id": "dept_itops",
                "position": "specialist",
                "performance_score": 0.75,
                "workload_capacity_hours": 160,
            },
            {
                "employee_id": "emp_mgr_001",
                "name": "Manager_Proc",
                "department_id": "dept_procurement",
            },
            {
                "employee_id": "emp_mgr_002",
                "name": "Manager_Fin",
                "department_id": "dept_finance",
            },
            {
                "employee_id": "emp_mgr_003",
                "name": "Manager_IT",
                "department_id": "dept_itops",
            },
            {
                "employee_id": "emp_dir_001",
                "name": "Director",
                "department_id": None,
                "position": "director",
                "performance_score": 0.95,
                "workload_capacity_hours": 200,
            },
        ],
    },
    "processes": [
        {
            "process_id": "proc_procurement",
            "process_name": "Закупка оборудования",
            "steps": [
                {"step_id": "req", "role": "IT Operations", "expected_duration": 60},
                {"step_id": "budget_check", "role": "Finance", "expected_duration": 120},
                {"step_id": "approval", "role": "Director", "expected_duration": 60},
                {"step_id": "order", "role": "Procurement", "expected_duration": 180},
                {"step_id": "payment", "role": "Finance", "expected_duration": 60},
            ],
        },
        {
            "process_id": "proc_finance",
            "process_name": "Пополнение счета / оплата поставщика",
            "steps": [
                {"step_id": "invoice", "role": "Procurement", "expected_duration": 30},
                {"step_id": "verify", "role": "Finance", "expected_duration": 60},
                {"step_id": "approve", "role": "Director", "expected_duration": 45},
                {"step_id": "pay", "role": "Finance", "expected_duration": 30},
            ],
        },
        {
            "process_id": "proc_budget",
            "process_name": "Финансовое планирование / изменение бюджета",
            "steps": [
                {"step_id": "analysis", "role": "Finance", "expected_duration": 240},
                {"step_id": "proposal", "role": "Finance", "expected_duration": 60},
                {"step_id": "approve", "role": "Director", "expected_duration": 120},
            ],
        },
        {
            "process_id": "proc_contract",
            "process_name": "Согласование контракта с клиентом",
            "steps": [
                {"step_id": "draft", "role": "Procurement", "expected_duration": 90},
                {"step_id": "review", "role": "Finance", "expected_duration": 120},
                {"step_id": "approve", "role": "Director", "expected_duration": 60},
            ],
        },
    ],
    "financial_data": {
        "revenue_metrics": [
            {"period": "2024-Q1", "total_revenue": 1_200_000},
            {"period": "2024-Q2", "total_revenue": 1_400_000},
            {"period": "2024-Q3", "total_revenue": 1_350_000},
            {"period": "2024-Q4", "total_revenue": 1_600_000},
        ],
        "profitability": {"gross_margin": 0.35, "operating_margin": 0.2},
    },
}


