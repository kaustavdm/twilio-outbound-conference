exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // Pass AgentNumber, RecipientNumber, ConferenceName to the function
  // AgentNumber: The number of agent / rep initiating the call. We will call this number first
  const agentNumber = decodeURIComponent(event.AgentNumber);
  // RecipientNumber: The number of the customer / lead / recipient. This is the number we will dial after the agent picks up and confirms.
  const recipientNumber = decodeURIComponent(event.RecipientNumber);
  // ConferenceName: The name of the conference. This is used to identify the conference for the call.
  // If not provided, we will create a unique conference name using the current timestamp.
  const conferenceName =
    decodeURIComponent(event.ConferenceName) ||
    `conf_phone_to_phone_${Date.now()}`;

  // Get Caller ID and DOMAIN_NAME from the context. Set from environment variables
  // DOMAIN_NAME is set by Twilio when the function is deployed
  // CALLER_ID needs to be set as an environment variable
  const { CALLER_ID, DOMAIN_NAME } = context;
  const baseUrl = `https://${DOMAIN_NAME}/phone-to-phone`;

  // Run validations
  if (!context.CALLER_ID) {
    return callback(
      new Error("`CALLER_ID` must be set in environment variable"),
      null
    );
  }

  if (!event.RecipientNumber) {
    return callback(new Error("`RecipientNumber` is required"), null);
  }

  if (!event.AgentNumber) {
    return callback(new Error("`AgentNumber` is required"), null);
  }

  // Check for conference name or set a default one
  const encName = encodeURIComponent(conferenceName);
  const encRecipient = encodeURIComponent(recipientNumber);

  const startTwiml = new Twilio.twiml.VoiceResponse();
  startTwiml.say("Hello.");
  startTwiml
    .gather({
      action: `${baseUrl}/dial-recipient?ConferenceName=${encName}&RecipientNumber=${encRecipient}`,
      actionOnEmptyResult: true,
      method: "POST",
      finishOnKey: "",
      timeout: 10,
      numDigits: 1,
      input: "dtmf",
    })
    .say(
      "Please press any key to dial the customer. Or, wait till we connect you."
    );

  try {
    // Step 1: Call agent first
    const initcall = await client.calls.create({
      to: agentNumber,
      from: CALLER_ID,
      method: "POST",
      twiml: startTwiml,
      statusCallback: `${baseUrl}/status?ConferenceName=${encName}&CallerType=Agent`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    return callback(null, {
      status: "success",
      message: "Call initiated to agent",
      data: initcall,
    });
  } catch (error) {
    console.error("Error calling agent:", error);
    return callback(error, null);
  }
};
