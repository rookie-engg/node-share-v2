import os from 'node:os';
import EventEmitter from 'node:events';

export default class IPChangeDetector extends EventEmitter {
  constructor() {
    super();
    this.previousIPs = this.getIPAddresses();
    this.startMonitoring();
  }

  getIPAddresses() {
    const networkInterfaces = os.networkInterfaces();
    const ipAddresses = [];

    for (const iface of Object.values(networkInterfaces)) {
      for (const { family, address, internal } of iface) {
        if (family === 'IPv4' && !internal) {
          ipAddresses.push(address);
        }
      }
    }

    return ipAddresses;
  }

  checkForIPChange() {
    const currentIPs = this.getIPAddresses();

    if (currentIPs.toString() !== this.previousIPs.toString()) {
      console.log('IP address change detected!');
      console.log('Previous IPs:', this.previousIPs);
      console.log('Current IPs:', currentIPs);

      // Emit the IP change event
      this.emit('ipChanged', {
        previousIPs: this.previousIPs,
        currentIPs: currentIPs,
      });

      // Update previous IPs
      this.previousIPs = currentIPs;
    }
  }

  startMonitoring() {
    setInterval(() => this.checkForIPChange(), 4500);  // Check every 4 seconds
  }
}
