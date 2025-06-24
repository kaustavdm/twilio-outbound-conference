const jwt = require("jsonwebtoken");

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // Get email and OTP code from the request
  const email = event.email;
  const code = event.code;

  // Run validations
  if (!email) {
    return callback(new Error("Email is required"), null);
  }

  if (!code) {
    return callback(new Error("OTP code is required"), null);
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

  if (!context.JWT_SECRET) {
    return callback(
      new Error("`JWT_SECRET` must be set in environment variable"),
      null
    );
  }

  try {
    // Verify the OTP code
    const verificationCheck = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: email,
        code: code,
      });

    if (verificationCheck.status !== "approved") {
      return callback(new Error("Invalid or expired OTP code"), null);
    }

    // Generate a secure JWT token for the verified email
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    const payload = {
      email: email,
      verifiedAt: timestamp,
      exp: Math.floor(expiresAt.getTime() / 1000), // JWT expects seconds, not milliseconds
      iat: Math.floor(Date.now() / 1000),
      iss: "outbound-conference-setup",
      aud: "setup/phone",
    };

    const token = jwt.sign(payload, context.JWT_SECRET, {
      algorithm: "HS256"
    });

    // Save verified email and token to Twilio Sync
    await client.sync.v1
      .services(context.SYNC_SERVICE_SID)
      .documents.create({
        uniqueName: `verified_email_${Buffer.from(email).toString("base64")}`,
        data: {
          email: email,
          verifiedAt: timestamp,
        },
      });

    return callback(null, {
      status: "success",
      message: "Email verified successfully. Pass `data.token` to the next step to set up phone number.",
      data: {
        email: email,
        token: token,
        verifiedAt: timestamp,
        verification: {
          status: verificationCheck.status,
          valid: verificationCheck.valid,
          sid: verificationCheck.sid,
        },
      },
    });
  } catch (error) {
    console.error("Error validating OTP or saving to Sync:", error);
    
    // Handle specific Sync errors
    if (error.code === 20404) {
      return callback(new Error("Verification service not found"), null);
    } else if (error.code === 54002) {
      return callback(new Error("Invalid or expired OTP code"), null);
    } else if (error.message.includes("Document already exists")) {
      // If document already exists, try to update it instead
      try {
        const updatedDocument = await client.sync.v1
          .services(context.SYNC_SERVICE_SID)
          .documents(`verified_email_${Buffer.from(email).toString("base64")}`)
          .update({
            data: {
              email: email,
              verifiedAt: timestamp
            },
          });

        return callback(null, {
          status: "success",
          message: "Email verified successfully (updated existing record)",
          data: {
            email: email,
            token: token,
            verifiedAt: timestamp,
            verification: {
              status: verificationCheck.status,
              valid: verificationCheck.valid,
              sid: verificationCheck.sid,
            },
          },
        });
      } catch (updateError) {
        console.error("Error updating existing document:", updateError);
        return callback(updateError, null);
      }
    }
    
    return callback(error, null);
  }
};
