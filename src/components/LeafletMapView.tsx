import React, { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { LEAFLET_MAP_HTML } from './leafletMapHtml';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind?: 'on_shift' | 'en_route' | 'site';
}

interface Props {
  markers: MapMarker[];
  siteMarkers?: MapMarker[];
  style?: StyleProp<ViewStyle>;
}

export function LeafletMapView({ markers, siteMarkers = [], style }: Props) {
  const webViewRef = useRef<WebView>(null);
  const isReadyRef = useRef(false);

  // escape '<' defensively — agent/site names are free text and this string
  // is evaluated directly as JS, not parsed as HTML, but there's no reason
  // to trust it further than necessary.
  function pushMarkers() {
    const json = JSON.stringify(markers).replace(/</g, '\\u003c');
    webViewRef.current?.injectJavaScript(`window.setMarkers(${json}); true;`);
  }

  function pushSiteMarkers() {
    const json = JSON.stringify(siteMarkers).replace(/</g, '\\u003c');
    webViewRef.current?.injectJavaScript(`window.setSiteMarkers(${json}); true;`);
  }

  useEffect(() => {
    if (isReadyRef.current) pushMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  useEffect(() => {
    if (isReadyRef.current) pushSiteMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteMarkers]);

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html: LEAFLET_MAP_HTML }}
      style={style}
      onLoadEnd={() => {
        isReadyRef.current = true;
        pushMarkers();
        pushSiteMarkers();
      }}
    />
  );
}
