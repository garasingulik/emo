export const asyncForEach = async <T>(
  array: T[],
  callback: (el: T, i: number, a: T[]) => void
) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
