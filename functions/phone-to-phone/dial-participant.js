exports.handler = async function (context, event, callback) {
    // Call customer first
    const client = context.getTwilioClient();
    const { CALLER_ID, DOMAIN_NAME } = context;

    if (!event.ConferenceName) {
        return callback(new Error('`ConferenceName` is required'), null);
    }
    if (!event.ParticipantNumber) {
        return callback(new Error('`ParticipantNumber` is required'), null);
    }

    const conf = decodeURIComponent(event.ConferenceName);
    const participant = decodeURIComponent(event.ParticipantNumber);

    function conferenceTwiml(isParticipant) {
        const twiml = new Twilio.twiml.VoiceResponse()
        return twiml.dial()
            .conference({
                startConferenceOnEnter: !isParticipant,
                endConferenceOnExit: !isParticipant,
                beep: false,
                statusCallback: `${DOMAIN_NAME}/phone-to-phone/status?ConferenceName=${encodeURIComponent(conf)}&CallerType=${isParticipant ? 'Participant' : 'Agent'}`,
                statusCallbackMethod: 'POST',
                statusCallbackEvent: "start end join leave"
            }, conf);
    }

    try {
        await client.calls.create({
            to: participant,
            from: CALLER_ID,
            method: 'POST',
            twiml: conferenceTwiml(true),
            statusCallback: `${DOMAIN_NAME}/phone-to-phone/status?ConferenceName=${conf}&CallerType=Participant`,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: "initiated ringing answered completed",
        })

        const agentTwiml = conferenceTwiml(false)

        const response = new Twilio.Response();
        response.setStatusCode(200).appendHeader('Content-Type', 'text/xml').setBody(agentTwiml.toString());

        return callback(null, response)
    } catch (error) {
        console.error('Error calling participant:', error);
        return callback(error, null);
    }
}