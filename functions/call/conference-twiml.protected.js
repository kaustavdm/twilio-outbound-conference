exports.handler = async function (context, event, callback) {
  if (!event.confName) {
    return callback(new Error("`confName` is required"), null);
  }

  const { DOMAIN_NAME } = context;

  const baseUrl = `https://${DOMAIN_NAME}/call`;

  const conf = decodeURIComponent(event.confName);
  const callerType = event.callerType || "Recipient";

  const encName = encodeURIComponent(conf);

  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.dial().conference(
    {
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
      beep: false,
      statusCallback: `${baseUrl}/status?confName=${encName}&callerType=${callerType}`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["start", "end", "join", "leave"],
    },
    conf
  );

  return callback(null, twiml);
};
