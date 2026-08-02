select
  cron.schedule(
    'notify-pending-proposals-hourly',
    '0 * * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'function_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
        )
      );
    $$
  );