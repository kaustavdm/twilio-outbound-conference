# Outbound call conference with Twilio Voice and Serverless

This is a [Twilio Serverless](https://www.twilio.com/docs/serverless) application to make outbound voice calls using [Twilio Programmable Voice](https://www.twilio.com/docs/voice). It connects two numbers, the Agent and the Recipient / Customer using a [Conference](https://www.twilio.com/docs/voice/conference).

Very soon, this will have an Airtable integration as well.

**Status: In-Progress**

## How It Works

### Phone-to-Phone

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
- Copy `sample.env` to `.env` and edit values for the environment variables. You will find the values in your [Twilio Console](https://console.twilio.com/). If you are just deploying, only worry about the following variables:
    - `CALLER_ID`: The number to identify as the caller in the outgoing call. Must be an active Twilio phone number registered with the same account.
- Run `twilio serverless:deploy` or `npm run deploy`.

## Roadmap

- [x] Make functions protected
- [ ] Allow recording
- [ ] Implement authentication
- [ ] Trigger call from Airtable
- [ ] Post call status to Airtable
- [ ] Allow Agent to dial in from browser

## License

MIT
