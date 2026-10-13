/** Fragment metadata never changes the identity of the stored image file. */
export function getImageSource(value: string): string {
  return value.split("#", 1)[0];
}
