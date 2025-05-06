exports.handler = async function (context, event, callback) {
    const client = context.getTwilioClient();

    // Pass AgentNumber, ParticipantNumber, ConferenceName to the function
    const { AgentNumber, ParticipantNumber, ConferenceName } = event;

    // Get Caller ID and DOMAIN_NAME from the context. Set from environment variables
    // DOMAIN_NAME is set by Twilio when the function is deployed
    // CALLER_ID needs to be set as an environment variable
    const { CALLER_ID, DOMAIN_NAME } = context;

    // Check for conference name or set a default one
    const conferenceName = encodeURIComponent(ConferenceName || `conf_phone_to_phone_${Date.now()}`);
    const participant = encodeURIComponent(ParticipantNumber);

    const startTwiml = new Twilio.twiml.VoiceResponse();
    startTwiml.say("Hello.")
    startTwiml.gather({
        action: `${DOMAIN_NAME}/phone-to-phone/dial-participant?ConferenceName=${conferenceName}&ParticipantNumber=${participant}`,
        actionOnEmptyResult: true,
        method: 'POST',
        finishOnKey: '0-9#*',
        timeout: 10,
        numDigits: 1,
        input: 'dtmf'
    }).say("Please press any key to dial the customer. Or, wait till we connect you.")

    try {
        // Step 1: Call agent first
        const initcall = await client.calls.create({
            to: AgentNumber,
            from: CALLER_ID,
            method: 'POST',
            twiml: startTwiml,
            statusCallback: `${DOMAIN_NAME}/phone-to-phone/status?ConferenceName=${conferenceName}`,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: "initiated ringing answered completed",
        })

        return callback(null, {
            status: 'success',
            message: 'Call initiated to agent',
            data: initcall
        });
    } catch (error) {
        console.error('Error calling agent:', error);
        return callback(error, null);
    }

}