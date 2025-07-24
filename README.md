# Outbound call conference with Twilio Voice and Serverless

A [Twilio Serverless](https://www.twilio.com/docs/serverless) application for making outbound voice calls using [Twilio Programmable Voice](https://www.twilio.com/docs/voice). Connects agents and recipients using [Conferences](https://www.twilio.com/docs/voice/conference) with JWT-based authentication and [Twilio Verify](https://www.twilio.com/docs/verify) for OTP validation.

**Status: In-Progress**

## Workflow

1. **Setup**: Agents verify email (@twilio.com) and phone via Twilio Verify OTP
2. **Call**: Use JWT token to initiate authenticated calls

### Key Features
- Dual email/phone verification with 10-year JWT tokens
- Phone uniqueness enforcement per email
- Automatic agent detection from JWT
- Twilio domain restriction (@twilio.com emails only)

## API Endpoints

### Setup Initialization 
**POST** `/setup/init` - Send OTPs to email and phone

**Parameters:**
- `email` (required): @twilio.com email address
- `phone` (required): Phone number for agent calls

```bash
curl -X POST 'https://{{domain}}/setup/init' \
-d 'email=user@twilio.com&phone=+19087654321'
```

### Setup Validation
**POST** `/setup/validate` - Validate OTPs and get JWT token (10-year validity)

**Parameters:**
- `email`, `email_code`, `phone`, `phone_code` (all required)

```bash
curl -X POST 'https://{{domain}}/setup/validate' \
-d 'email=user@twilio.com&email_code=123456&phone=+19087654321&phone_code=789012'
```

**Returns:** JWT token in `data.token` field

### Call Initiation
**POST** `/call/start` - Start conference call using JWT token

**Parameters:**
- `token` (required): JWT from setup validation
- `RecipientNumber` (required): Customer phone number
- `ConferenceName` (optional): Conference identifier

```bash
curl -X POST 'https://{{domain}}/call/start' \
-H 'Content-Type: application/json' \
-d '{"token": "JWT_TOKEN", "RecipientNumber": "+1234567890"}'
```

## Deployment

### Prerequisites
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) + [Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit/getting-started#install-the-twilio-serverless-toolkit)
- Twilio Phone Number
- Copy `sample.env` to `.env` with values from [Twilio Console](https://console.twilio.com/)

### Environment Variables
- `CALLER_ID`: Twilio phone number for outgoing calls
- `VERIFY_SERVICE_SID`: Twilio Verify Service SID
- `SYNC_SERVICE_SID`: Twilio Sync Service SID  
- `JWT_SECRET`: Strong secret key (32+ chars) for JWT signing

### Quick Setup
```bash
# Create services
twilio api:verify:v2:services:create --friendly-name "Outbound Conference Verification"
twilio api:sync:v1:services:create --friendly-name "Outbound Conference User Data"

# Generate JWT secret
openssl rand -base64 32

# Deploy
twilio serverless:deploy
```

## License

MIT
