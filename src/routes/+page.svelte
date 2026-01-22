<script lang="ts">
	import { Database, Shield, Zap } from '@lucide/svelte';
</script>

<div class="flex h-full w-full items-center justify-center p-8">
	<div class="max-w-4xl text-center">
		<h1 class="h1 mb-6">Welcome to OGCR App</h1>
		<p class="text-xl text-surface-600-400 mb-8">
			A dynamic entities management application built with SvelteKit and the Open Bank Project API.
		</p>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
			<div class="card p-6 preset-filled-surface-100-900">
				<Database class="size-12 mx-auto mb-4 text-primary-500" />
				<h3 class="h4 mb-2">Dynamic Entities</h3>
				<p class="text-sm text-surface-600-400">
					Create, read, update, and delete dynamic entities using the OBP API.
				</p>
			</div>

			<div class="card p-6 preset-filled-surface-100-900">
				<Shield class="size-12 mx-auto mb-4 text-secondary-500" />
				<h3 class="h4 mb-2">Secure Authentication</h3>
				<p class="text-sm text-surface-600-400">
					OAuth 2.0 authentication with multiple provider support.
				</p>
			</div>

			<div class="card p-6 preset-filled-surface-100-900">
				<Zap class="size-12 mx-auto mb-4 text-tertiary-500" />
				<h3 class="h4 mb-2">Fast & Modern</h3>
				<p class="text-sm text-surface-600-400">
					Built with Svelte 5 and SvelteKit for optimal performance.
				</p>
			</div>
		</div>

		<div class="mt-12">
			<a href="/dynamic-entities" class="btn preset-filled-primary-500 text-lg px-8 py-3">
				Get Started
			</a>
		</div>
	</div>
</div>
