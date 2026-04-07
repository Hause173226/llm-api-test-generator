// Types for Manual Specification Creation

export interface ManualSpecParameter {
    name: string;
    location: 'Path' | 'Query' | 'Header' | 'Body';
    dataType: string;
    isRequired: boolean;
}

export interface ManualSpecResponse {
    statusCode: number;
    description: string;
    schema: string;
}

export interface ManualSpecEndpoint {
    httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

// Validation errors
export interface ManualSpecValidationErrors {
    name?: string;
    endpoints?: string;
    endpointErrors?: {
        [index: number]: {
            httpMethod?: string;
            path?: string;
            parameters?: {
                [paramIndex: number]: {
                    name?: string;
                };
            };
            responses?: {
                [respIndex: number]: {
                    statusCode?: string;
                    schema?: string;
                };
            };
        };
    };
}
