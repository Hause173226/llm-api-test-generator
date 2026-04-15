export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApplicationProgrammingInterfaceEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  description?: string;
  status: 'active' | 'deprecated' | 'error';
  latency?: number;
  coverage?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  specificationDocument: string;
  lastExecutionDate?: string;
  status: 'active' | 'archived';
  type: 'REST' | 'GraphQL' | 'gRPC';
}

export interface TestSuite {
  id: string;
  name: string;
  specificationId: string;
  generationType: 'manual' | 'llm-assisted' | 'automated';
  endpointCount: number;
  status: 'active' | 'archived';
}

export interface TestExecutionNode {
  id: string;
  label: string;
  method: HttpMethod;
  url: string;
  stepNumber: number;
  type: 'root' | 'child' | 'leaf';
}

export interface TestExecutionEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface TestExecutionOrderPlan {
  nodes: TestExecutionNode[];
  edges: TestExecutionEdge[];
  reasoningNotes: string;
}
