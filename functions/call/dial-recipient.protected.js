exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const { CALLER_ID, DOMAIN_NAME } = context;

  const conf = decodeURIComponent(event.ConferenceName);
  const recipient = decodeURIComponent(event.RecipientNumber);

  if (!event.ConferenceName) {
    return callback(
      new Error("`ConferenceName` is required and must not be empty"),
      null
    );
  }
  if (!event.RecipientNumber) {
    return callback(
      new Error("`RecipientNumber` is required and must be a phone number"),
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
      url: `${baseUrl}/conference-twiml?ConferenceName=${encName}&CallerType=Recipient`,
      statusCallback: `${baseUrl}/status?ConferenceName=${encName}&CallerType=Recipient`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    const response = new Twilio.twiml.VoiceResponse();
    response.redirect(
      {
        method: "POST",
      },
      `${baseUrl}/conference-twiml?ConferenceName=${encName}&CallerType=Agent`
    );

    return callback(null, response);
  } catch (error) {
    console.error("Error calling recipient:", error);
    return callback(error, null);
  }
};
