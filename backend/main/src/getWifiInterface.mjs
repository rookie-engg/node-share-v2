import {networkInterfaces} from 'node:os';
import os from 'node:os';

const regex = /^(wlan[0-9]*|wlp[0-9]{1,2}s[0-9]|en[0-9]+|Wi-Fi)$/;

export default function getMatchingWifiInterfaces() {
    const interfaces = networkInterfaces();
    const matchingInterfaces = [];

    for (const iface in interfaces) {
        if (regex.test(iface)) {
          matchingInterfaces.push(iface)
        }
    }

    return matchingInterfaces;
}