export interface ManualSpecParameter {
    name: string;
    location: 'Path' | 'Query' | 'Header' | 'Body' | 'Cookie';
    dataType: string;
    format?: string;
    isRequired: boolean;
    defaultValue?: string;
    schema?: string;
    examples?: string;
}

export interface ManualSpecResponse {
    statusCode: number | '';
    description: string;
    schema?: string;
    examples?: string;
    headers?: string;
}

export interface ManualSpecEndpoint {
    httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
    path: string;
    operationId?: string;
    summary?: string;
    description?: string;
    tags: string[];
    isDeprecated: boolean;
    parameters: ManualSpecParameter[];
    responses: ManualSpecResponse[];
}

export interface ManualSpecificationRequest {
    name: string;
    version?: string;
    autoActivate: boolean;
    endpoints: ManualSpecEndpoint[];
}

export interface ManualSpecFormData {
    name: string;
    version: string;
    autoActivate: boolean;
    endpoints: ManualSpecEndpoint[];
}

export interface ManualSpecValidationErrors {
    name?: string;
    endpoints?: string;
    endpointErrors?: {
        [index: number]: {
            httpMethod?: string;
            path?: string;
            parameters?: { [paramIndex: number]: { name?: string; schema?: string } };
            responses?: { [respIndex: number]: { statusCode?: string; schema?: string; headers?: string } };
        };
    };
}
