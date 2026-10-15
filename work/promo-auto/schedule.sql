select cron.schedule('au-promo-tiktok', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/promo-tiktok',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='au_promo_cron_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
