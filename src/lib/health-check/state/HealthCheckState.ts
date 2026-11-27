export interface HealthCheckSnapshot {
    service: string;
    /** 'degraded': working, but not fully, e.g. a sync run where some records failed. */
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTimeMs?: number;
    error?: string;
    /** Something worth knowing that is not a failure, e.g. a partly failed sync run. */
    warning?: string;
    lastChecked: string; // ISO timestamp
    conecutiveFailures: number;
    intervalMs?: number; // How often this check runs — lets consumers detect stale results
    details?: Record<string, string | number>;
}

export class HealthCheckState {
    private snapshot: HealthCheckSnapshot = {
        service: 'unknown',
        status: 'unknown',
        lastChecked: new Date(0).toISOString(),
        conecutiveFailures: 0,
    }

    private subscribers: Array<(snapshot: HealthCheckSnapshot) => void> = [];
    
    subscribe(fn: (snapshot: HealthCheckSnapshot) => void): void {
        this.subscribers.push(fn);
        fn(this.snapshot);
    }

    setSnapshot(snapshot: Partial<HealthCheckSnapshot>): void {
        this.snapshot = { ...this.snapshot, ...snapshot, lastChecked: new Date().toISOString() };
        if (snapshot.status === 'unhealthy') {
            this.snapshot.conecutiveFailures += 1;
        } else if (snapshot.status === 'healthy') {
            this.snapshot.conecutiveFailures = 0;
            // Clear error when service becomes healthy
            delete this.snapshot.error;
        }
        this.emit();
    }

    private emit(): void {
        this.subscribers.forEach(fn => fn(this.snapshot));
    }

}