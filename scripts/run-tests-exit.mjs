/**
 * Codi de sortida per al resultat de `spawnSync('node', ['--test', ...])`.
 * Un error de spawn (node no trobat) o un procés mort per senyal deixen
 * `status === null`: mai s'ha de tractar com a èxit.
 *
 * @param {{status: number|null, error?: Error, signal?: string|null}|undefined} result
 * @returns {number}
 */
export function exitCodeFor(result) {
  if (!result || result.error || result.signal) return 1;
  return typeof result.status === 'number' ? result.status : 1;
}
