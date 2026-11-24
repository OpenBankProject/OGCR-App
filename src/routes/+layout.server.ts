import type { LayoutServerLoad } from './$types';
import { getPageRoles } from '$lib/server/roleChecker';
import type { PageRoleConfig, UserEntitlement } from '$lib/utils/roleCheck';
import { installationUsage } from '$lib/server/installationUsage';

export const load: LayoutServerLoad = async ({ locals, route }) => {
	const session = locals.session;

	return {
		email: session.data.user?.email || null,
		username: session.data.user?.username || null,
		userId: session.data.user?.user_id || null,
		userEntitlements: (session.data.user?.entitlements?.list ?? []) as UserEntitlement[],
		pageRoles: getPageRoles(route.id),
		// What this installation is for, shown in the top bar (null = nothing shown)
		installationUsage: installationUsage()
	};
};

export interface RootLayoutData {
	email: string | null;
	username: string | null;
	userId: string | null;
	userEntitlements: UserEntitlement[];
	pageRoles: PageRoleConfig | undefined;
	installationUsage: string | null;
}
