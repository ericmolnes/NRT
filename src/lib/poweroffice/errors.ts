export class PowerOfficeError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "PowerOfficeError";
  }
}
