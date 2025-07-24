const jwt = require("jsonwebtoken");

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // Get parameters from the request
  const email = event.email;
  const emailCode = event.email_code;
  const phone = event.phone;
  const phoneCode = event.phone_code;

  // Run validations
  if (!email) {
    return callback(new Error("Email is required"), null);
  }

  if (!emailCode) {
    return callback(new Error("Email OTP code is required"), null);
  }

  if (!phone) {
    return callback(new Error("Phone number is required"), null);
  }

  if (!phoneCode) {
    return callback(new Error("Phone OTP code is required"), null);
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
    // Verify the email OTP code
    const emailVerificationCheck = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: email,
        code: emailCode,
      });

    if (emailVerificationCheck.status !== "approved") {
      return callback(new Error("Invalid or expired email OTP code"), null);
    }

    // Verify the phone OTP code
    const phoneVerificationCheck = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code: phoneCode,
      });

    if (phoneVerificationCheck.status !== "approved") {
      return callback(new Error("Invalid or expired phone OTP code"), null);
    }

    // Both verifications successful, save to Sync service
    const timestamp = new Date().toISOString();
    
    // Create documents that can be looked up by both email and phone
    const userData = {
      email: email,
      phone: phone,
      verifiedAt: timestamp,
    };

    // Store document with email as key
    try {
      await client.sync.v1
        .services(context.SYNC_SERVICE_SID)
        .documents.create({
          uniqueName: `verified_email_${email}`,
          data: userData,
        });
    } catch (error) {
      if (error.message && error.message.includes("Unique name already exists")) {
        // Update existing email document
        try {
          await client.sync.v1
            .services(context.SYNC_SERVICE_SID)
            .documents(`verified_email_${email}`)
            .update({
              data: userData,
            });
        } catch (updateError) {
          return callback(updateError, null);
        }
      } else {
        return callback(error, null);
      }
    }

    // Store document with phone as key
    try {
      await client.sync.v1
        .services(context.SYNC_SERVICE_SID)
        .documents.create({
          uniqueName: `verified_phone_${phone}`,
          data: userData,
        });
    } catch (error) {
      if (error.message && error.message.includes("Unique name already exists")) {
        // Update existing phone document
        try {
          await client.sync.v1
            .services(context.SYNC_SERVICE_SID)
            .documents(`verified_phone_${phone}`)
            .update({
              data: userData,
            });
        } catch (updateError) {
          return callback(updateError, null);
        }
      } else {
        return callback(error, null);
      }
    }

    // Generate JWT token with very long validity (10 years)
    const jwtPayload = {
      email: email,
      phone: phone,
      verifiedAt: timestamp,
    };
    
    const jwtToken = jwt.sign(jwtPayload, context.JWT_SECRET, {
      expiresIn: "10y", // 10 years validity
    });

    return callback(null, {
      status: "success",
      message: "Email and phone verified successfully.",
      data: {
        email: email,
        phone: phone,
        verifiedAt: timestamp,
        token: jwtToken,
        verification: {
          email: {
            status: emailVerificationCheck.status,
            valid: emailVerificationCheck.valid,
            sid: emailVerificationCheck.sid,
          },
          phone: {
            status: phoneVerificationCheck.status,
            valid: phoneVerificationCheck.valid,
            sid: phoneVerificationCheck.sid,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error validating OTPs or saving to Sync:", error);
    
    // Handle specific Sync errors
    if (error.code === 20404) {
      return callback(new Error("Verification service not found"), null);
    } else if (error.code === 54002) {
      return callback(new Error("Invalid or expired OTP code"), null);
    }
    
    return callback(error, null);
  }
};
