# Outbound call conference with Twilio Voice and Serverless

This is a [Twilio Serverless](https://www.twilio.com/docs/serverless) application to make outbound voice calls using [Twilio Programmable Voice](https://www.twilio.com/docs/voice). It connects two numbers, the Agent and the Recipient / Customer using a [Conference](https://www.twilio.com/docs/voice/conference).

Very soon, this will have an Airtable integration as well.

**Status: In-Progress**

## Setup Functions

These are the steps to set up a new user for the application who can make an outbound call. The process involves first verifying their email, and then verifying the phone number which will receive the agent-side call when making an outbound call.

The application includes email verification functions for secure user authentication using Twilio Verify and Sync. These functions are located in the [`functions/setup/`](functions/setup/) directory and use JWT (JSON Web Tokens) for secure token generation and management.

#### Email OTP Initialization 
**Endpoint:** `/setup/email/init`

Initiates an OTP (One-Time Password) verification process for email addresses.

**Parameters:**
- `email` (required): Email address to verify. Must be from `@twilio.com` domain (for now).

**Example Usage:**
```curl
curl --location 'https://{{domain}}/setup/email/init' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data 'email=user@twilio.com'
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP sent successfully to email",
  "data": {
    "to": "user@twilio.com",
    "channel": "email",
    "status": "pending",
    "valid": false,
    "sid": "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

#### Email OTP Validation
**Endpoint:** `/setup/email/validate`

Validates the OTP code sent to the email and generates a secure JWT token for further use. The JWT is valid for 5 minutes and contains the email and verification timestamp. Only the email and timestamp are stored in Twilio Sync.

**Parameters:**
- `email` (required): Email address that received the OTP
- `code` (required): The OTP code received via email

**Example Usage:**
```curl
curl --location 'https://{{domain}}/setup/email/validate' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data 'email=user@twilio.com&code=123456'
```

**Response:**
```json
{
  "status": "success",
  "message": "Email verified successfully. Pass `data.token` to the next step to set up phone number.",
  "data": {
    "email": "user@twilio.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "verifiedAt": "2025-06-24T10:30:00.000Z",
    "verification": {
      "status": "approved",
      "valid": true,
      "sid": "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

## Phone-to-Phone

In this flow, both parties talk by receiving calls on their phones. Twilio first dials out to Agent and then to the Recipient, and connects them in a conference. These functions are present in the [`functions/phone-to-phone/`](functions/phone-to-phone/) directory.

1. **Start the Call**: The [`start.js`](functions/phone-to-phone/start.js) function initiates the call by dialing the agent first. The agent hears a prompt and can press a key to connect to the Recipient.
    ```curl
    curl --location 'https://{{domain}}/phone-to-phone/start' \
    --header 'Content-Type: application/json' \
    --data '{
        "RecipientNumber": "+1234567890",
        "AgentNumber": "+19087654321",
        "ConferenceName": "Call between Tuvok and Spock"
    }'
    ```
2. **Dial the Recipient**: Once the Agent presses any key, [`Gather`](https://www.twilio.com/docs/voice/twiml/gather) calls the action endpoint at [`dial-recipient.js`](functions/phone-to-phone/dial-recipient.protected.js). This function dials the Recipient and adds them to the conference. It also continues the `<Gather />` flow by adding the agent to the conference.
3. **Track Call Status**: The [`status.js`](functions/phone-to-phone/status.protected.js) function handles status callback events, which can be used for logging or further processing.

## Deployment

This application is designed to be deployed on Twilio's Serverless platform. Ensure that all required environment variables are configured before deployment.

- Set up the [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) and the [Twilio Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit/getting-started#install-the-twilio-serverless-toolkit).
- Set up a Twilio Phone Number from the console.
- Copy `sample.env` to `.env` and edit values for the environment variables. You will find the values in your [Twilio Console](https://console.twilio.com/). 

### Environment Variables
- `CALLER_ID`: The number to identify as the caller in the outgoing call. Must be an active Twilio phone number registered with the same account.
- `VERIFY_SERVICE_SID`: Your Twilio Verify Service SID
- `SYNC_SERVICE_SID`: Your Twilio Sync Service SID
- `JWT_SECRET`: A strong secret key for JWT token signing (minimum 32 characters)

### Setup Instructions

1. **Create a Twilio Verify Service:**
   ```bash
   twilio api:verify:v2:services:create --friendly-name "Email Verification"
   ```
2. **Create a Twilio Sync Service:**
   ```bash
   twilio api:sync:v1:services:create --friendly-name "User Verification Data"
   ```
3. **Generate a JWT Secret:**
   ```bash
   openssl rand -base64 32
   ```
4. **Deploy the Application:**
   ```bash
   twilio serverless:deploy
   ```

## Roadmap

- [x] Setup: Implement email verification with Twilio Verify
- [ ] Setup: Implement phone verification with Twilio Verify
- [ ] Allow recording
- [ ] Trigger call from Airtable
- [ ] Post call status to Airtable
- [ ] Allow Agent to dial in from browser

## License

MIT
