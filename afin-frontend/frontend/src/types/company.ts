export type DepartmentId =
  | 'dept_procurement'
  | 'dept_finance'
  | 'dept_itops'
  | 'dept_director';

export type CompanyRole = 'Procurement' | 'Finance' | 'IT Operations' | 'Director';

export interface Employee {
  employee_id: string;
  name: string;
  department_id: string | null;
  position?: string;
  performance_score?: number;
  workload_capacity_hours?: number;
}

export interface Department {
  department_id: DepartmentId | string;
  department_name: CompanyRole | string;
}

export interface ProcessStep {
  step_id: string;
  role: CompanyRole;
  expected_duration: number;
  assigned_employee_id?: string | null;
}

export interface CompanyProcess {
  process_id: string;
  process_name: string;
  steps: ProcessStep[];
}

export interface FinancialQuarter {
  period: string;
  total_revenue: number;
}

export interface Profitability {
  gross_margin: number;
  operating_margin: number;
}

export interface CompanyScenario {
  company_metadata: {
    company_id: string;
    company_name: string;
    industry: string;
    employee_count: number;
    analysis_period: {
      start_date: string;
      end_date: string;
      timezone: string;
    };
  };
  organizational_structure: {
    departments: Department[];
    employees: Employee[];
  };
  processes: CompanyProcess[];
  financial_data: {
    revenue_metrics: FinancialQuarter[];
    profitability: Profitability;
  };
}

export interface WorkloadItem {
  employeeId: string;
  employeeName: string;
  role: CompanyRole;
  hours: number;
  capacity: number;
  performance: number;
}

