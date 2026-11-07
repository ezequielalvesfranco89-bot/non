export class UnconfiguredAdapter {
    platform;
    constructor(platform) {
        this.platform = platform;
    }
    capabilities() { return { connected: false, events: [], reason: 'Integração autorizada não implementada/configurada. Use o simulador.' }; }
    async start() { throw Error(`${this.platform}: não há uma conexão real disponível nesta versão.`); }
    async stop() { }
}
