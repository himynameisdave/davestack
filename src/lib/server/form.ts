import { safeParse, type ZodObject } from 'zod';

/** Read the schema's text fields, treating missing values and files as empty strings. */
export async function parseForm<Schema extends ZodObject>(request: Request, schema: Schema) {
  const data = await request.formData();
  const values = Object.fromEntries(
    Object.keys(schema.shape).map((name) => {
      const value = data.get(name);
      return [name, typeof value === 'string' ? value : ''];
    }),
  ) as Record<Extract<keyof Schema['shape'], string>, string>;

  return { values, parsed: safeParse(schema, values) };
}

export function formError(error: { readonly issues: readonly { readonly message: string }[] }) {
  return error.issues[0]?.message ?? 'Invalid input';
}
