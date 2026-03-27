# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  channel = "unstable";

  packages = [
    pkgs.gcc
    pkgs.mise
    pkgs.openssl
    pkgs.pkg-config
  ];

  env = {};

  idx = {
    extensions = [];

    previews = {
      enable = true;
      previews = {
        web = {
          command = [
            "sh"
            "-c"
            ''
              bun run --cwd apps/web migrate
              bun run --cwd apps/web seed
              exec bun run --cwd apps/web dev:server -- --host 0.0.0.0 --port "$PORT"
            ''
          ];
          manager = "web";
          env = {
            PORT = "$PORT";
            __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = ".cloudworkstations.dev";
          };
        };
      };
    };

    workspace = {
      onCreate = {
        bootstrap = ''
          if [ ! -f .env ]; then
            cp .env.example .env
          fi

          if ! grep -q '^SESSION_SECRET=.' .env; then
            printf '\nSESSION_SECRET=%s\n' "$(openssl rand -base64 32)" >> .env
          fi

          if ! grep -q '^TOTP_ENCRYPTION_KEY=.' .env; then
            printf '\nTOTP_ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32)" >> .env
          fi

          if ! grep -q '^ENGINE_HMAC_SECRET=.' .env; then
            engine_hmac_secret="$(openssl rand -hex 32)"
            printf '\nENGINE_HMAC_SECRET=%s\n' "$engine_hmac_secret" >> .env
          fi

          if ! grep -q '^ENGINE_HMAC_KEYS_JSON=.' .env; then
            engine_hmac_secret="$(grep '^ENGINE_HMAC_SECRET=.' .env | tail -n 1 | cut -d= -f2-)"
            printf "\nENGINE_HMAC_KEYS_JSON='{\"web\":\"%s\"}'\n" "$engine_hmac_secret" >> .env
          fi

          if ! grep -q '^GOOGLE_CLIENT_ID=.' .env; then
            printf '\nGOOGLE_CLIENT_ID=idx-placeholder-client-id\n' >> .env
          fi

          if ! grep -q '^GOOGLE_CLIENT_SECRET=.' .env; then
            printf '\nGOOGLE_CLIENT_SECRET=idx-placeholder-client-secret\n' >> .env
          fi

          if ! grep -q '^RESEND_API_KEY=.' .env; then
            printf '\nRESEND_API_KEY=idx-placeholder-resend-key\n' >> .env
          fi

          if ! grep -q '^EMAIL_FROM=.' .env; then
            printf '\nEMAIL_FROM=dev@example.com\n' >> .env
          fi

          mise install
          bun install
          bun run generate
        '';
      };

      onStart = {
        engine = "cargo run -p engine --bin engine";
      };
    };
  };
}
