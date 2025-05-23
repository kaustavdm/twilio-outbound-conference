exports.handler = async function (context, event, callback) {
  if (!event.ConferenceName) {
    return callback(new Error("`ConferenceName` is required"), null);
  }

  const { DOMAIN_NAME } = context;

  const baseUrl = `https://${DOMAIN_NAME}/phone-to-phone`;

  const conf = decodeURIComponent(event.ConferenceName);
  const callerType = event.CallerType || "Recipient";
  const isRecipient = callerType === "Recipient";

  const encName = encodeURIComponent(conf);

  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.dial().conference(
    {
      startConferenceOnEnter: !isRecipient,
      endConferenceOnExit: !isRecipient,
      beep: false,
      statusCallback: `${baseUrl}/status?ConferenceName=${encName}&CallerType=${callerType}`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["start", "end", "join", "leave"],
    },
    conf
  );

  return callback(null, twiml);
};
