exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const { CALLER_ID, DOMAIN_NAME } = context;

  const conf = decodeURIComponent(event.confName);
  const recipient = decodeURIComponent(event.to);

  if (!event.confName) {
    return callback(
      new Error("`confName` is required and must not be empty"),
      null
    );
  }
  if (!event.to) {
    return callback(
      new Error("`to` is required and must be a phone number"),
      null
    );
  }

  const baseUrl = `https://${DOMAIN_NAME}/call`;

  const encName = encodeURIComponent(conf);

  try {
    await client.calls.create({
      to: recipient,
      from: CALLER_ID,
      method: "POST",
      url: `${baseUrl}/conference-twiml?confName=${encName}&callerType=Recipient`,
      statusCallback: `${baseUrl}/status?confName=${encName}&callerType=Recipient`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    const response = new Twilio.twiml.VoiceResponse();
    response.redirect(
      {
        method: "POST",
      },
      `${baseUrl}/conference-twiml?confName=${encName}&callerType=Agent`
    );

    return callback(null, response);
  } catch (error) {
    console.error("Error calling recipient:", error);
    return callback(error, null);
  }
};
