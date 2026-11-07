/** A business-rule failure with the HTTP status the route should return. */
export class ServiceError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}
