export function downsampleEveryNth<T>(data: T[], targetPoints = 800): T[] {
  if (!Array.isArray(data)) return [];
  if (data.length <= targetPoints) return data;

  const step = Math.max(1, Math.ceil(data.length / targetPoints));
  const result: T[] = [];

  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }

  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }

  // TODO: replace with smarter downsampling (e.g., largest triangle three buckets) when charts need more fidelity.
  return result;
}
