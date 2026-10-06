// A controlled error we can throw to return a specific status code.
// Lives in its own module so http.ts and auth.ts can both import it without a cycle.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
