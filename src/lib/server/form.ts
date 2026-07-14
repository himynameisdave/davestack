/**
 * Read a text field from FormData as a string. FormData values are
 * `string | File`; a File (or a missing field) collapses to '' so downstream zod
 * validation sees a clean string and never Object-stringifies a File.
 */
export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
