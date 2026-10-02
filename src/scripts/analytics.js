import posthog from 'posthog-js';

export function initAnalytics(token, host) {
  if (!token || !host || window.rayAnalytics) return;

  const allowedEvents = new Set(['$pageview', 'phone_link_clicked', 'lead_form_submitted']);
  const allowedProperties = new Set([
    'distinct_id', '$device_id', '$session_id', '$window_id', '$lib', '$lib_version',
    '$current_url', '$pathname', '$host', '$referrer', '$referring_domain',
    '$browser', '$browser_version', '$os', '$os_version', '$device_type',
    '$screen_height', '$screen_width', '$viewport_height', '$viewport_width',
    '$time', 'page_path', 'form_location',
  ]);
  const cleanUrl = (value) => {
    try {
      const url = new URL(value);
      return url.origin + url.pathname;
    } catch { return ''; }
  };
  const queue = [];
  let client;
  const capture = (name, properties = {}) => {
    if (!allowedEvents.has(name)) return;
    const event = [name, { page_path: location.pathname, ...properties }];
    try {
      if (client) client.capture(...event);
      else if (queue.length < 50) queue.push(event);
    } catch { /* Analytics must never interfere with lead submission. */ }
  };
  window.rayAnalytics = { capture };

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="tel:"]') : null;
    if (link) capture('phone_link_clicked');
  });

  try {
      posthog.init(token, {
        api_host: host,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: 'identified_only',
        advanced_disable_flags: true,
        before_send: (event) => {
          if (!allowedEvents.has(event.event)) return null;
          const properties = {};
          for (const [key, value] of Object.entries(event.properties || {})) {
            if (allowedProperties.has(key)) properties[key] = value;
          }
          properties.$current_url = location.origin + location.pathname;
          properties.$pathname = location.pathname;
          if (properties.$referrer) properties.$referrer = cleanUrl(properties.$referrer);
          event.properties = properties;
          return event;
        },
        loaded: (posthog) => {
          client = posthog;
          capture('$pageview');
          for (const event of queue.splice(0)) client.capture(...event);
        },
      });
  } catch { /* Keep the website functional if the SDK fails. */ }
}

