/** Links to the public certification scheme and body pages. Kept apart from
 *  ./certification.ts, which reads private env, so pages can import them in the browser. */

export const certificationSchemeHref = (id: string | null | undefined) =>
	id ? `/registry/certification-schemes/${encodeURIComponent(id)}` : null;
export const certificationBodyHref = (id: string | null | undefined) =>
	id ? `/registry/certification-bodies/${encodeURIComponent(id)}` : null;
