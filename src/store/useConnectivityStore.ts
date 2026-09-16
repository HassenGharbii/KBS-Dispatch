import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface ConnectivityState {
  isConnected: boolean;
  init: () => void;
}

let initialized = false;

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isConnected: true,
  init: () => {
    if (initialized) return;
    initialized = true;
    NetInfo.addEventListener((state) => {
      set({ isConnected: Boolean(state.isConnected && state.isInternetReachable !== false) });
    });
  },
}));
