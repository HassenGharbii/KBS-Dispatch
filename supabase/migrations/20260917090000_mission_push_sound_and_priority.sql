-- Makes mission push notifications actually alert like a phone message:
-- sound + high priority (wakes the device) + routed through the mobile
-- app's 'missions' notification channel (MAX importance, PUBLIC lock-screen
-- visibility -- see src/lib/pushNotifications.ts), which is what Android
-- actually reads to decide whether to show a heads-up banner over the lock
-- screen. Without a matching channelId, Android falls back to a silent,
-- shade-only notification regardless of what the payload requests.

create or replace function public.send_expo_push(
  p_push_token text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_push_token is null or p_push_token = '' then
    return;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object(
      'to', p_push_token,
      'title', p_title,
      'body', p_body,
      'data', p_data,
      'sound', 'default',
      'priority', 'high',
      'channelId', 'missions'
    )
  );
end;
$$;
