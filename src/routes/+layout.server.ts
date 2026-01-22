import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const session = locals.session;

	return {
		email: session.data.user?.email || null,
		username: session.data.user?.username || null,
		userId: session.data.user?.user_id || null
	};
};

export interface RootLayoutData {
	email: string | null;
	username: string | null;
	userId: string | null;
}
