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

    // Save verified email to Twilio Sync (no JWT, use plain email as key)
    const timestamp = new Date().toISOString();
    await client.sync.v1
      .services(context.SYNC_SERVICE_SID)
      .documents.create({
        uniqueName: `verified_email_${email}`,
        data: {
          email: email,
          verifiedAt: timestamp,
        },
      });

    return callback(null, {
      status: "success",
      message: "Email verified successfully.",
      data: {
        email: email,
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
          .documents(`verified_email_${email}`)
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
