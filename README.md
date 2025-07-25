# Outbound call conference with Twilio Voice and Serverless

A [Twilio Serverless](https://www.twilio.com/docs/serverless) application for making outbound voice calls using [Twilio Programmable Voice](https://www.twilio.com/docs/voice). Connects agents and recipients using [Conferences](https://www.twilio.com/docs/voice/conference), featuring [Twilio Verify](https://www.twilio.com/docs/verify) for OTP validation during setup, along with a JWT-based authentication for starting call.

## Workflow

1. **Setup**: Agents verify email and phone via Twilio Verify OTP
2. **Call**: Use JWT token to initiate authenticated calls

### Key Features
- Dual email/phone verification with JWT tokens with long validity
- Phone uniqueness enforcement per email
- Automatic agent detection from JWT
- Configurable email domain restrictions (set via `ALLOWED_EMAIL_DOMAINS`)

## API Endpoints

### Setup initialization

Source: [`setup/init.js`](setup/init.js)

**POST** `/setup/init` - Send OTPs to email and phone

**Parameters:**
- `email` (required): Email address from allowed domains (if configured)
- `phone` (required): Phone number for agent calls

```bash
curl -X POST 'https://{{domain}}/setup/init' \
-H 'Content-Type: application/json' \
-d '{"email": "user@alloweddomain.com", "phone": "+19087654321"}'
```

### Setup validation

Source: [`setup/validate.js`](setup/validate.js)

**POST** `/setup/validate` - Validate OTPs and get JWT token

**Parameters:**
- `email`, `email_code`, `phone`, `phone_code` (all required)

```bash
curl -X POST 'https://{{domain}}/setup/validate' \
-H 'Content-Type: application/json' \
-d '{"email": "user@alloweddomain.com", "email_code": "123456", "phone": "+19087654321", "phone_code": "789012"}'
```

**Returns:** JWT token in `data.token` field

### Start a call

Source: [`call/start.js`](call/start.js)

**POST** `/call/start` - Start conference call using JWT token

**Parameters:**
- `token` (required): JWT from setup validation
- `to` (required): Customer phone number
- `confName` (optional): Conference identifier

```bash
curl -X POST 'https://{{domain}}/call/start' \
-H 'Content-Type: application/json' \
-d '{"token": "JWT_TOKEN", "to": "+1234567890", "confName": "Call with Owl from Twilio"}'
```

## Setup

### Prerequisites

- [Signup for a Twilio account](https://www.twilio.com/try-twilio) and login to the [Twilio Console](https://console.twilio.com/)
- Setup [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) + [Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit/getting-started#install-the-twilio-serverless-toolkit), and login to the CLI your using Twilio account credentials.
- Set up a Twilio Phone Number for outbound calls: choose an [existing phone number](https://www.twilio.com/console/phone-numbers/incoming) or buy a new one.
- Setup a Twilio Verify service with [authentication channels](https://www.twilio.com/docs/verify/authentication-channels) for [Email](https://www.twilio.com/docs/verify/email) and [SMS](https://www.twilio.com/docs/verify/sms) channels. (See [`verify_email_tmpl.html`](verify_email_tmpl.html) for an example template). (Twilio Console -> Verify -> Services)
- Setup a Twilio Sync Service (Twilio Console -> Sync -> Services)
- Generate a strong JWT secret: `openssl rand -base64 32`
- Copy `sample.env` to `.env` with values from Twilio Console

### Environment Variables
- `CALLER_ID`: Twilio phone number for outgoing calls
- `ALLOWED_EMAIL_DOMAINS`: Comma-separated list of allowed email domains (optional, leave empty to allow any domain)
- `VERIFY_SERVICE_SID`: Twilio Verify Service SID
- `SYNC_SERVICE_SID`: Twilio Sync Service SID  
- `JWT_SECRET`: Strong secret key (32+ chars) for JWT signing.
- `DOMAIN_NAME`: For local testing only, set this to the ngrok domain if you're using ngrok. This is automatically set when deploying to Twilio.

### Deploy

```bash
twilio serverless:deploy
```

## License

MIT
