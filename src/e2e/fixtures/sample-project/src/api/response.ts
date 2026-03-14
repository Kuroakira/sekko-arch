// API module: no internal imports (leaf within api)

export interface ApiResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export function createResponse(
  status: number,
  body: unknown,
): ApiResponse {
  return {
    status,
    body,
    headers: {
      "content-type": "application/json",
    },
  };
}

export function errorResponse(
  status: number,
  message: string,
): ApiResponse {
  return createResponse(status, { error: message });
}
