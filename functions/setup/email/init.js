exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // Get email from the request
  const email = event.email;

  // Run validations
  if (!email) {
    return callback(new Error("Email is required"), null);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return callback(new Error("Invalid email format"), null);
  }

  // Check if email is from @twilio.com domain
  if (!email.endsWith("@twilio.com")) {
    return callback(
      new Error("Email must be from @twilio.com domain"),
      null
    );
  }

  // Check if Verify service SID is configured
  if (!context.VERIFY_SERVICE_SID) {
    return callback(
      new Error("`VERIFY_SERVICE_SID` must be set in environment variable"),
      null
    );
  }

  try {
    // Send OTP via email using Twilio Verify
    const verification = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verifications.create({
        to: email,
        channel: "email",
      });

    return callback(null, {
      status: "success",
      message: "OTP sent successfully to email",
      data: {
        to: verification.to,
        channel: verification.channel,
        status: verification.status,
        valid: verification.valid,
        sid: verification.sid,
      },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return callback(error, null);
  }
};
