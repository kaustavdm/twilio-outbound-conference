exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // Get email and phone from the request
  const email = event.email;
  const phoneNumber = event.phone;

  // Run validations
  if (!email) {
    return callback(new Error("Email is required"), null);
  }

  if (!phoneNumber) {
    return callback(new Error("Phone number is required"), null);
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

  // Check required environment variables
  if (!context.VERIFY_SERVICE_SID) {
    return callback(
      new Error("`VERIFY_SERVICE_SID` must be set in environment variable"),
      null
    );
  }

  if (!context.SYNC_SERVICE_SID) {
    return callback(
      new Error("`SYNC_SERVICE_SID` must be set in environment variable"),
      null
    );
  }

  try {
    // Check if phone number is already verified with another email
    let existingPhoneDoc;
    try {
      existingPhoneDoc = await client.sync.v1
        .services(context.SYNC_SERVICE_SID)
        .documents(`verified_phone_${phoneNumber}`)
        .fetch();
      
      // If phone exists and is associated with a different email, reject
      if (existingPhoneDoc.data.email && existingPhoneDoc.data.email !== email) {
        return callback(
          new Error("Phone number is already associated with another email address"),
          null
        );
      }
    } catch (err) {
      if (err.code !== 20404) {
        // 20404 means not found, which is what we want for new registrations
        return callback(err, null);
      }
    }

    // Send OTP via email using Twilio Verify
    const emailVerification = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verifications.create({
        to: email,
        channel: "email",
      });

    // Send OTP via SMS using Twilio Verify
    const phoneVerification = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    return callback(null, {
      status: "success",
      message: "OTP sent successfully to both email and phone",
      data: {
        email: {
          to: emailVerification.to,
          channel: emailVerification.channel,
          status: emailVerification.status,
          valid: emailVerification.valid,
          sid: emailVerification.sid,
        },
        phone: {
          to: phoneVerification.to,
          channel: phoneVerification.channel,
          status: phoneVerification.status,
          valid: phoneVerification.valid,
          sid: phoneVerification.sid,
        },
      },
    });
  } catch (error) {
    console.error("Error sending OTPs:", error);
    
    // Handle specific error cases
    if (error.code === 20404) {
      return callback(new Error("Verification service not found"), null);
    }
    
    return callback(error, null);
  }
};
