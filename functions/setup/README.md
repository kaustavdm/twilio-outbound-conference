# Setup Functions

This directory contains Twilio Serverless functions for setting up and verifying user email addresses using Twilio Verify and storing verification status using Twilio Sync.

## Functions

### 1. Email OTP Initialization
**Endpoint:** `/setup/email/init`

Initiates an OTP (One-Time Password) verification process for email addresses.

**Parameters:**
- `email` (required): Email address to verify. Must be from `@twilio.com` domain.

**Example Usage:**
```
POST https://your-domain.twil.io/setup/email/init
Content-Type: application/x-www-form-urlencoded

email=user@twilio.com
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

### 2. Email OTP Validation
**Endpoint:** `/setup/email/validate`

Validates the OTP code sent to the email and generates a token for further use.

**Parameters:**
- `email` (required): Email address that received the OTP
- `code` (required): The OTP code received via email

**Example Usage:**
```
POST https://your-domain.twil.io/setup/email/validate
Content-Type: application/x-www-form-urlencoded

email=user@twilio.com&code=123456
```

**Response:**
```json
{
  "status": "success",
  "message": "Email verified successfully",
  "data": {
    "email": "user@twilio.com",
    "token": "abc123def456...",
    "verifiedAt": "2025-06-24T10:30:00.000Z",
    "verification": {
      "status": "approved",
      "valid": true,
      "sid": "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

### 3. Token Validation
**Endpoint:** `/setup/validate-token`

Validates a token generated during email verification process.

**Parameters:**
- `token` (required): Token generated during email validation

**Example Usage:**
```
POST https://your-domain.twil.io/setup/validate-token
Content-Type: application/x-www-form-urlencoded

token=abc123def456...
```

**Response:**
```json
{
  "status": "success",
  "message": "Token is valid",
  "data": {
    "email": "user@twilio.com",
    "verifiedAt": "2025-06-24T10:30:00.000Z",
    "expiresAt": "2025-06-25T10:30:00.000Z",
    "isValid": true
  }
}
```

## Environment Variables

Make sure to set the following environment variables in your Twilio Serverless environment:

- `VERIFY_SERVICE_SID`: Your Twilio Verify Service SID
- `SYNC_SERVICE_SID`: Your Twilio Sync Service SID
- `ACCOUNT_SID`: Your Twilio Account SID (automatically set)
- `AUTH_TOKEN`: Your Twilio Auth Token (automatically set)

## Setup Instructions

1. **Create a Twilio Verify Service:**
   ```bash
   twilio api:verify:v2:services:create --friendly-name "Email Verification"
   ```

2. **Create a Twilio Sync Service:**
   ```bash
   twilio api:sync:v1:services:create --friendly-name "User Verification Data"
   ```

3. **Set Environment Variables:**
   Add the Service SIDs to your `.env` file or set them in the Twilio Console.

4. **Deploy the Functions:**
   ```bash
   twilio serverless:deploy
   ```

## Security Notes

- Tokens expire after 24 hours
- Only `@twilio.com` email addresses are allowed
- All verification data is stored securely in Twilio Sync
- OTP codes are handled by Twilio Verify service

## Error Handling

The functions include comprehensive error handling for:
- Invalid email formats
- Non-Twilio email domains
- Missing or invalid OTP codes
- Expired tokens
- Service configuration issues
