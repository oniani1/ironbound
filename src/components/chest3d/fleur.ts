/**
 * The fleur-de-lis shared by the banner's embroidered crown and the reliquary's gold one, as
 * an SVG path: standing on y = 0, 100 units tall, centred on x = 0, petals and foot.
 */
export const FLEUR =
  // Central petal: a spearhead rising from the tie.
  'M 0 -100 C 10 -84 16 -64 13 -46 C 11 -40 8 -36 6 -33 L -6 -33 C -8 -36 -11 -40 -13 -46 C -16 -64 -10 -84 0 -100 Z ' +
  // Side petals: horns that rise from the tie, curl over and hook down and out to a point.
  'M -6 -34 C -10 -52 -16 -68 -26 -76 C -36 -84 -50 -76 -48 -58 C -46 -66 -40 -70 -34 -66 C -28 -58 -24 -40 -16 -27 Z ' +
  'M 6 -34 C 10 -52 16 -68 26 -76 C 36 -84 50 -76 48 -58 C 46 -66 40 -70 34 -66 C 28 -58 24 -40 16 -27 Z ' +
  // A short foot under the tie.
  'M -6 -25 C -6 -14 -3 -6 0 0 C 3 -6 6 -14 6 -25 Z'

/** The tie that binds the petals, drawn over them. */
export const TIE = 'M -22 -35 L 22 -35 Q 24 -30 22 -25 L -22 -25 Q -24 -30 -22 -35 Z'
